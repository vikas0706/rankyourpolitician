import Link from 'next/link';
import { getI18n } from '@/lib/i18n/server';
import { t } from '@/lib/i18n';
import { getNationalRanking, getStates, getDatasetMeta, getCentralGovernment } from '@/lib/data';
import { buildStatePaths, MAP_W, MAP_H } from '@/lib/geo';
import { MINISTER_RANK_LABEL } from '@/lib/types';
import SearchBox from '@/components/SearchBox';
import IndiaMap from '@/components/IndiaMap';
import RankingList from '@/components/RankingList';
import LastUpdated from '@/components/LastUpdated';
import AdSlot from '@/components/AdSlot';
import HierarchyLadder from '@/components/HierarchyLadder';
import { SectionCard, Avatar, PartyChip, Chip } from '@/components/ui';
import { ScoreRing, Stars } from '@/components/viz';
import Icon, { type IconName } from '@/components/Icon';

export const revalidate = 300;

export default async function HomePage() {
  const { dict } = await getI18n();
  const tr = (k: string, v?: Record<string, string | number>) => t(dict, k, v);

  const [ranking, states, meta, central] = await Promise.all([
    getNationalRanking(),
    getStates(),
    getDatasetMeta(),
    getCentralGovernment(),
  ]);
  const paths = buildStatePaths();
  const activeCodes = states.map((s) => s.stateCode);
  const pm = central.find((m) => m.rank === 'PM');
  const topCabinet = central.filter((m) => m.rank === 'Cabinet').slice(0, 5);

  const examples = ['Mandi', 'Goa', 'Anurag Thakur'];
  const tiers: { role: string; icon: IconName; tint: string }[] = [
    { role: 'lokSabha', icon: 'parliament', tint: 'bg-brand-soft text-brand' },
    { role: 'vidhanSabha', icon: 'flag', tint: 'bg-perf-soft text-perf' },
    { role: 'localBody', icon: 'home', tint: 'bg-rating-soft text-rating-ink' },
  ];

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-line bg-gradient-to-b from-brand-soft via-accent-soft/40 to-paper-soft">
        <div className="mx-auto max-w-content px-4 py-12 sm:py-16">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">
              {tr('home.heroTitle')}
              <br />
              <span className="text-brand">{tr('home.heroTitle2')}</span>
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-lg text-ink-soft">{tr('home.heroSubtitle')}</p>
            <div className="mx-auto mt-7 max-w-xl">
              <SearchBox variant="hero" />
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-sm">
                <span className="text-ink-faint">{tr('search.tryLabel')}:</span>
                {examples.map((ex) => (
                  <Link
                    key={ex}
                    href={`/search?q=${encodeURIComponent(ex)}`}
                    className="rounded-full border border-brand/20 bg-white px-3 py-1 font-medium text-brand hover:bg-brand-soft"
                  >
                    {ex}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-content px-4 py-8">
        {meta.source === 'seed' && (
          <p className="mx-auto mb-6 flex max-w-2xl items-center gap-2 rounded-xl border border-warn/30 bg-accent-soft px-4 py-2.5 text-sm text-accent-ink">
            <Icon name="info" size={16} /> {tr('common.seedNotice')}
          </p>
        )}

        {/* Top-down ladder */}
        <section className="mb-8">
          <div className="mb-3 flex items-center gap-3">
            <span className="inline-grid h-10 w-10 place-items-center rounded-xl bg-brand-soft text-brand">
              <Icon name="layers" size={22} />
            </span>
            <div>
              <h2 className="text-xl font-bold text-ink">{tr('hierarchy.title')}</h2>
              <p className="text-sm text-ink-faint">{tr('hierarchy.help')}</p>
            </div>
          </div>
          <HierarchyLadder />
        </section>

        {/* National / Central government — the top of the ladder */}
        <section className="mb-8">
          <SectionCard
            title={tr('central.title')}
            subtitle={tr('central.subtitle')}
            icon="parliament"
            aside={
              <Link href="/india" className="shrink-0 whitespace-nowrap text-sm font-semibold text-brand hover:underline">
                {tr('central.seeAll')} →
              </Link>
            }
          >
            {pm ? (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.1fr_1fr]">
                <Link href={`/person/${pm.politicianId || pm.id}`} className="flex gap-3 rounded-2xl border border-brand/20 bg-brand-soft/40 p-4 transition hover:shadow-soft">
                  <Avatar name={pm.name} src={pm.photo_url} size={64} />
                  <div className="min-w-0">
                    <Chip tone="brand" icon="parliament">{tr('central.pm')}</Chip>
                    <p className="mt-1.5 text-xl font-bold text-ink">{pm.name}</p>
                    <div className="mt-1"><PartyChip party={pm.party} /></div>
                  </div>
                </Link>
                <div>
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-ink-faint">{tr('central.cabinet')}</p>
                  <ul className="divide-y divide-line rounded-xl border border-line">
                    {topCabinet.map((m) => (
                      <li key={m.id}>
                        <Link href={`/person/${m.politicianId || m.id}`} className="flex items-center justify-between gap-3 px-3 py-2 text-sm hover:bg-paper-sink">
                          <span className="font-medium text-ink">{m.name}</span>
                          <span className="truncate text-right text-xs text-ink-faint">{m.portfolios[0]}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <Link href="/india" className="flex items-center justify-between gap-3 rounded-2xl border border-dashed border-line bg-paper-soft px-4 py-5 text-sm text-ink-soft hover:border-brand">
                <span className="flex items-center gap-2"><Icon name="parliament" size={18} className="text-brand" /> {tr('central.comingSoon')}</span>
                <span className="font-semibold text-brand">{tr('central.seeAll')} →</span>
              </Link>
            )}
          </SectionCard>
        </section>

        {/* Finder CTA — the guided "who's responsible for what" flow */}
        <Link
          href="/who"
          className="mb-8 flex items-center gap-4 rounded-2xl border border-accent/30 bg-gradient-to-r from-accent-soft to-brand-soft p-5 shadow-soft transition hover:shadow-lift"
        >
          <span className="inline-grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-accent text-white">
            <Icon name="megaphone" size={26} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold text-ink">{tr('finder.title')}</h2>
            <p className="text-sm text-ink-soft">{tr('finder.subtitle')}</p>
          </div>
          <Icon name="arrow" size={22} className="hidden shrink-0 text-accent-ink sm:block" />
        </Link>

        {/* State drill-down */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.15fr]">
          {/* Map */}
          <SectionCard title={tr('home.exploreTitle')} subtitle={tr('home.exploreHelp')} icon="pin">
            <IndiaMap paths={paths} activeCodes={activeCodes} width={MAP_W} height={MAP_H} />
            <div className="mt-4">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-faint">{tr('home.statesWithData')}</p>
              <ul className="flex flex-wrap gap-2">
                {states.map((s) => (
                  <li key={s.stateCode}>
                    <Link
                      href={`/state/${s.stateCode}`}
                      className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3.5 py-1.5 text-sm font-semibold text-brand-ink hover:bg-brand hover:text-white"
                    >
                      {s.state}
                      <span className="rounded-full bg-white/70 px-1.5 text-xs">{s.count}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </SectionCard>

          {/* Top leaders */}
          <SectionCard title={tr('home.topTitle')} subtitle={tr('home.topHelp')} icon="star" aside={<LastUpdated date={meta.lastUpdated} />}>
            {/* Two-score legend */}
            <div className="mb-4 grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2.5 rounded-xl bg-perf-soft px-3 py-2">
                <ScoreRing value={78} size={44} />
                <div className="text-xs">
                  <p className="font-bold text-perf-ink">{tr('home.scoresTitle')}</p>
                  <p className="text-ink-soft">{tr('home.perfHelp')}</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 rounded-xl bg-rating-soft px-3 py-2">
                <Stars value={4} size={16} />
                <div className="text-xs">
                  <p className="font-bold text-rating-ink">{tr('profile.scoreRating')}</p>
                  <p className="text-ink-soft">{tr('home.ratingHelp')}</p>
                </div>
              </div>
            </div>
            {ranking && ranking.entries.length > 0 ? (
              <RankingList entries={ranking.entries} />
            ) : (
              <p className="text-sm text-ink-faint">{tr('search.noResults')}</p>
            )}
          </SectionCard>
        </div>

        {/* Who does what */}
        <section className="mt-8">
          <div className="mb-4 flex items-center gap-3">
            <span className="inline-grid h-10 w-10 place-items-center rounded-xl bg-brand-soft text-brand">
              <Icon name="info" size={22} />
            </span>
            <div>
              <h2 className="text-xl font-bold text-ink">{tr('home.tiersTitle')}</h2>
              <p className="text-sm text-ink-faint">{tr('home.tiersHelp')}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {tiers.map(({ role, icon, tint }) => (
              <Link
                key={role}
                href="/accountability"
                className="group rounded-2xl border border-line bg-white p-5 shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift"
              >
                <span className={`inline-grid h-12 w-12 place-items-center rounded-2xl ${tint}`}>
                  <Icon name={icon} size={26} />
                </span>
                <h3 className="mt-3 font-bold text-ink">{tr(`accountability.roles.${role}.title`)}</h3>
                <p className="mt-1 text-sm text-ink-soft">{tr(`accountability.roles.${role}.oneLine`)}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand">
                  {tr('common.readMore')} <Icon name="arrow" size={15} className="transition group-hover:translate-x-0.5" />
                </span>
              </Link>
            ))}
          </div>
        </section>

        <div className="mt-8">
          <AdSlot />
        </div>
      </div>
    </>
  );
}
