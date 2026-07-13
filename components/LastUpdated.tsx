'use client';
import { useI18n } from '@/lib/i18n/provider';
import { relativeTime, formatDate } from '@/lib/format';

export default function LastUpdated({ date, className = '' }: { date?: string; className?: string }) {
  const { t, locale } = useI18n();
  if (!date) return null;
  return (
    <span className={`inline-flex items-center gap-1 text-xs text-ink-faint ${className}`} title={formatDate(date, locale)}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
        <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      {t('common.lastUpdated')}: {relativeTime(date, t, locale)}
    </span>
  );
}
