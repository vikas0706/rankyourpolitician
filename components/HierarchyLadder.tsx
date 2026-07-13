'use client';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n/provider';
import Icon, { type IconName } from './Icon';

// The accountability ladder: National -> State -> District -> Area.
// Start at the top; drill down. National links to the central government page.
export default function HierarchyLadder({ current }: { current?: 'national' | 'state' | 'district' | 'area' }) {
  const { t } = useI18n();
  const steps: { key: 'national' | 'state' | 'district' | 'area'; icon: IconName; href?: string; tint: string }[] = [
    { key: 'national', icon: 'parliament', href: '/india', tint: 'bg-brand-soft text-brand' },
    { key: 'state', icon: 'flag', tint: 'bg-perf-soft text-perf' },
    { key: 'district', icon: 'shield', tint: 'bg-rating-soft text-rating-ink' },
    { key: 'area', icon: 'pin', tint: 'bg-paper-sink text-ink-soft' },
  ];
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
      {steps.map((s, i) => {
        const inner = (
          <div className={`flex h-full items-center gap-3 rounded-2xl border bg-white p-3.5 ${current === s.key ? 'border-brand ring-1 ring-brand/30' : 'border-line'} ${s.href ? 'transition hover:border-brand hover:shadow-soft' : ''}`}>
            <span className={`inline-grid h-10 w-10 shrink-0 place-items-center rounded-xl ${s.tint}`}>
              <Icon name={s.icon} size={22} />
            </span>
            <div className="min-w-0">
              <p className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-ink-faint">
                {i + 1}. {t(`hierarchy.${s.key}`)}
              </p>
              <p className="truncate text-sm font-medium text-ink">{t(`hierarchy.${s.key}Who`)}</p>
            </div>
          </div>
        );
        return s.href ? (
          <Link key={s.key} href={s.href} className="block">
            {inner}
          </Link>
        ) : (
          <div key={s.key}>{inner}</div>
        );
      })}
    </div>
  );
}
