'use client';
import { useI18n } from '@/lib/i18n/provider';
import Icon from './Icon';

/**
 * Reusable client-side pager. Presentational: the caller owns the page state and
 * slices its own data, this only renders the controls. Returns null for a single
 * page so it can be dropped into any list unconditionally.
 */
export default function Pager({
  page,
  pageCount,
  onPage,
  total,
  pageSize,
  className = '',
}: {
  page: number; // 1-based
  pageCount: number;
  onPage: (p: number) => void;
  total?: number;
  pageSize?: number;
  className?: string;
}) {
  const { t } = useI18n();
  if (pageCount <= 1) return null;

  // Windowed page numbers: 1 … (p-1) p (p+1) … last
  const nums: (number | 'gap')[] = [1];
  const lo = Math.max(2, page - 1);
  const hi = Math.min(pageCount - 1, page + 1);
  if (lo > 2) nums.push('gap');
  for (let n = lo; n <= hi; n++) nums.push(n);
  if (hi < pageCount - 1) nums.push('gap');
  if (pageCount > 1) nums.push(pageCount);

  const showRange = total != null && pageSize != null;
  const from = showRange ? (page - 1) * pageSize! + 1 : 0;
  const to = showRange ? Math.min(page * pageSize!, total!) : 0;

  return (
    <nav className={`mt-4 flex flex-col items-center gap-3 ${className}`} aria-label="Pagination">
      {showRange && (
        <p className="text-xs text-ink-faint">{t('pager.showing', { from, to, total: total! })}</p>
      )}
      <div className="flex flex-wrap items-center justify-center gap-1">
        <button
          type="button"
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          className="inline-flex items-center gap-1 rounded-full border border-line px-3 py-1.5 text-sm font-semibold text-ink-soft transition disabled:opacity-40 enabled:hover:border-brand enabled:hover:text-brand"
        >
          <Icon name="chevron" size={15} className="rotate-90" />
          <span className="hidden sm:inline">{t('pager.prev')}</span>
        </button>
        {nums.map((n, i) =>
          n === 'gap' ? (
            <span key={`gap-${i}`} className="px-1 text-ink-faint" aria-hidden>
              …
            </span>
          ) : (
            <button
              key={n}
              type="button"
              onClick={() => onPage(n)}
              aria-current={n === page ? 'page' : undefined}
              className={`min-w-[2.25rem] rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                n === page ? 'bg-brand text-white shadow-sm' : 'text-ink-soft hover:bg-paper-sink'
              }`}
            >
              {n}
            </button>
          ),
        )}
        <button
          type="button"
          onClick={() => onPage(page + 1)}
          disabled={page >= pageCount}
          className="inline-flex items-center gap-1 rounded-full border border-line px-3 py-1.5 text-sm font-semibold text-ink-soft transition disabled:opacity-40 enabled:hover:border-brand enabled:hover:text-brand"
        >
          <span className="hidden sm:inline">{t('pager.next')}</span>
          <Icon name="chevron" size={15} className="-rotate-90" />
        </button>
      </div>
    </nav>
  );
}
