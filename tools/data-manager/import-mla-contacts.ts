/**
 * Data-manager step: attach sitting MLAs' published contact details from the
 * per-state files a sourcing workflow extracted off each assembly's OFFICIAL
 * directory (assembly website or the state's NEVA portal). The workflow only
 * gathers and verifies; THIS step owns matching and writing, so the
 * mis-attribution guards live in deterministic code, not in an agent.
 *
 * Input: a directory of <ST>.json files (or one file), each:
 *   { stateCode, found, source_url, source_name, retrieved_date,
 *     rows: [{ name, constituency, emails?, phones?, member_url? }] }
 *
 * Matching is seat-first, mirroring the Lok Sabha matcher: a row binds to the
 * seed member holding that assembly constituency, and ONLY if the name also
 * agrees (a directory row naming someone else means the roster or the
 * directory is stale - attaching would hand one member another's inbox, the
 * contact version of the affidavit mix-ups this repo has been burned by).
 * Rows without a seat, ambiguous seats, and rows whose channels do not survive
 * the shared cleaning rules are dropped and reported. Dry-run by default;
 * --apply writes.
 *
 * Usage:  npm run dm -- import-mla-contacts <dir-or-file> [--apply]
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import type { Politician, PoliticianContact } from '../../lib/types';
import { norm, lev, tokens, nameOverlap, sameCompactName } from './perf-shared';
import { cleanEmails, cleanPhones } from './contact-shared';

const ROOT = resolve(dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..', '..');
const SEED_DIR = resolve(ROOT, 'data', 'seed');

interface SourceRow { name?: string; constituency?: string; emails?: string[]; phones?: string[]; member_url?: string }
interface StateFile {
  stateCode?: string;
  found?: boolean;
  source_url?: string;
  source_name?: string;
  retrieved_date?: string;
  rows?: SourceRow[];
}

const exactName = (a: string, b: string) => {
  const ta = [...tokens(a)].sort().join('|');
  return ta.length > 0 && ta === [...tokens(b)].sort().join('|');
};
const nameAgrees = (a: string, b: string) => nameOverlap(a, b) >= 0.5 || sameCompactName(a, b);

/**
 * Assembly directories decorate the constituency name with the AC number and
 * district in a dozen incompatible layouts - "Bithoor-210", "Sankheda -[139]-
 * Chhota Udaipur", "6 - Maheshpur (ST) -[6]- Pakur", "Anandapur - ( Keonjhar ,
 * Odisha )", "Nippani - (01)". The seat is the bare name; strip the rest before
 * matching. Reservation tags "(SC)/(ST)" are left for `norm` to drop, and an
 * internal hyphen in a real name ("Chikkodi-Sadalaga") survives because only a
 * dash that INTRODUCES a number or bracket is treated as a decoration boundary.
 */
export function baseSeat(raw: string): string {
  let s = (raw || '').trim();
  s = s.replace(/^\d+\s*[-–—]\s*/, ''); // leading AC number ("6 - Maheshpur...")
  s = s.split(/\s*[-–—]\s*(?=[[(]|\d)/)[0]; // cut at a dash that introduces a number/bracket
  s = s.split(/[[(]/)[0]; // drop any remaining "(district...)" / "[123]"
  return s.replace(/\s*[-–—]\s*$/, '').trim();
}

function main() {
  const args = process.argv.slice(2).filter(Boolean);
  const apply = args.includes('--apply');
  const input = args.find((a) => !a.startsWith('--'));
  if (!input) {
    console.error('Usage: npm run dm -- import-mla-contacts <dir-or-file> [--apply]');
    process.exit(1);
  }
  const inputPath = resolve(input);
  const files = statSync(inputPath).isDirectory()
    ? readdirSync(inputPath).filter((f) => f.endsWith('.json')).map((f) => join(inputPath, f))
    : [inputPath];

  const pols: Politician[] = JSON.parse(readFileSync(resolve(SEED_DIR, 'politicians.json'), 'utf8'));
  let totalSet = 0;

  for (const file of files.sort()) {
    let doc: StateFile;
    try {
      doc = JSON.parse(readFileSync(file, 'utf8'));
    } catch (e) {
      console.log(`✗ ${file}: unreadable JSON - skipped (${(e as Error).message})`);
      continue;
    }
    const st = doc.stateCode || '';
    const pool = pols.filter((p) => p.house === 'Vidhan Sabha' && p.active && p.stateCode === st);
    if (!doc.found || !doc.rows?.length) { console.log(`- ${st}: nothing to import (found=${!!doc.found})`); continue; }
    if (!pool.length) { console.log(`✗ ${st}: no active MLAs in seed for this code - skipped`); continue; }
    if (!doc.source_url || !doc.source_name || !doc.retrieved_date) {
      console.log(`✗ ${st}: file missing source_url/source_name/retrieved_date - skipped (no citation, no claim)`);
      continue;
    }

    const bySeat = new Map<string, Politician>();
    for (const p of pool) bySeat.set(norm(p.constituencyName), p);

    // A directory that lists one seat twice is telling us it (or our roster) is
    // stale - drop BOTH rows for that seat rather than pick a side.
    const seatRows = new Map<string, SourceRow[]>();
    let noSeat = 0;
    for (const row of doc.rows) {
      const seat = norm(baseSeat(row.constituency || ''));
      if (!seat || !row.name) { noSeat++; continue; }
      if (!seatRows.has(seat)) seatRows.set(seat, []);
      seatRows.get(seat)!.push(row);
    }

    let set = 0, dupSeat = 0, seatMiss = 0, nameMiss = 0, emptyChan = 0;
    for (const [seat, rows] of seatRows) {
      if (rows.length > 1) { dupSeat += rows.length; continue; }
      const row = rows[0];
      let p = bySeat.get(seat);
      if (!p) {
        // Transliteration fallback: unique seat within edit distance 2 whose
        // member name also agrees (Kodarma/Koderma class of spellings).
        const cands = pool.filter((x) => lev(norm(x.constituencyName), seat) <= 2 && nameAgrees(x.name, row.name!));
        if (cands.length === 1) p = cands[0];
      }
      if (!p) { seatMiss++; continue; }
      if (!exactName(p.name, row.name!) && !nameAgrees(p.name, row.name!)) { nameMiss++; continue; }
      const emails = cleanEmails(row.emails || []);
      const phones = cleanPhones((row.phones || []).map((v) => ({ value: v })));
      if (!emails.length && !phones.length) { emptyChan++; continue; }
      const source_url = /^https?:\/\//.test(row.member_url || '') ? row.member_url! : doc.source_url;
      const contact: PoliticianContact = {
        ...(emails.length ? { emails } : {}),
        ...(phones.length ? { phones } : {}),
        source_url,
        source_name: doc.source_name,
        retrieved_date: doc.retrieved_date,
      };
      p.contact = contact;
      set++;
    }
    totalSet += set;
    console.log(
      `${st}: ${doc.rows.length} rows -> ${set} attached of ${pool.length} MLAs` +
        ` (skipped: ${seatMiss} seat-unmatched, ${nameMiss} name-mismatch, ${dupSeat} duplicate-seat, ${noSeat} no-seat, ${emptyChan} no clean channel)`,
    );
    if (nameMiss > doc.rows.length * 0.15)
      console.log(`  ⚠ ${st}: high name-mismatch rate - the directory may be for a previous assembly; review before publishing`);
  }

  if (apply) {
    writeFileSync(resolve(SEED_DIR, 'politicians.json'), JSON.stringify(pols, null, 2) + '\n');
    console.log(`\n✓ Wrote politicians.json - ${totalSet} MLA contact blocks attached.`);
  } else {
    console.log(`\nDry run - would attach ${totalSet} MLA contact blocks. Re-run with --apply to write.`);
  }
}

main();
