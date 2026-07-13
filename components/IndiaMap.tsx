'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { StatePath } from '@/lib/geo';

// Clickable choropleth of India. States WITH data are highlighted and navigate
// to their page; states without data are shown muted. A parallel text list of
// links (rendered by the page) provides the accessible / no-JS fallback.
export default function IndiaMap({
  paths,
  activeCodes,
  width,
  height,
}: {
  paths: StatePath[];
  activeCodes: string[];
  width: number;
  height: number;
}) {
  const router = useRouter();
  const [hover, setHover] = useState<string | null>(null);
  const active = new Set(activeCodes);

  return (
    <div className="relative w-full rounded-2xl bg-[#eaf0f6] p-2">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="mx-auto h-auto w-full max-w-sm"
        role="img"
        aria-label="Map of India. Select a highlighted state to view its representatives."
      >
        {paths.map((p) => {
          const has = p.code != null && active.has(p.code);
          const isHover = hover === p.name;
          return (
            <path
              key={p.name}
              d={p.d}
              className={has ? 'geo-path geo-path--active' : 'geo-path'}
              fill={has ? (isHover ? '#4338ca' : '#4f46e5') : isHover ? '#ddcdb0' : '#e8dcc3'}
              tabIndex={has ? 0 : -1}
              role={has ? 'button' : undefined}
              aria-label={has ? p.name : undefined}
              style={{ cursor: has ? 'pointer' : 'default' }}
              onMouseEnter={() => setHover(p.name)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(p.name)}
              onBlur={() => setHover(null)}
              onClick={() => has && router.push(`/state/${p.code}`)}
              onKeyDown={(e) => {
                if (has && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  router.push(`/state/${p.code}`);
                }
              }}
            />
          );
        })}
        {/* Markers so the clickable states are easy to spot */}
        {paths
          .filter((p) => p.code && active.has(p.code))
          .map((p) => (
            <circle
              key={'m' + p.name}
              cx={p.cx}
              cy={p.cy}
              r={4.5}
              fill="#ffffff"
              stroke="#4f46e5"
              strokeWidth={2.5}
              className="pointer-events-none"
            />
          ))}
      </svg>
      {hover && (
        <div className="pointer-events-none absolute left-1/2 top-2 -translate-x-1/2 rounded-md bg-ink px-2 py-1 text-xs text-white shadow">
          {hover}
          {!paths.find((p) => p.name === hover && p.code && active.has(p.code)) && ' · no data yet'}
        </div>
      )}
    </div>
  );
}
