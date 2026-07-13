import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getStateByCode, getRanking, getConstituenciesInState, getDistrictsInState, getStates } from '@/lib/data';
import { getI18n } from '@/lib/i18n/server';
import { t } from '@/lib/i18n';
import Breadcrumbs from '@/components/Breadcrumbs';
import RankingList from '@/components/RankingList';
import AdSlot from '@/components/AdSlot';
import { SectionCard } from '@/components/ui';

export const revalidate = 300;

export async function generateStaticParams() {
  return (await getStates()).map((s) => ({ state: s.stateCode }));
}

export async function generateMetadata({ params }: { params: Promise<{ state: string }> }): Promise<Metadata> {
  const { state } = await params;
  const s = await getStateByCode(state);
  return { title: s ? `${s.state} — representatives` : 'State' };
}

export default async function StatePage({ params }: { params: Promise<{ state: string }> }) {
  const { state } = await params;
  const info = await getStateByCode(state);
  if (!info) notFound();

  const [ranking, districts, constituencies] = await Promise.all([
    getRanking('state', state),
    getDistrictsInState(state),
    getConstituenciesInState(state),
  ]);
  const { dict } = await getI18n();
  const tr = (k: string, v?: Record<string, string | number>) => t(dict, k, v);

  return (
    <div className="mx-auto max-w-content px-4 py-6">
      <Breadcrumbs items={[{ label: tr('levels.national'), href: '/' }, { label: info.state }]} />
      <h1 className="mt-3 text-2xl font-bold text-ink">{info.state}</h1>
      <p className="mt-1 text-sm text-ink-faint">
        {info.count} {tr('search.groups.politicians').toLowerCase()}
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <SectionCard title={tr('home.topTitle')} subtitle={tr('home.topHelp')} icon="star">
          {ranking && ranking.entries.length > 0 ? (
            <RankingList entries={ranking.entries} />
          ) : (
            <p className="text-sm text-ink-faint">{tr('search.noResults')}</p>
          )}
        </SectionCard>

        <div className="space-y-6">
          <SectionCard title={tr('levels.district')} icon="layers">
            <ul className="flex flex-wrap gap-2">
              {districts.map((d) => (
                <li key={d}>
                  <Link
                    href={`/district/${state}/${encodeURIComponent(d)}`}
                    className="rounded-full border border-line px-3 py-1 text-sm text-ink-soft hover:border-brand hover:text-brand"
                  >
                    {d}
                  </Link>
                </li>
              ))}
            </ul>
          </SectionCard>

          <SectionCard title={tr('search.groups.constituencies')} icon="pin">
            <ul className="space-y-1.5 text-sm">
              {constituencies.map((c) => (
                <li key={c.id}>
                  <Link href={`/area/${c.id}`} className="text-brand hover:underline">
                    {c.name}
                  </Link>
                  <span className="text-ink-faint"> · {c.type}</span>
                </li>
              ))}
            </ul>
          </SectionCard>

          <AdSlot />
        </div>
      </div>
    </div>
  );
}
