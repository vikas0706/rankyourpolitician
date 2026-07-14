import type { Metadata } from 'next';
import { Suspense } from 'react';
import { getI18n } from '@/lib/i18n/server';
import { t } from '@/lib/i18n';
import Breadcrumbs from '@/components/Breadcrumbs';
import Finder from '@/components/Finder';

export const metadata: Metadata = {
  title: "Who's responsible for what? — find the right person",
  description:
    'Pick your problem and your district to see the actual people responsible — the local office, your DM/SP, the state minister who runs that department, the CM, and your own MLAs and MPs.',
};

export default async function WhoPage() {
  const { dict } = await getI18n();
  const tr = (k: string) => t(dict, k);
  return (
    <div className="mx-auto max-w-content px-4 py-6">
      <Breadcrumbs items={[{ label: tr('levels.national'), href: '/' }, { label: tr('finder.title') }]} />
      <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-ink">{tr('finder.title')}</h1>
      <p className="mt-2 max-w-2xl text-lg text-ink-soft">{tr('finder.subtitle')}</p>
      <div className="mt-6">
        <Suspense fallback={<div className="skeleton h-40 w-full rounded-3xl" />}>
          <Finder />
        </Suspense>
      </div>
    </div>
  );
}
