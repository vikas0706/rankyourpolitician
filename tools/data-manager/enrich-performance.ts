/**
 * Data-manager step: PARLIAMENTARY PERFORMANCE metrics for MPs from the
 * OFFICIAL Digital Sansad APIs (sansad.in) - the primary source, so every
 * number is a government record, not an aggregator's.
 *
 *   Lok Sabha (18th):
 *     - attendance_pct        signed days / RECORDED days (S vs NS); "NR" days -
 *                             no record kept - are excluded entirely. Members
 *                             who are majority-NR (ministers, the Speaker, the
 *                             LoP) are marked EXEMPT, never 0.
 *     - questions_asked       total questions; ministers are exempt (they answer
 *                             questions), so their 0 is an exemption, not a count.
 *     - debates_participated  api_ls/debate/participation
 *   Rajya Sabha (recent completed sessions):
 *     - attendance_pct        numeric noofsittings summed / sitting days of the
 *                             member's recorded sessions; the "M" marker means
 *                             minister-exempt (no register record).
 *     - questions_asked       member-wise count from the official RS question
 *                             store (rsdoc.nic.in, the same backend sansad.in's
 *                             Q&A search queries).
 *     - debates_participated  no public member-wise source -> stays missing.
 *
 * "Missing beats wrong": when a figure cannot be derived it is left ABSENT
 * (UI shows "not available"); when the house keeps no record by design it is
 * marked exempt via metrics_exempt + a cited fact. Nothing is ever stored as a
 * fake 0.
 *
 * Usage:  npm run dm -- enrich-performance
 *         PERF_LIMIT=20 npm run dm -- enrich-performance   (first 20 LS MPs)
 *         PERF_SKIP_RS=1 …                                 (Lok Sabha only)
 *         PERF_REFRESH=1 …                                 (re-derive everyone)
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import type { Politician, Fact, MetricExemptReason } from '../../lib/types';
import {
  PERF_FIELDS, LS_PRESIDING_IDS, MIN_RECORDED_DAYS,
  fetchLsMembers, fetchLsSessions, fetchLsAttendanceCounts, classifyLsAttendance,
  fetchLsQuestionCount, fetchLsDebateCount, matchLsMembers,
  fetchRsSitting, fetchRsSessions, fetchRsAttendance, classifyRsAttendance,
  rsNoRecordExemption, fetchRsQuestionCount, fetchRsDeputyChairMpsno, matchRsMembers,
  clearPerf, setMetric, setExempt, sleep, saveSeedWithRetry,
} from './perf-shared';

const ROOT = resolve(dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..', '..');
const SEED = resolve(ROOT, 'data', 'seed', 'politicians.json');
// LOCAL calendar date (IST), not UTC: retrieved_date doubles as the resume
// marker, and the UTC date lags IST until 05:30 - a morning run would treat
// yesterday evening's facts as "today's" and skip live members.
const TODAY = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const LIMIT = process.env.PERF_LIMIT ? parseInt(process.env.PERF_LIMIT, 10) : Infinity;
const SKIP_RS = process.env.PERF_SKIP_RS === '1';
const SKIP_LS = process.env.PERF_SKIP_LS === '1';
// PERF_REFRESH re-derives even MPs that already have metrics and OVERWRITES
// them (attendance/questions grow each session) - used by `update-all`.
const REFRESH = process.env.PERF_REFRESH === '1';

const hasOutcome = (p: Politician, f: (typeof PERF_FIELDS)[number]) =>
  p.metrics[f] !== undefined || p.metrics_exempt?.[f] !== undefined;

// A REFRESH run over the whole house takes ~an hour of polite API pacing, so it
// must survive being interrupted: a member already re-derived by a run of the
// CURRENT semantics in the last day is skipped. Both conditions matter - the
// date alone once skipped stale members (a UTC/IST date straddle made
// yesterday's old-semantics facts look like today's), and the format alone
// would never refresh anything. New-semantics output is identified by the
// attendance exemption marker or the "recorded sitting days" fact wording.
// (PERF_REDO_TODAY=1 forces reprocessing regardless.)
const REDO_TODAY = process.env.PERF_REDO_TODAY === '1';
const localDateDaysAgo = (days: number) =>
  new Date(Date.now() - new Date().getTimezoneOffset() * 60000 - days * 86400000).toISOString().slice(0, 10);
const RECENT_DATES = new Set([localDateDaysAgo(0), localDateDaysAgo(1)]);
const freshToday = (p: Politician) => {
  const currentSemantics =
    p.metrics_exempt?.attendance_pct !== undefined ||
    p.facts.some((f) => f.field_type === 'attendance_pct' && /recorded sitting days/.test(String(f.value)));
  const recent = p.facts.some(
    (f) => PERF_FIELDS.includes(f.field_type as (typeof PERF_FIELDS)[number]) && RECENT_DATES.has(f.retrieved_date),
  );
  return currentSemantics && recent;
};

async function main() {
  const pols: Politician[] = JSON.parse(readFileSync(SEED, 'utf8'));
  let touched = 0;

  // ============================ LOK SABHA ============================
  if (!SKIP_LS) {
    console.log('LS: fetching sitting-member list…');
    const members = await fetchLsMembers();
    console.log(`LS: ${members.length} sitting members from sansad.in`);
    if (!members.length) throw new Error('LS member list empty - API shape changed?');
    const lsSessions = await fetchLsSessions();
    if (!lsSessions.length) throw new Error('LS session list empty - API shape changed?');
    console.log(`LS-18 sessions: ${lsSessions.join(', ')}`);

    const ourLs = pols.filter((p) => p.house === 'Lok Sabha');
    const { pairs, unmatched } = matchLsMembers(ourLs, members);
    console.log(`LS matched ${pairs.length}/${members.length}; unmatched ${unmatched.length}`);
    if (unmatched.length) console.log('  ' + unmatched.slice(0, 15).join('\n  '));

    const pending = REFRESH
      ? pairs.filter(({ p }) => REDO_TODAY || !freshToday(p))
      : pairs.filter(({ p }) => !PERF_FIELDS.every((f) => hasOutcome(p, f)));
    const work = LIMIT === Infinity ? pending : pending.slice(0, LIMIT);
    console.log(`LS pending: ${pending.length}; processing ${work.length}`);

    const cite = (path: string, value: string, asOf = '18th Lok Sabha, all sessions to date'): Omit<Fact, 'field_type'> => ({
      value,
      source_url: `https://sansad.in${path}`,
      source_name: 'Digital Sansad - Lok Sabha (official)',
      retrieved_date: TODAY,
      as_of: asOf,
    });

    let done = 0;
    for (const { p, m } of work) {
      clearPerf(p);
      const presiding = LS_PRESIDING_IDS.has(p.id);

      // 1. attendance - NR-aware
      const counts = await fetchLsAttendanceCounts(m.mpsno, lsSessions);
      const att = classifyLsAttendance(counts);
      if (att.kind === 'value') {
        setMetric(p, 'attendance_pct', att.pct, cite('/ls/members', `${att.pct}% (${att.signed} of ${att.recorded} recorded sitting days signed)`));
      } else if (att.kind === 'no-record') {
        const reason: MetricExemptReason = presiding ? 'presiding-officer' : p.is_minister ? 'minister' : 'no-register-record';
        setExempt(p, 'attendance_pct', reason, cite('/ls/members',
          reason === 'minister'
            ? 'No register record - Council of Ministers members are exempt from signing (days marked "NR" in the official record)'
            : reason === 'presiding-officer'
              ? 'No register record - presides over the House (days marked "NR" in the official record)'
              : 'No register record kept by the House for this member (days marked "NR" in the official record)'));
      } // insufficient -> leave absent (missing, never 0)

      // 2. questions - ministers and presiding officers do not table questions
      const q = await fetchLsQuestionCount(m.mpsno);
      if ((p.is_minister || presiding) && (q === 0 || q === null)) {
        setExempt(p, 'questions_asked', presiding ? 'presiding-officer' : 'minister', cite('/ls/questions/questions-and-answers',
          presiding
            ? 'Exempt - presides over the House and does not table questions'
            : 'Exempt - ministers answer questions in the House; only private members table them'));
      } else if (typeof q === 'number') {
        setMetric(p, 'questions_asked', q, cite('/ls/questions/questions-and-answers', String(q)));
      }

      // 3. debates - real participation for ministers, but the presiding chair's
      //    count is an artifact of chairing every sitting -> exempt.
      const d = await fetchLsDebateCount(m.mpsno);
      if (presiding) {
        setExempt(p, 'debates_participated', 'presiding-officer', cite('/ls/debates',
          'Exempt - presides over debates rather than participating as a member'));
      } else if (typeof d === 'number') {
        setMetric(p, 'debates_participated', d, cite('/ls/debates', String(d)));
      }

      touched++;
      if (++done % 25 === 0) {
        console.log(`  LS ${done}/${work.length} (last: ${p.name} att=${att.kind === 'value' ? att.pct + '%' : att.kind} q=${q} d=${d})`);
        await saveSeedWithRetry(SEED, pols, false); // checkpoint - skippable
      }
      await sleep(150);
    }
  }

  // ============================ RAJYA SABHA ============================
  if (!SKIP_RS) {
    console.log('\nRS: fetching sitting members + session window…');
    const sitting = await fetchRsSitting();
    const rsSessions = await fetchRsSessions();
    console.log(`RS: ${sitting.length} members; sessions: ${rsSessions.map((s) => `${s.no}(${s.sittings}d)`).join(', ')}`);
    if (sitting.length && rsSessions.length) {
      const attAgg = await fetchRsAttendance(rsSessions);
      console.log(`RS: attendance rows for ${attAgg.size} member codes`);
      const deputyChair = await fetchRsDeputyChairMpsno();
      const sesFrom = rsSessions[0].no, sesTo = rsSessions[rsSessions.length - 1].no;
      const asOf = `Rajya Sabha sessions ${sesFrom}-${sesTo}`;

      const ourRs = pols.filter((p) => p.house === 'Rajya Sabha');
      const { pairs, unmatched } = matchRsMembers(ourRs, sitting);
      console.log(`RS matched ${pairs.length}/${sitting.length}; unmatched ${unmatched.length}`);
      if (unmatched.length) console.log('  ' + unmatched.slice(0, 15).join('\n  '));

      const pending = REFRESH
        ? pairs.filter(({ p }) => REDO_TODAY || !freshToday(p))
        : pairs.filter(({ p }) => !hasOutcome(p, 'attendance_pct') || !hasOutcome(p, 'questions_asked'));
      const work = LIMIT === Infinity ? pending : pending.slice(0, LIMIT);
      console.log(`RS pending: ${pending.length}; processing ${work.length}`);

      const attCite = (value: string): Omit<Fact, 'field_type'> => ({
        value,
        source_url: 'https://sansad.in/rs/members/attendance',
        source_name: 'Digital Sansad - Rajya Sabha (official)',
        retrieved_date: TODAY,
        as_of: asOf,
      });
      const qCite = (value: string): Omit<Fact, 'field_type'> => ({
        value,
        source_url: 'https://sansad.in/rs/questions/questions-and-answers',
        source_name: 'Digital Sansad - Rajya Sabha (official)',
        retrieved_date: TODAY,
        as_of: asOf,
      });

      let done = 0;
      for (const { p, m } of work) {
        clearPerf(p);
        const agg = attAgg.get(m.mpsno);
        const presiding = (deputyChair !== null && m.mpsno === deputyChair) || (agg?.markers ?? []).includes('HDC');
        const minister = m.currentMinister || p.is_minister;
        // A member with no row in any window session took their seat after the
        // window closed - a "0 questions" over sessions they were never part of
        // would be a fake zero, so every metric stays missing until their first
        // completed session.
        const inWindow = !!agg && agg.sessions > 0;

        const att = classifyRsAttendance(agg);
        if (att.kind === 'value') {
          setMetric(p, 'attendance_pct', att.pct, attCite(`${att.pct}% (${att.signed} of ${att.recorded} recorded sitting days)`));
        } else if (att.kind === 'no-record') {
          const ex = rsNoRecordExemption(agg);
          setExempt(p, 'attendance_pct', ex.reason, attCite(ex.factValue));
        }

        const q = inWindow ? await fetchRsQuestionCount(m.mpsno, sesFrom, sesTo) : null;
        if (inWindow && (minister || presiding) && (q === 0 || q === null)) {
          setExempt(p, 'questions_asked', presiding ? 'presiding-officer' : 'minister', qCite(
            presiding
              ? 'Exempt - presides over the House and does not table questions'
              : 'Exempt - ministers answer questions in the House; only private members table them'));
        } else if (typeof q === 'number') {
          setMetric(p, 'questions_asked', q, qCite(String(q)));
        }
        // debates_participated: no public member-wise RS source -> left absent.

        touched++;
        if (++done % 25 === 0) {
          console.log(`  RS ${done}/${work.length} (last: ${p.name} att=${att.kind === 'value' ? att.pct + '%' : att.kind} q=${q})`);
          await saveSeedWithRetry(SEED, pols, false); // checkpoint - skippable
        }
        await sleep(250);
      }
    } else {
      console.log('RS: skipped (member list or session list unavailable)');
    }
  }

  await saveSeedWithRetry(SEED, pols);
  console.log(`\n✓ enrich-performance: ${touched} MPs re-derived (min recorded days: ${MIN_RECORDED_DAYS}).`);
  console.log('Next: npm run dm -- verify-attendance, npm run dm -- validate, build.');
}

main().catch((e) => { console.error(e); process.exit(1); });
