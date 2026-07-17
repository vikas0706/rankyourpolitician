const stripRefs = (s: string) => s.replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, '').replace(/<ref[^>]*\/>/g, '').replace(/\{\{efn[^}]*\}\}/gi, '');
const clean = (s: string) => stripRefs(s)
  .replace(/\[\[[^\]|]*\|([^\]]+)\]\]/g, '$1').replace(/\[\[([^\]]+)\]\]/g, '$1')
  .replace(/\{\{[^}]*\}\}/g, '').replace(/'''?/g, '').replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '')
  .replace(/\s+/g, ' ').trim();
const normParty = (p: string) => clean(p).replace(/\s*\((?:19|20)\d\d[--](?:present|\d\d\d\d)\)\s*$/i, '').trim();
const cellsOf = (row: string) => ('\n' + row).split(/\n\s*[|!]\s?/).map((c) => c.trim()).filter((c) => c.length);
const EXCLUDE = /(?:Assembly|Vidhan[a]? Sabha|Legislative) constituency|Lok Sabha| district\b|Party|File:|List of|Chief Minister|Speaker|Deputy Speaker|Governor|\.svg|\.png|\.jpg/i;
const CONS_RE = /\[\[([^\]|]*?(?:Assembly|Vidhan[a]? Sabha|Legislative Assembly) constituency[^\]|]*?)(?:\|([^\]]+))?\]\]/;
const CONS_COUNT_RE = /(?:Assembly|Vidhan[a]? Sabha|Legislative Assembly) constituency/g;
const ALLIANCE_TAIL = /(?:Alliance|Coalition)$/i;
const PARTY_HINT = /\b(Party|Congress|Sena|Dal|Samajwadi|Bahujan|Janata|Communist|Morcha|Kazhagam|Rashtriya|Trinamool|Biju|Desam|Nationalist|People's|Democratic|Republican|Majlis|Jana Sena|Apna|Lok|Munnetra|Maha Vikas|Front)\b/i;

const DEPARTED_RE = /Elected to Lok Sabha|resign|resignation|died|passed away|expel|expelled|disqualif/i;

export const slug = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

export interface MLA {
  cons: string;
  name: string;
  title: string | null;
  party: string;
  note?: string;
}

interface RawRow {
  cons: string;
  name: string;
  title: string | null;
  party: string;
  note: string;
  departed: boolean;
}

/** Pick the section with the most Assembly-constituency links (the members table). */
function membersBody(wt: string): string {
  const parts = wt.split(/^==+\s*(.+?)\s*==+\s*$/m);
  if (parts.length < 3) return wt;
  let best = '';
  let bestN = 0;
  for (let i = 1; i < parts.length; i += 2) {
    if (/council/i.test(parts[i])) continue;
    const body = parts[i + 1] || '';
    const n = (body.match(CONS_COUNT_RE) || []).length;
    if (n > bestN) { bestN = n; best = body; }
  }
  return best || wt;
}

export function collectMemberRows(wt: string): RawRow[] {
  const body = membersBody(wt);
  const rows = body.split(/\n\|-/);
  const out: RawRow[] = [];
  let curParty = '';
  let curCons: string | null = null;

  for (const row of rows) {
    const consM = row.match(CONS_RE);
    if (consM) {
      curCons = (consM[2] ? clean(consM[2]) : clean(consM[1].replace(/\s*\(?[A-Za-z. ]*?(?:Assembly|Vidhan[a]? Sabha|Legislative Assembly) constituency\)?/i, '')))
        .replace(/\s*\((SC|ST|SC\/ST)\)\s*$/i, '').trim();
    }
    if (!curCons) continue;

    const full = row.match(/Full party name with colou?r\s*\|\s*([^|}\n]+)/i);
    let rowParty: string | null = full ? normParty(full[1]) : null;
    if (!rowParty) {
      for (const m of row.matchAll(/[Pp]arty name with colou?r\s*\|\s*([^|}\n]+)/g)) {
        const v = normParty(m[1]);
        if (v && !ALLIANCE_TAIL.test(v)) { rowParty = v; break; }
      }
    }
    if (!rowParty) { const pc = row.match(/[Pp]arty color\s*\|\s*([^|}\n]+)/); if (pc) rowParty = normParty(pc[1]); }
    const links = [...row.matchAll(/\[\[([^\]|#]+)(?:\|([^\]]+))?\]\]/g)];
    if (!rowParty) {
      for (const lm of links) {
        const disp = clean(lm[2] || lm[1]);
        if (PARTY_HINT.test(lm[1]) && !ALLIANCE_TAIL.test(disp) && !/constituency|district|Lok Sabha|List of/i.test(lm[1])) { rowParty = normParty(lm[2] || lm[1]); break; }
      }
    }
    if (rowParty) curParty = rowParty;

    let title: string | null = null;
    let name: string | null = null;
    for (const lm of links) {
      if (EXCLUDE.test(lm[1]) || PARTY_HINT.test(lm[1])) continue;
      title = lm[1].trim().replace(/_/g, ' ');
      name = clean(lm[2] || lm[1]);
      break;
    }

    if (!name) {
      const cells = cellsOf(row);
      for (const c of cells) {
        if (/Party name|color|Elected|rowspan|colspan|\{\{|style=/i.test(c)) continue;
        const cand = clean(c);
        if (cand && /^[A-Za-z]/.test(cand) && cand.length <= 60 && !/^vacant$/i.test(cand)) {
          name = cand;
          break;
        }
      }
    }

    if (!name || name.length < 2 || /^vacant$/i.test(name)) continue;

    const note = (row.match(/Elected[^|\n]*/i) || [])[0]?.trim() || '';
    out.push({
      cons: curCons,
      name,
      title,
      party: curParty || 'Independent',
      note,
      departed: DEPARTED_RE.test(note),
    });
  }
  return out;
}

export function resolveCurrentMembers(raw: RawRow[]): MLA[] {
  const byCons = new Map<string, RawRow[]>();
  for (const r of raw) {
    const k = slug(r.cons);
    if (!byCons.has(k)) byCons.set(k, []);
    byCons.get(k)!.push(r);
  }
  const out: MLA[] = [];
  for (const [, rows] of byCons) {
    const sitting = [...rows].reverse().find((r) => !r.departed) ?? rows[rows.length - 1];
    out.push({
      cons: sitting.cons,
      name: sitting.name,
      title: sitting.title,
      party: sitting.party,
      ...(sitting.note ? { note: sitting.note } : {}),
    });
  }
  return out.sort((a, b) => a.cons.localeCompare(b.cons));
}

export function parseMembers(wt: string): MLA[] {
  return resolveCurrentMembers(collectMemberRows(wt));
}
