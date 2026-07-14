// District-level geometry (census-2011 framework, DataMeet / Survey-of-India-
// conforming boundaries). Server-only: pages send projected path strings.
import districtsGeo from '@/data/geo/india-districts.json';
import { projectFeatures, normGeoName, type ProjectedMap } from './geo-shared';

interface DistFeature {
  properties: { d: string; s: string };
  geometry: unknown;
}

const all = (districtsGeo as unknown as { features: DistFeature[] }).features;

let byState: Map<string, DistFeature[]> | null = null;
function featuresByState(): Map<string, DistFeature[]> {
  if (!byState) {
    byState = new Map();
    for (const f of all) {
      const arr = byState.get(f.properties.s) ?? [];
      arr.push(f);
      byState.set(f.properties.s, arr);
    }
  }
  return byState;
}

const cache = new Map<string, ProjectedMap>();

/** All districts of a state, projected to fit the given width. */
export function buildDistrictMap(stateCode: string, width = 520): ProjectedMap | null {
  const key = `${stateCode}|${width}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const feats = featuresByState().get(stateCode);
  if (!feats || feats.length === 0) return null;
  const m = projectFeatures(feats as never, width, (p) => p.d as string);
  cache.set(key, m);
  return m;
}

/** Does this state have district polygons we can draw? */
export function hasDistrictMap(stateCode: string): boolean {
  return featuresByState().has(stateCode);
}

/** Canonical map name for a district (case/spelling tolerant), if present. */
export function matchDistrictName(stateCode: string, district: string): string | null {
  const feats = featuresByState().get(stateCode);
  if (!feats) return null;
  const n = normGeoName(district);
  for (const f of feats) if (normGeoName(f.properties.d) === n) return f.properties.d;
  return null;
}
