'use client';
import { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import type { RankingEntry } from '@/lib/types';
import { useI18n } from '@/lib/i18n/provider';
import { Avatar, PartyChip } from './ui';
import { RankBadge, Stars, ScoreRing } from './viz';
import Icon from './Icon';
import Pager from './Pager';

type SortKey = 'performance' | 'rating';

const PAGE_SIZE = 20;

export default function RankingList({ entries, limit }: { entries: RankingEntry[]; limit?: number }) {
  const { t } = useI18n();
  const [sort, setSort] = useState<SortKey>('performance');
  const [page, setPage] = useState(1);
  const topRef = useRef<HTMLDivElement>(null);

  const sorted = useMemo(() => {
    const arr = [...entries];
    const key = (e: RankingEntry) => (sort === 'performance' ? e.performance_percentile : e.sentiment_mean);
    arr.sort((a, b) => {
      const av = key(a),
        bv = key(b);
      if (av == null && bv == null) return a.name.localeCompare(b.name);
      if (av == null) return 1;
      if (bv == null) return -1;
      return bv - av || a.name.localeCompare(b.name);
    });
    return limit ? arr.slice(0, limit) : arr;
  }, [entries, sort, limit]);

  // Reset to the first page when the sort order or the underlying list changes.
  useEffect(() => setPage(1), [sort, entries]);

  const pageCount = Math.ceil(sorted.length / PAGE_SIZE);
  const safePage = Math.min(page, Math.max(1, pageCount));
  const start = (safePage - 1) * PAGE_SIZE;
  const visible = sorted.slice(start, start + PAGE_SIZE);

  const goToPage = (p: number) => {
    setPage(p);
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div>
      <div ref={topRef} className="scroll-mt-20" />
      {/* Sort — friendly segmented control */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-sm text-ink-faint">{t('ranking.sortBy')}:</span>
        <div className="inline-flex rounded-full bg-paper-sink p-1 text-sm font-semibold">
          <button
            onClick={() => setSort('performance')}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 ${sort === 'performance' ? 'bg-white text-perf shadow-sm' : 'text-ink-faint'}`}
          >
            <Icon name="shield" size={15} /> {t('ranking.byPerformance')}
          </button>
          <button
            onClick={() => setSort('rating')}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 ${sort === 'rating' ? 'bg-white text-rating-ink shadow-sm' : 'text-ink-faint'}`}
          >
            <Icon name="star" size={15} /> {t('ranking.bySentiment')}
          </button>
        </div>
      </div>

      <ol className="space-y-2.5">
        {visible.map((e, i) => (
          <li key={e.politician_id}>
            <Link
              href={`/person/${e.politician_id}`}
              className="flex items-center gap-3 rounded-2xl border border-line bg-white p-3 transition hover:border-brand/40 hover:shadow-lift sm:gap-4 sm:p-4"
            >
              <RankBadge rank={start + i + 1} />
              <Avatar name={e.name} src={e.photo_url} size={52} />

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="font-bold text-ink">{e.name}</span>
                  <PartyChip party={e.party} />
                </div>
                <p className="mt-0.5 flex items-center gap-1 truncate text-sm text-ink-faint">
                  <Icon name="pin" size={14} /> {e.constituencyName}, {e.state}
                </p>
                {/* Rating shown inline (mobile-friendly) */}
                <div className="mt-1.5 flex items-center gap-1.5">
                  <Stars value={e.sentiment_mean} size={15} />
                  <span className="text-xs text-ink-faint">
                    {e.sentiment_mean == null ? t('ranking.noVotes') : `${e.sentiment_mean.toFixed(1)} · ${t('ranking.votes', { n: e.sentiment_votes })}`}
                  </span>
                </div>
              </div>

              {/* Performance ring */}
              <div className="hidden shrink-0 text-center sm:block">
                <ScoreRing value={e.performance_percentile} size={66} label={t('ranking.topLabel')} />
              </div>
              <Icon name="chevron" size={18} className="-rotate-90 text-ink-faint" />
            </Link>
          </li>
        ))}
      </ol>

      <Pager
        page={safePage}
        pageCount={pageCount}
        onPage={goToPage}
        total={sorted.length}
        pageSize={PAGE_SIZE}
      />
    </div>
  );
}
