'use client';
import { useEffect, useState } from 'react';
import { useI18n } from '@/lib/i18n/provider';
import { relativeTime, formatDate } from '@/lib/format';

export default function LastUpdated({ date, className = '' }: { date?: string; className?: string }) {
  const { t, locale } = useI18n();
  // Intl.DateTimeFormat output depends on which ICU data the runtime ships:
  // Node renders 'sat' in Ol Chiki while Chrome silently falls back to the
  // visitor's OS locale, so formatting during render is not hydration-safe.
  // SSR and the hydration pass emit the locale-neutral ISO date; the browser's
  // own best rendering replaces it after mount (the tooltip is only ever seen
  // on hover, well after that).
  const [localized, setLocalized] = useState(false);
  useEffect(() => setLocalized(true), []);
  if (!date) return null;
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs text-ink-faint ${className}`}
      title={localized ? formatDate(date, locale) : date}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
        <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      {t('common.lastUpdated')}: {relativeTime(date, t, locale)}
    </span>
  );
}
