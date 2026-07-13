// Pure visual primitives (no hooks) — big, friendly, scannable.
import Icon, { type IconName } from './Icon';
import { clsx } from 'clsx';

/** Circular progress ring for the Verified Performance percentile. */
export function ScoreRing({
  value,
  size = 132,
  label,
  sublabel,
  color = '#0d9488',
}: {
  value: number | null;
  size?: number;
  label?: string;
  sublabel?: string;
  color?: string;
}) {
  const stroke = size * 0.1;
  const r = size / 2 - stroke / 2 - 1;
  const circ = 2 * Math.PI * r;
  const pct = value == null ? 0 : Math.max(0, Math.min(100, value));
  const offset = circ * (1 - pct / 100);
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#eef0f4" strokeWidth={stroke} />
        {value != null && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
          />
        )}
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        {value == null ? (
          <span className="text-2xl font-bold text-ink-faint">—</span>
        ) : (
          <div>
            <div className="text-3xl font-extrabold leading-none" style={{ color }}>
              {value}
              <span className="text-base font-bold">%</span>
            </div>
            {label && <div className="mt-0.5 text-[11px] font-medium text-ink-faint">{label}</div>}
          </div>
        )}
      </div>
      {sublabel && <span className="sr-only">{sublabel}</span>}
    </div>
  );
}

/** Star rating for Public Rating (amber). Rounds to nearest for a clean read. */
export function Stars({ value, size = 22 }: { value: number | null; size?: number }) {
  const filled = value == null ? 0 : Math.round(value);
  return (
    <div className="flex items-center gap-0.5" role="img" aria-label={value == null ? 'No rating yet' : `${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Icon
          key={n}
          name="star"
          size={size}
          className={n <= filled ? 'text-rating' : 'text-line'}
          style={{ fill: n <= filled ? '#f59e0b' : 'transparent' }}
        />
      ))}
    </div>
  );
}

/** Metric tile: icon + big number + label + context. Very scannable. */
export function StatTile({
  icon,
  value,
  label,
  hint,
  accent = 'perf',
}: {
  icon: IconName;
  value: string;
  label: string;
  hint?: string;
  accent?: 'perf' | 'rating' | 'brand' | 'ink';
}) {
  const tint = {
    perf: 'bg-perf-soft text-perf',
    rating: 'bg-rating-soft text-rating-ink',
    brand: 'bg-brand-soft text-brand',
    ink: 'bg-paper-sink text-ink-soft',
  }[accent];
  return (
    <div className="rounded-2xl border border-line bg-white p-4">
      <span className={clsx('inline-grid h-9 w-9 place-items-center rounded-xl', tint)}>
        <Icon name={icon} size={20} />
      </span>
      <div className="mt-2.5 text-2xl font-extrabold text-ink">{value}</div>
      <div className="text-sm font-medium text-ink-soft">{label}</div>
      {hint && <div className="mt-0.5 text-xs text-ink-faint">{hint}</div>}
    </div>
  );
}

/** Rank medal: gold/silver/bronze for top 3, else a soft circle. */
export function RankBadge({ rank }: { rank: number }) {
  const medal =
    rank === 1
      ? 'bg-[#f6c945] text-[#7a5a00]'
      : rank === 2
        ? 'bg-[#cdd3db] text-[#4a5160]'
        : rank === 3
          ? 'bg-[#e6a774] text-[#7a3d12]'
          : 'bg-paper-sink text-ink-faint';
  return (
    <span className={clsx('grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-extrabold', medal)}>
      {rank}
    </span>
  );
}

/** Horizontal meter for a single metric. */
export function Meter({ value, label, value2, color = '#0d9488' }: { value: number | null; label: string; value2?: string; color?: string }) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="text-sm text-ink-soft">{label}</span>
        {value2 && <span className="text-sm font-bold" style={{ color }}>{value2}</span>}
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-paper-sink">
        <div className="h-full rounded-full" style={{ width: `${value ?? 0}%`, background: color }} />
      </div>
    </div>
  );
}
