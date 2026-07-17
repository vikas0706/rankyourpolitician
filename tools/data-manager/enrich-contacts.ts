/**
 * Data-manager step: attach each sitting MP's published contact details from
 * the OFFICIAL Digital Sansad member directories - the same source the
 * performance pipeline already trusts - so a citizen can actually reach the
 * member they just read about.
 *
 *   Lok Sabha    api_ls/member (full directory row: email[], delhiPhone,
 *                personalPhone), matched seat-first via matchLsMembers.
 *   Rajya Sabha  api_rs/member/sitting-members (emailID obfuscated as
 *                "name[at]sansad[dot]nic[dot]in", localTele free-text),
 *                matched via matchRsMembers.
 *
 * Everything is copied verbatim from the directory entry and cited to the
 * member's own biography page (sansad.in/{ls,rs}/members/biography/{mpsno}).
 * "Missing beats wrong" applies throughout:
 *   - emails must parse as addresses after de-obfuscation, else dropped;
 *   - phones are OFFICE LANDLINES ONLY (see contact-shared.ts policy):
 *     personal-mobile fields are never read and mobile-shaped tokens in office
 *     fields are dropped; Delhi-field landlines get their published 011 STD
 *     code restored so tel: links dial;
 *   - a member with no clean channel keeps NO contact block at all.
 *
 * Re-running refreshes every matched member's block (the directory is the
 * single source of truth for MP contacts); members of other houses are never
 * touched, so state-assembly contact importers can own those safely.
 *
 * Usage:  npm run dm -- enrich-contacts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import type { Politician, PoliticianContact } from '../../lib/types';
import { getJson, matchLsMembers, matchRsMembers, type LsMember, type RsSitting } from './perf-shared';
import { cleanEmails, cleanPhones } from './contact-shared';

const ROOT = resolve(dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..', '..');
const SEED_DIR = resolve(ROOT, 'data', 'seed');
const TODAY = new Date().toISOString().slice(0, 10);

function contactOf(emails: string[], phones: string[], bioUrl: string, sourceName: string): PoliticianContact | null {
  if (!emails.length && !phones.length) return null;
  return {
    ...(emails.length ? { emails } : {}),
    ...(phones.length ? { phones } : {}),
    source_url: bioUrl,
    source_name: sourceName,
    retrieved_date: TODAY,
  };
}

async function main() {
  const pols: Politician[] = JSON.parse(readFileSync(resolve(SEED_DIR, 'politicians.json'), 'utf8'));
  let lsSet = 0, rsSet = 0, empty = 0;

  // ---- Lok Sabha ----------------------------------------------------------
  const lsRaw = await getJson('https://sansad.in/api_ls/member?loksabha=18&page=1&size=600&sitting=1&locale=en');
  const lsRows: any[] = lsRaw?.membersDtoList || [];
  if (!lsRows.length) throw new Error('LS member directory returned no rows - aborting, nothing written');
  const lsByMpsno = new Map<number, any>(lsRows.map((m) => [m.mpsno, m]));
  const lsMembers: LsMember[] = lsRows
    .map((m) => ({ mpsno: m.mpsno, name: [m.firstName, m.lastName].filter(Boolean).join(' '), cons: m.constName || '', state: m.stateName || '' }))
    .filter((m) => m.mpsno);
  const ourLs = pols.filter((p) => p.house === 'Lok Sabha' && p.active);
  const ls = matchLsMembers(ourLs, lsMembers);
  for (const { p, m } of ls.pairs) {
    const row = lsByMpsno.get(m.mpsno);
    const emails = cleanEmails(Array.isArray(row?.email) ? row.email : [row?.email]);
    // delhiPhone is the member's Delhi office line. personalPhone/phone are the
    // personal mobile - deliberately not read (office channels only).
    const phones = cleanPhones([{ value: row?.delhiPhone, delhiField: true }]);
    const c = contactOf(emails, phones, `https://sansad.in/ls/members/biography/${m.mpsno}`, 'Digital Sansad - Lok Sabha (official)');
    if (c) { p.contact = c; lsSet++; }
    else { delete p.contact; empty++; }
  }
  console.log(`Lok Sabha: ${ls.pairs.length} matched, ${lsSet} with contact; ${ls.unmatched.length} unmatched`);
  for (const u of ls.unmatched) console.log(`  · unmatched: ${u}`);

  // ---- Rajya Sabha --------------------------------------------------------
  const rsRaw = await getJson('https://sansad.in/api_rs/member/sitting-members?state=&party=&gender=&page=1&size=300&mpFlag=1&locale=en');
  const rsRows: any[] = rsRaw?.records || [];
  if (!rsRows.length) throw new Error('RS member directory returned no rows - aborting, nothing written');
  const rsByMpsno = new Map<number, any>();
  const rsSitting: RsSitting[] = [];
  for (const r of rsRows) {
    const first = String(r.firstName || '').trim();
    const last = String(r.lastName || '').trim();
    const name = (first ? `${first} ${last}` : last).trim();
    const mpsno = parseInt(String(r.mpsno ?? 0), 10);
    if (!mpsno || !name) continue;
    rsByMpsno.set(mpsno, r);
    rsSitting.push({ mpsno, name, state: String(r.state || '').trim(), currentMinister: !!r.currentMinister, notificationDate: r.notificationDate || undefined });
  }
  const ourRs = pols.filter((p) => p.house === 'Rajya Sabha' && p.active);
  const rs = matchRsMembers(ourRs, rsSitting);
  for (const { p, m } of rs.pairs) {
    const row = rsByMpsno.get(m.mpsno);
    const emails = cleanEmails([row?.emailID]);
    // localTele is the Delhi office cell; permanentTele is the family home - not
    // a public reach-out channel, so it is deliberately not read.
    const phones = cleanPhones([{ value: row?.localTele, delhiField: true }]);
    const c = contactOf(emails, phones, `https://sansad.in/rs/members/biography/${m.mpsno}`, 'Digital Sansad - Rajya Sabha (official)');
    if (c) { p.contact = c; rsSet++; }
    else { delete p.contact; empty++; }
  }
  console.log(`Rajya Sabha: ${rs.pairs.length} matched, ${rsSet} with contact; ${rs.unmatched.length} unmatched`);
  for (const u of rs.unmatched) console.log(`  · unmatched: ${u}`);

  writeFileSync(resolve(SEED_DIR, 'politicians.json'), JSON.stringify(pols, null, 2) + '\n');
  console.log(`\n✓ Wrote politicians.json - ${lsSet + rsSet} members with published contact (${empty} matched members had no clean channel).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
