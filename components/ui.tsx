// Pure presentational bits (no hooks) — safe to use from server or client.
import { initials, avatarTint } from '@/lib/format';
import { clsx } from 'clsx';
import Icon, { type IconName } from './Icon';

export function Avatar({ name, src, size = 44 }: { name: string; src?: string; size?: number }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img src={src} alt="" width={size} height={size} className="rounded-2xl object-cover ring-1 ring-line" style={{ width: size, height: size }} />
    );
  }
  return (
    <span
      aria-hidden="true"
      className="grid shrink-0 place-items-center rounded-2xl font-bold text-white ring-1 ring-black/5"
      style={{ width: size, height: size, background: avatarTint(name), fontSize: size * 0.38 }}
    >
      {initials(name)}
    </span>
  );
}

/** Party label as a NEUTRAL chip — never party colours (bias-safety). */
export function PartyChip({ party }: { party: string }) {
  // Show a short form when the party name is long, keep full in title.
  const short = party.replace(/\s*\(([^)]+)\)\s*$/, (_, abbr) => ` (${abbr})`);
  return (
    <span title={party} className="inline-flex items-center rounded-full bg-paper-sink px-2.5 py-0.5 text-xs font-semibold text-ink-soft">
      {short}
    </span>
  );
}

export function Chip({ children, tone = 'neutral', icon }: { children: React.ReactNode; tone?: 'neutral' | 'perf' | 'rating' | 'brand' | 'warn'; icon?: IconName }) {
  const tones = {
    neutral: 'bg-paper-sink text-ink-soft',
    perf: 'bg-perf-soft text-perf-ink',
    rating: 'bg-rating-soft text-rating-ink',
    brand: 'bg-brand-soft text-brand-ink',
    warn: 'bg-accent-soft text-accent-ink',
  };
  return (
    <span className={clsx('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold', tones[tone])}>
      {icon && <Icon name={icon} size={13} />}
      {children}
    </span>
  );
}

export function SectionCard({
  title,
  subtitle,
  icon,
  aside,
  children,
  className,
}: {
  title?: string;
  subtitle?: string;
  icon?: IconName;
  aside?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={clsx('rounded-2xl border border-line bg-white p-5 shadow-soft sm:p-6', className)}>
      {(title || aside) && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            {icon && (
              <span className="mt-0.5 inline-grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
                <Icon name={icon} size={20} />
              </span>
            )}
            <div>
              {title && <h2 className="text-lg font-bold text-ink">{title}</h2>}
              {subtitle && <p className="mt-0.5 text-sm text-ink-faint">{subtitle}</p>}
            </div>
          </div>
          {aside}
        </div>
      )}
      {children}
    </section>
  );
}
