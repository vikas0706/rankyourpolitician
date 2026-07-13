import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getConstituency, getRanking } from '@/lib/data';
import { getI18n } from '@/lib/i18n/server';
import { t } from '@/lib/i18n';
import Breadcrumbs from '@/components/Breadcrumbs';
import RankingList from '@/components/RankingList';
import AdSlot from '@/components/AdSlot';
import { SectionCard } from '@/components/ui';

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ constituency: string }>;
}): Promise<Metadata> {
  const { constituency } = await params;
  const c = await getConstituency(constituency);
  return { title: c ? `${c.name} — your representative` : 'Constituency' };
}

export default async function AreaPage({ params }: { params: Promise<{ constituency: string }> }) {
  const { constituency } = await params;
  const c = await getConstituency(constituency);
  if (!c) notFound();

  const ranking = await getRanking('constituency', c.id);
  const { dict } = await getI18n();
  const tr = (k: string, v?: Record<string, string | number>) => t(dict, k, v);

  return (
    <div className="mx-auto max-w-content px-4 py-6">
      <Breadcrumbs
        items={[
          { label: tr('levels.national'), href: '/' },
          { label: c.state, href: `/state/${c.stateCode}` },
          { label: c.name },
        ]}
      />
      <h1 className="mt-3 text-2xl font-bold text-ink">{c.name}</h1>
      <p className="mt-1 text-sm text-ink-faint">
        {c.type === 'PC' ? 'Parliamentary Constituency' : 'Assembly Constituency'} · {c.state}
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <SectionCard title={tr('levels.area')} subtitle={tr('home.topHelp')} icon="people">
          {ranking && ranking.entries.length > 0 ? (
            <RankingList entries={ranking.entries} />
          ) : (
            <p className="text-sm text-ink-faint">{tr('search.noResults')}</p>
          )}
        </SectionCard>

        <div className="space-y-6">
          <SectionCard title={tr('accountability.jurisdictionLabel')} icon="pin">
            <div className="flex flex-wrap gap-2">
              {c.districts.map((d) => (
                <Link
                  key={d}
                  href={`/district/${c.stateCode}/${encodeURIComponent(d)}`}
                  className="rounded-full border border-line px-3 py-1 text-sm text-ink-soft hover:border-brand hover:text-brand"
                >
                  {d}
                </Link>
              ))}
            </div>
            <p className="mt-3 text-right">
              <Link href="/accountability" className="text-sm text-brand hover:underline">
                {tr('nav.accountability')} →
              </Link>
            </p>
          </SectionCard>
          <AdSlot />
        </div>
      </div>
    </div>
  );
}
