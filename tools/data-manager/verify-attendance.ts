/**
 * Data-manager step: INDEPENDENT VERIFICATION of every stored attendance figure
 * (and the questions/debates counts and EXEMPTION markers alongside it) against
 * the OFFICIAL Digital Sansad APIs.
 *
 * `enrich-performance` WRITES metrics. This step re-derives them from scratch
 * with the same semantics (see perf-shared.ts) and COMPARES, so a silent
 * regression (API shape change, bad join, stale carry-over, a value imported
 * from a different source) surfaces as a diff instead of sitting in the seed
 * looking authoritative. Attendance drives the public ranking, so the cost of a
 * wrong number is a defamatory-by-implication claim about a real person.
 *
 * What it checks, per MP:
 *   1. SOURCE PURITY  - the cited source must be Digital Sansad. A value from
 *      another aggregator is measured over a different window with a different
 *      denominator, so ranking it against Sansad-derived peers compares apples
 *      to oranges. Reported as `source-mix`, --fix re-derives or drops.
 *   2. ARITHMETIC     - the "N of D … sitting days" in the cited fact must equal
 *      the stored percentage.
 *   3. NEVER A FAKE ZERO - a stored value may not coexist with an exemption
 *      marker, and a member whose live register is majority-"NR"/"M" (minister,
 *      presiding officer, LoP - no record kept) must be marked exempt, not 0.
 *   4. LIVE VALUE     - re-fetch and compare. Question/debate counts only grow,
 *      so stored ABOVE live is an error; attendance can drift either way as
 *      sessions are added (warn).
 *
 * Usage:  npm run dm -- verify-attendance            (report only; exit 1 on errors)
 *         npm run dm -- verify-attendance --fix      (rewrite seed from live Sansad)
 *         ATT_LIMIT=20 npm run dm -- verify-attendance
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import type { Politician, Fact, MetricExemptReason, PerfMetric } from '../../lib/types';
import {
  PERF_FIELDS, LS_PRESIDING_IDS,
  fetchLsMembers, fetchLsSessions, fetchLsAttendanceCounts, classifyLsAttendance,
  fetchLsQuestionCount, fetchLsDebateCount, matchLsMembers,
  fetchRsSitting, fetchRsSessions, fetchRsAttendance, classifyRsAttendance,
  rsNoRecordExemption, fetchRsQuestionCount, fetchRsDeputyChairMpsno, matchRsMembers,
  clearPerf, setMetric, setExempt, sleep, saveSeedWithRetry,
} from './perf-shared';

const ROOT = resolve(dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..', '..');
const SEED = resolve(ROOT, 'data', 'seed', 'politicians.json');
// Local calendar date (IST) - see the matching note in enrich-performance.ts.
const TODAY = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const FIX = process.argv.includes('--fix');
const LIMIT = process.env.ATT_LIMIT ? parseInt(process.env.ATT_LIMIT, 10) : Infinity;
// Tolerance for a live-vs-stored percentage-point gap before we call it drift.
const DRIFT_PP = 0.15;

type Sev = 'error' | 'warn' | 'info';
interface Issue { sev: Sev; kind: string; id: string; name: string; detail: string }
const issues: Issue[] = [];
const add = (sev: Sev, kind: string, p: Politician, detail: string) =>
  issues.push({ sev, kind, id: p.id, name: p.name, detail });

const isSansad = (f?: Fact) => !!f && /Digital Sansad/i.test(f.source_name || '');
const factOf = (p: Politician, field: string) => p.facts.find((f) => f.field_type === field);

async function main() {
  const pols: Politician[] = JSON.parse(readFileSync(SEED, 'utf8'));
  const stored = pols.filter((p) => p.metrics?.attendance_pct !== undefined || p.metrics_exempt?.attendance_pct !== undefined);
  console.log(`Verifying ${stored.length} stored attendance figures/exemptions against sansad.in…\n`);

  // ---------- 1. Offline: source purity, arithmetic, exemption coherence ----------
  for (const p of pols) {
    for (const field of PERF_FIELDS) {
      const v = p.metrics?.[field];
      const ex = p.metrics_exempt?.[field];
      if (v !== undefined && ex !== undefined)
        add('error', 'value-and-exempt', p, `${field} carries both a value (${v}) and an exemption marker (${ex})`);
      if ((v !== undefined || ex !== undefined) && !factOf(p, field))
        add('error', 'uncited', p, `${field} ${ex !== undefined ? `exemption "${ex}"` : `= ${v}`} with NO cited fact`);
    }
    const f = factOf(p, 'attendance_pct');
    if (p.metrics?.attendance_pct !== undefined && f) {
      if (!isSansad(f))
        add('error', 'source-mix', p, `attendance cited to "${f.source_name}" - not Digital Sansad (as_of "${f.as_of ?? '?'}")`);
      const m = String(f.value).match(/([\d,]+)\s+of\s+([\d,]+)\s+(?:recorded\s+)?sitting days/);
      if (m) {
        const num = +m[1].replace(/,/g, ''), den = +m[2].replace(/,/g, '');
        if (num > den) add('error', 'impossible', p, `${num} present of ${den} sitting days`);
        const calc = Math.round((num / den) * 1000) / 10;
        if (Math.abs(calc - (p.metrics.attendance_pct as number)) > 0.11)
          add('error', 'arithmetic', p, `fact says ${num}/${den} = ${calc}% but metrics say ${p.metrics.attendance_pct}%`);
      } else if (isSansad(f)) {
        add('warn', 'unparsed', p, `Sansad fact value not in "N of D sitting days" form: ${JSON.stringify(String(f.value).slice(0, 60))}`);
      }
      const pct = p.metrics.attendance_pct as number;
      if (!(pct >= 0 && pct <= 100)) add('error', 'range', p, `attendance_pct=${pct} out of range`);
    }
  }

  const cite = (url: string, name: string, value: string, asOf: string): Omit<Fact, 'field_type'> => ({
    value, source_url: url, source_name: name, retrieved_date: TODAY, as_of: asOf,
  });

  // ---------- 2. Live re-derivation: LOK SABHA ----------
  console.log('LS: fetching sitting-member list…');
  const members = await fetchLsMembers();
  if (!members.length) {
    console.error('LS member list empty - API shape changed? Aborting rather than reporting false diffs.');
    process.exit(2);
  }
  const lsSessions = await fetchLsSessions();
  if (!lsSessions.length) { console.error('LS session list empty - aborting.'); process.exit(2); }
  console.log(`LS: ${members.length} members; LS-18 sessions: ${lsSessions.join(', ')}`);

  const ourLs = pols.filter((p) => p.house === 'Lok Sabha');
  const { pairs } = matchLsMembers(ourLs, members);
  console.log(`LS: matched ${pairs.length}/${members.length} to our seed`);
  const lsAsOf = '18th Lok Sabha, all sessions to date';
  const lsSrc = 'Digital Sansad - Lok Sabha (official)';

  // Verify every member that claims an outcome; with --fix also fill the rest.
  const claims = (p: Politician) => PERF_FIELDS.some((f) => p.metrics?.[f] !== undefined || p.metrics_exempt?.[f] !== undefined);
  const toCheck = pairs.filter(({ p }) => claims(p) || FIX);
  const work = LIMIT === Infinity ? toCheck : toCheck.slice(0, LIMIT);
  console.log(`LS: re-deriving ${work.length} members from the official API…`);

  const lsRecorded = new Map<string, number>();
  let done = 0;
  for (const { p, m } of work) {
    const counts = await fetchLsAttendanceCounts(m.mpsno, lsSessions);
    const att = classifyLsAttendance(counts);
    const liveQ = await fetchLsQuestionCount(m.mpsno);
    const liveD = await fetchLsDebateCount(m.mpsno);
    const presiding = LS_PRESIDING_IDS.has(p.id);

    const cur = p.metrics?.attendance_pct;
    const curEx = p.metrics_exempt?.attendance_pct;
    if (att.kind === 'value') {
      lsRecorded.set(p.id, att.recorded);
      if (curEx !== undefined)
        add('error', 'exempt-mismatch', p, `marked exempt (${curEx}) but live register records ${att.signed}/${att.recorded} days = ${att.pct}%`);
      else if (cur !== undefined) {
        const gap = Math.round((att.pct - (cur as number)) * 100) / 100;
        if (Math.abs(gap) > DRIFT_PP)
          add('warn', 'drift', p, `stored ${cur}% vs live ${att.pct}% (${att.signed}/${att.recorded}), gap ${gap > 0 ? '+' : ''}${gap}pp`);
      }
    } else if (att.kind === 'no-record') {
      if (cur !== undefined)
        add('error', 'fake-zero', p, `stored attendance ${cur}% but the live register keeps NO record for this member (${counts.noRecord} NR days) - must be exempt, never a number`);
    } else if (cur !== undefined) {
      add('error', 'no-live-basis', p, `stored ${cur}% but live register has only ${counts.signed + counts.notSigned} recorded days`);
    }

    // counts only grow between sessions - stored above live is impossible.
    if (typeof liveQ === 'number' && typeof p.metrics?.questions_asked === 'number' && p.metrics.questions_asked > liveQ)
      add('error', 'stale-high', p, `questions_asked stored ${p.metrics.questions_asked} > live ${liveQ}`);
    if (typeof liveD === 'number' && typeof p.metrics?.debates_participated === 'number' && p.metrics.debates_participated > liveD)
      add('error', 'stale-high', p, `debates_participated stored ${p.metrics.debates_participated} > live ${liveD}`);

    if (FIX) {
      clearPerf(p);
      if (att.kind === 'value') {
        setMetric(p, 'attendance_pct', att.pct, cite('https://sansad.in/ls/members', lsSrc, `${att.pct}% (${att.signed} of ${att.recorded} recorded sitting days signed)`, lsAsOf));
      } else if (att.kind === 'no-record') {
        const reason: MetricExemptReason = presiding ? 'presiding-officer' : p.is_minister ? 'minister' : 'no-register-record';
        setExempt(p, 'attendance_pct', reason, cite('https://sansad.in/ls/members', lsSrc,
          reason === 'minister'
            ? 'No register record - Council of Ministers members are exempt from signing (days marked "NR" in the official record)'
            : reason === 'presiding-officer'
              ? 'No register record - presides over the House (days marked "NR" in the official record)'
              : 'No register record kept by the House for this member (days marked "NR" in the official record)', lsAsOf));
      }
      if ((p.is_minister || presiding) && (liveQ === 0 || liveQ === null)) {
        setExempt(p, 'questions_asked', presiding ? 'presiding-officer' : 'minister', cite('https://sansad.in/ls/questions/questions-and-answers', lsSrc,
          presiding ? 'Exempt - presides over the House and does not table questions'
            : 'Exempt - ministers answer questions in the House; only private members table them', lsAsOf));
      } else if (typeof liveQ === 'number') {
        setMetric(p, 'questions_asked', liveQ, cite('https://sansad.in/ls/questions/questions-and-answers', lsSrc, String(liveQ), lsAsOf));
      }
      if (presiding) {
        setExempt(p, 'debates_participated', 'presiding-officer', cite('https://sansad.in/ls/debates', lsSrc,
          'Exempt - presides over debates rather than participating as a member', lsAsOf));
      } else if (typeof liveD === 'number') {
        setMetric(p, 'debates_participated', liveD, cite('https://sansad.in/ls/debates', lsSrc, String(liveD), lsAsOf));
      }
    }

    if (++done % 25 === 0) console.log(`  LS ${done}/${work.length}…`);
    await sleep(150);
  }

  // Denominator coherence: the modal recorded-day count is the full-tenure
  // figure; below-modal should mean a by-election joiner or an NR block, not a
  // broken fetch.
  if (lsRecorded.size) {
    const freq = new Map<number, number>();
    for (const v of lsRecorded.values()) freq.set(v, (freq.get(v) || 0) + 1);
    const modal = [...freq.entries()].sort((a, b) => b[1] - a[1])[0][0];
    console.log(`\nLS modal recorded sitting days: ${modal} (${freq.get(modal)} members)`);
    for (const [id, den] of lsRecorded) {
      if (den >= modal) continue;
      const p = pols.find((x) => x.id === id)!;
      add('info', 'short-tenure', p, `${den} recorded sitting days vs modal ${modal} - expected for a by-election joiner or partial NR block`);
    }
  }

  // ---------- 3. Live re-derivation: RAJYA SABHA ----------
  console.log('\nRS: fetching sitting members + session window…');
  const sitting = await fetchRsSitting();
  const rsSessions = await fetchRsSessions();
  if (!sitting.length || !rsSessions.length) {
    console.log('RS: member/session list unavailable - skipping RS verification (not reporting false diffs).');
  } else {
    console.log(`RS: ${sitting.length} members; sessions: ${rsSessions.map((s) => `${s.no}(${s.sittings}d)`).join(', ')}`);
    const attAgg = await fetchRsAttendance(rsSessions);
    const deputyChair = await fetchRsDeputyChairMpsno();
    const sesFrom = rsSessions[0].no, sesTo = rsSessions[rsSessions.length - 1].no;
    const rsAsOf = `Rajya Sabha sessions ${sesFrom}-${sesTo}`;
    const rsSrc = 'Digital Sansad - Rajya Sabha (official)';

    const ourRs = pols.filter((p) => p.house === 'Rajya Sabha');
    const { pairs: rsPairs } = matchRsMembers(ourRs, sitting);
    console.log(`RS: matched ${rsPairs.length}/${sitting.length}`);
    const seen = new Set<string>();
    let rsDone = 0;
    for (const { p, m } of rsPairs) {
      seen.add(p.id);
      const agg = attAgg.get(m.mpsno);
      const att = classifyRsAttendance(agg);
      const presiding = (deputyChair !== null && m.mpsno === deputyChair) || (agg?.markers ?? []).includes('HDC');
      const minister = m.currentMinister || p.is_minister;
      const cur = p.metrics?.attendance_pct;
      const curEx = p.metrics_exempt?.attendance_pct;

      if (att.kind === 'value') {
        if (att.pct > 100) { add('error', 'impossible', p, `RS live ${att.signed}/${att.recorded} > 100%`); continue; }
        if (curEx !== undefined)
          add('error', 'exempt-mismatch', p, `marked exempt (${curEx}) but live record shows ${att.signed}/${att.recorded} days = ${att.pct}%`);
        else if (cur !== undefined) {
          const gap = Math.round((att.pct - (cur as number)) * 100) / 100;
          if (Math.abs(gap) > DRIFT_PP)
            add('warn', 'drift', p, `RS stored ${cur}% vs live ${att.pct}% (${att.signed}/${att.recorded}), gap ${gap > 0 ? '+' : ''}${gap}pp`);
        }
      } else if (att.kind === 'no-record' && cur !== undefined) {
        add('error', 'fake-zero', p, `stored attendance ${cur}% but the official record marks this member "${(agg?.markers ?? []).join('/') || 'M'}" (no register record)`);
      }

      if (FIX) {
        // Attendance + questions are re-derived; RS has no public member-wise
        // debate source, so debates_participated stays whatever it is (absent).
        // No row in any window session -> seat taken after the window closed ->
        // every metric stays missing (a "0" over sessions they were never part
        // of would be a fake zero).
        const inWindow = !!agg && agg.sessions > 0;
        const liveQ = inWindow ? await fetchRsQuestionCount(m.mpsno, sesFrom, sesTo) : null;
        clearPerf(p);
        if (att.kind === 'value') {
          setMetric(p, 'attendance_pct', att.pct, cite('https://sansad.in/rs/members/attendance', rsSrc, `${att.pct}% (${att.signed} of ${att.recorded} recorded sitting days)`, rsAsOf));
        } else if (att.kind === 'no-record') {
          const ex = rsNoRecordExemption(agg);
          setExempt(p, 'attendance_pct', ex.reason, cite('https://sansad.in/rs/members/attendance', rsSrc, ex.factValue, rsAsOf));
        }
        if (inWindow && (minister || presiding) && (liveQ === 0 || liveQ === null)) {
          setExempt(p, 'questions_asked', presiding ? 'presiding-officer' : 'minister', cite('https://sansad.in/rs/questions/questions-and-answers', rsSrc,
            presiding ? 'Exempt - presides over the House and does not table questions'
              : 'Exempt - ministers answer questions in the House; only private members table them', rsAsOf));
        } else if (typeof liveQ === 'number') {
          setMetric(p, 'questions_asked', liveQ, cite('https://sansad.in/rs/questions/questions-and-answers', rsSrc, String(liveQ), rsAsOf));
        }
        await sleep(250);
      }
      if (++rsDone % 25 === 0) console.log(`  RS ${rsDone}/${rsPairs.length}…`);
    }
    // An RS member holding a number the live API no longer backs is unverifiable.
    for (const p of ourRs) {
      if (p.metrics?.attendance_pct !== undefined && !seen.has(p.id))
        add('warn', 'unmatched-live', p, `RS stored ${p.metrics.attendance_pct}% but member not matched in the live API this run`);
    }
  }

  // ---------- 4. Report ----------
  if (FIX) {
    // Anything still cited to a non-Sansad source after the refetch cannot be
    // ranked against Sansad-derived peers - drop rather than mix cohorts.
    for (const p of pols) {
      const f = factOf(p, 'attendance_pct');
      if (f && p.metrics?.attendance_pct !== undefined && !isSansad(f)) { clearPerf(p); console.log(`  dropped non-Sansad perf: ${p.id}`); }
    }
    await saveSeedWithRetry(SEED, pols);
    console.log('\n✓ seed rewritten from live Digital Sansad values.');
  }

  const bySev = (s: Sev) => issues.filter((i) => i.sev === s);
  const groups = new Map<string, Issue[]>();
  for (const i of issues) { if (!groups.has(i.kind)) groups.set(i.kind, []); groups.get(i.kind)!.push(i); }
  console.log(`\n${'='.repeat(66)}\nVERIFY-ATTENDANCE - ${stored.length} figures checked`);
  for (const [kind, list] of [...groups.entries()].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`\n[${list[0].sev.toUpperCase()}] ${kind} - ${list.length}`);
    for (const i of list.slice(0, 12)) console.log(`   ${i.id} (${i.name}): ${i.detail}`);
    if (list.length > 12) console.log(`   …and ${list.length - 12} more`);
  }
  const errs = bySev('error').length;
  console.log(`\n${'='.repeat(66)}`);
  console.log(`errors ${errs} · warnings ${bySev('warn').length} · info ${bySev('info').length}`);
  if (errs && !FIX) { console.log('\nRe-run with --fix to rewrite from live Sansad values.'); process.exit(1); }
}

main().catch((e) => { console.error(e); process.exit(1); });
