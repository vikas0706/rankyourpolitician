import Link from 'next/link';
import type { Metadata } from 'next';
import { searchAll } from '@/lib/search';
import { getI18n } from '@/lib/i18n/server';
import { t } from '@/lib/i18n';
import { SectionCard, PartyChip } from '@/components/ui';
import SearchBox from '@/components/SearchBox';

export const metadata: Metadata = { title: 'Search' };
export const dynamic = 'force-dynamic';

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = '' } = await searchParams;
  const { dict } = await getI18n();
  const tr = (k: string, v?: Record<string, string | number>) => t(dict, k, v);
  const res = q.trim() ? await searchAll(q, 25) : null;
  const total = res
    ? res.politicians.length + res.constituencies.length + res.districts.length + res.states.length
    : 0;

  return (
    <div className="mx-auto max-w-content px-4 py-6">
      <h1 className="text-2xl font-bold text-ink">{tr('search.title')}</h1>
      <div className="mt-4 max-w-xl">
        <SearchBox variant="header" />
      </div>

      {res && (
        <p className="mt-4 text-sm text-ink-faint">
          {tr('search.resultsFor')}: <span className="font-medium text-ink-soft">“{q}”</span>
        </p>
      )}

      {res && total === 0 && <p className="mt-6 text-ink-faint">{tr('search.noResults')}</p>}

      {res && total > 0 && (
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          {res.politicians.length > 0 && (
            <SectionCard title={tr('search.groups.politicians')}>
              <ul className="space-y-2">
                {res.politicians.map((p) => (
                  <li key={p.id}>
                    <Link href={`/person/${p.id}`} className="flex items-center gap-2 hover:text-brand">
                      <span className="font-medium">{p.name}</span>
                      <PartyChip party={p.party} />
                    </Link>
                    <span className="text-xs text-ink-faint">{p.area}</span>
                  </li>
                ))}
              </ul>
            </SectionCard>
          )}
          {res.constituencies.length > 0 && (
            <SectionCard title={tr('search.groups.constituencies')}>
              <ul className="space-y-1.5">
                {res.constituencies.map((c) => (
                  <li key={c.id}>
                    <Link href={`/area/${c.id}`} className="text-brand hover:underline">
                      {c.name}
                    </Link>
                    <span className="text-xs text-ink-faint"> · {c.state}</span>
                  </li>
                ))}
              </ul>
            </SectionCard>
          )}
          {res.districts.length > 0 && (
            <SectionCard title={tr('search.groups.districts')}>
              <ul className="space-y-1.5">
                {res.districts.map((d) => (
                  <li key={d.href}>
                    <Link href={d.href} className="text-brand hover:underline">
                      {d.district}
                    </Link>
                    <span className="text-xs text-ink-faint"> · {d.state}</span>
                  </li>
                ))}
              </ul>
            </SectionCard>
          )}
          {res.states.length > 0 && (
            <SectionCard title={tr('search.groups.states')}>
              <ul className="space-y-1.5">
                {res.states.map((s) => (
                  <li key={s.stateCode}>
                    <Link href={`/state/${s.stateCode}`} className="text-brand hover:underline">
                      {s.state}
                    </Link>
                  </li>
                ))}
              </ul>
            </SectionCard>
          )}
        </div>
      )}

      {!res && <p className="mt-6 text-ink-faint">{tr('search.hint')}</p>}
    </div>
  );
}
