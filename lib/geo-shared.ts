// Shared server-side projection helpers for the drill-down maps.
// All geometry is projected to SVG path strings ON THE SERVER, so the browser
// only ever receives small path data — never raw GeoJSON.
import { geoIdentity, geoPath, type GeoPermissibleObjects } from 'd3-geo';

export interface GeoShape {
  /** Canonical display name of the unit (district / constituency / state). */
  name: string;
  d: string;
  cx: number;
  cy: number;
  /** Extra join info, e.g. district or PC for an AC. */
  meta?: Record<string, string>;
}

export interface ProjectedMap {
  shapes: GeoShape[];
  w: number;
  h: number;
}

const ROMAN: Record<string, string> = { i: '1', ii: '2', iii: '3', iv: '4', v: '5', vi: '6', vii: '7', viii: '8', ix: '9', x: '10' };
const NAME_ALIAS: Record<string, string> = { pondicherry: 'puducherry' };

/** Identity-join normalisation — must stay in sync with tools/geo/prepare-geo.ts. */
export function normGeoName(s: string): string {
  const n = s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\(.*?\)/g, '')
    .replace(/&/g, 'and')
    .replace(/\b(viii|vii|vi|iv|iii|ii|ix|i|v|x)\b/g, (m) => ROMAN[m])
    .replace(/[^a-z0-9]/g, '');
  return NAME_ALIAS[n] ?? n;
}

/** Project features to fit `width`, returning path strings + tight height. */
export function projectFeatures(
  features: { properties: Record<string, unknown>; geometry: unknown }[],
  width: number,
  nameOf: (props: Record<string, unknown>) => string,
  metaOf?: (props: Record<string, unknown>) => Record<string, string> | undefined,
): ProjectedMap {
  const fc = { type: 'FeatureCollection', features } as unknown as GeoPermissibleObjects;
  // geoIdentity is a PLANAR transform: unlike geoMercator it ignores spherical
  // winding order, so fills never invert when a shapefile's ring order differs
  // from RFC 7946. reflectY flips latitude (north = up).
  // (fitWidth exists on geoIdentity at runtime; @types/d3-geo omits it.)
  const projection = (geoIdentity().reflectY(true) as any).fitWidth(width, fc);
  const path = geoPath(projection);
  const [[, y0], [, y1]] = path.bounds(fc);
  const h = Math.ceil(y1 - y0) + 2;

  const shapes: GeoShape[] = features.map((f) => {
    const [cx, cy] = path.centroid(f as GeoPermissibleObjects);
    return {
      name: nameOf(f.properties),
      d: path(f as GeoPermissibleObjects) || '',
      cx: Number.isFinite(cx) ? cx : 0,
      cy: Number.isFinite(cy) ? cy : 0,
      meta: metaOf?.(f.properties),
    };
  });
  return { shapes, w: width, h };
}
