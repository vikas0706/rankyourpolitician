/**
 * One-off reconciliation after MLA roster refresh: restore criminal_cases_declared
 * facts stripped from politicians.json while criminal_cases.json still references
 * those members. Matches pre-refresh seed at PRE_REFRESH_COMMIT by politician id,
 * then constituencyId + normalized name. Drops criminal_cases.json rows whose
 * affidavit page belongs to a predecessor at the same seat.
 *
 * Usage: npx tsx tools/data-manager/restore-criminal-case-facts.ts [--dry-run]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { execSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import type { Politician, Fact, CriminalRecord } from '../../lib/types';
import { nameMatches } from './myneta';
import { savePoliticians } from './publish';

const ROOT = resolve(dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..', '..');
const SEED = resolve(ROOT, 'data', 'seed');
const PRE_REFRESH_COMMIT = 'eeeb9b2';
const DRY = process.argv.includes('--dry-run');

const normName = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '');

function loadPreRefresh(): Politician[] {
  const cached = resolve(tmpdir(), 'ryp-pre-refresh-politicians.json');
  try {
    return JSON.parse(readFileSync(cached, 'utf8'));
  } catch {
    const raw = execSync(`git show ${PRE_REFRESH_COMMIT}:data/seed/politicians.json`, {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    });
    writeFileSync(cached, raw);
    return JSON.parse(raw);
  }
}

function criminalFact(p: Politician): Fact | undefined {
  return p.facts.find((f) => f.field_type === 'criminal_cases_declared');
}

/** Affidavit facts on the same MyNeta page as the criminal count. */
function affidavitFactsFrom(p: Politician, sourceUrl: string): Fact[] {
  const AFF = new Set(['criminal_cases_declared', 'assets_total', 'liabilities_total', 'education']);
  return p.facts.filter((f) => AFF.has(f.field_type) && f.source_url === sourceUrl);
}

function findPreMatch(
  cur: Politician,
  preById: Map<string, Politician>,
  preBySeat: Map<string, Politician[]>,
): Politician | null {
  const byId = preById.get(cur.id);
  if (byId && criminalFact(byId)) return byId;
  for (const pp of preBySeat.get(cur.constituencyId || '') || []) {
    if (pp.constituencyId !== cur.constituencyId) continue;
    if (!criminalFact(pp)) continue;
    if (normName(pp.name) === normName(cur.name) || nameMatches(pp.name, cur.name)) return pp;
  }
  return null;
}

function predecessorForRecord(
  cur: Politician,
  record: CriminalRecord,
  preBySeat: Map<string, Politician[]>,
): Politician | null {
  for (const pp of preBySeat.get(cur.constituencyId || '') || []) {
    if (pp.id === cur.id) continue;
    const f = criminalFact(pp);
    if (f && f.source_url === record.source_url) return pp;
  }
  return null;
}

function copyFacts(target: Politician, sourceFacts: Fact[]) {
  for (const f of sourceFacts) {
    if (target.facts.some((x) => x.field_type === f.field_type)) continue;
    target.facts.push({ ...f });
  }
}

function main() {
  const politicians: Politician[] = JSON.parse(readFileSync(resolve(SEED, 'politicians.json'), 'utf8'));
  const records: CriminalRecord[] = JSON.parse(readFileSync(resolve(SEED, 'criminal_cases.json'), 'utf8'));
  const pre = loadPreRefresh();

  const preById = new Map(pre.map((p) => [p.id, p]));
  const preBySeat = new Map<string, Politician[]>();
  for (const p of pre) {
    if (!p.constituencyId) continue;
    if (!preBySeat.has(p.constituencyId)) preBySeat.set(p.constituencyId, []);
    preBySeat.get(p.constituencyId)!.push(p);
  }

  const byId = new Map(politicians.map((p) => [p.id, p]));
  let restored = 0;
  let removed = 0;
  let skipped = 0;
  const kept: CriminalRecord[] = [];
  const report: string[] = [];

  for (const r of records) {
    const p = byId.get(r.politician_id);
    if (!p) {
      kept.push(r);
      continue;
    }
    if (criminalFact(p)) {
      kept.push(r);
      continue;
    }

    const pred = predecessorForRecord(p, r, preBySeat);
    if (pred) {
      removed++;
      report.push(`REMOVE ${p.id} (${p.name}) — record cites predecessor ${pred.id} (${pred.name})`);
      continue;
    }

    const preP = findPreMatch(p, preById, preBySeat);
    if (!preP) {
      kept.push(r);
      skipped++;
      report.push(`SKIP ${p.id} (${p.name}) — no safe pre-refresh match`);
      continue;
    }

    const preCriminal = criminalFact(preP)!;
    if (preCriminal.source_url !== r.source_url || parseInt(preCriminal.value, 10) !== r.declared_total) {
      kept.push(r);
      skipped++;
      report.push(
        `SKIP ${p.id} (${p.name}) — pre fact (${preCriminal.value} @ ${preCriminal.source_url}) ≠ record (${r.declared_total})`,
      );
      continue;
    }

    copyFacts(p, affidavitFactsFrom(preP, r.source_url));
    restored++;
    kept.push(r);
  }

  console.log(`Restored facts for ${restored} politicians`);
  console.log(`Removed ${removed} mis-mapped criminal_cases.json records`);
  console.log(`Skipped ${skipped} records (no safe match)`);
  if (report.length) console.log('\nDetails:\n' + report.slice(0, 30).join('\n') + (report.length > 30 ? `\n… and ${report.length - 30} more` : ''));

  if (DRY) {
    console.log('\n(dry run — no files written)');
    return;
  }

  savePoliticians(politicians);
  writeFileSync(
    resolve(SEED, 'criminal_cases.json'),
    JSON.stringify(kept.sort((a, b) => a.politician_id.localeCompare(b.politician_id)), null, 2) + '\n',
  );
}

main();
