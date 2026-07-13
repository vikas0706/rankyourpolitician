import { getIndex, getCentralGovernment, getOfficials } from './data';
import { MINISTER_RANK_LABEL, type OfficeType } from './types';

export interface SearchResults {
  politicians: { id: string; name: string; party: string; area: string }[];
  constituencies: { id: string; name: string; state: string }[];
  districts: { href: string; district: string; state: string }[];
  states: { stateCode: string; state: string }[];
}

const OFFICE_SHORT: Partial<Record<OfficeType, string>> = {
  collector_dm: 'District Collector / DM',
  sp_district: 'Superintendent of Police',
};

export async function searchAll(query: string, limit = 8): Promise<SearchResults> {
  const q = query.trim().toLowerCase();
  const idx = await getIndex();
  if (!q) return { politicians: [], constituencies: [], districts: [], states: [] };
  const [central, officials] = await Promise.all([getCentralGovernment(), getOfficials()]);
  const match = (s: string | undefined) => (s || '').toLowerCase().includes(q);

  // One unified "people" list (MPs + ministers + appointed officials), deduped by person id.
  const people = new Map<string, { id: string; name: string; party: string; area: string }>();

  for (const p of idx.politicians) {
    if (match(p.name) || match(p.party) || match(p.constituencyName) || match(p.state)) {
      people.set(p.id, { id: p.id, name: p.name, party: p.party, area: `${p.constituencyName}, ${p.state}` });
    }
  }
  for (const m of central) {
    const id = m.politicianId || m.id;
    if (match(m.name) || match(m.party) || m.portfolios.some((pf) => match(pf)) || match(MINISTER_RANK_LABEL[m.rank])) {
      if (!people.has(id)) {
        people.set(id, {
          id,
          name: m.name,
          party: m.party,
          area: m.rank === 'PM' ? 'Prime Minister' : m.portfolios[0] || 'Union Minister',
        });
      }
    }
  }
  for (const o of officials) {
    if (match(o.name) || match(o.district)) {
      if (!people.has(o.id)) {
        people.set(o.id, {
          id: o.id,
          name: o.name,
          party: o.service || 'Official',
          area: `${OFFICE_SHORT[o.officeType] || 'Official'}${o.district ? `, ${o.district}` : ''}`,
        });
      }
    }
  }
  const politicians = [...people.values()].slice(0, limit);

  const constituencies = idx.constituencies
    .filter((c) => match(c.name) || match(c.state))
    .slice(0, limit)
    .map((c) => ({ id: c.id, name: c.name, state: c.state }));

  const districtSet = new Map<string, { href: string; district: string; state: string }>();
  for (const p of idx.politicians) {
    for (const d of p.districts) {
      if (!match(d)) continue;
      const key = `${p.stateCode}/${d}`;
      if (!districtSet.has(key)) {
        districtSet.set(key, { href: `/district/${p.stateCode}/${encodeURIComponent(d)}`, district: d, state: p.state });
      }
    }
  }
  const districts = [...districtSet.values()].slice(0, limit);

  const states = idx.states
    .filter((s) => match(s.state) || match(s.stateCode))
    .slice(0, limit)
    .map((s) => ({ stateCode: s.stateCode, state: s.state }));

  return { politicians, constituencies, districts, states };
}
