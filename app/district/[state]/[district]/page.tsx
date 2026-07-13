import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getStateByCode, getRanking, getDistrictOfficials, officialPersonId } from '@/lib/data';
import { getI18n } from '@/lib/i18n/server';
import { t } from '@/lib/i18n';
import { formatDate } from '@/lib/format';
import { OFFICE_META } from '@/lib/offices';
import type { OfficeSeat } from '@/lib/types';
import Breadcrumbs from '@/components/Breadcrumbs';
import RankingList from '@/components/RankingList';
import AdSlot from '@/components/AdSlot';
import { SectionCard } from '@/components/ui';
import Icon from '@/components/Icon';

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ state: string; district: string }>;
}): Promise<Metadata> {
  const { district } = await params;
  return { title: `${decodeURIComponent(district)} — who's responsible` };
}

export default async function DistrictPage({
  params,
}: {
  params: Promise<{ state: string; district: string }>;
}) {
  const { state, district } = await params;
  const districtName = decodeURIComponent(district);
  const info = await getStateByCode(state);
  if (!info) notFound();

  const [ranking, officials] = await Promise.all([
    getRanking('district', `${state}/${districtName}`),
    getDistrictOfficials(state, districtName),
  ]);
  const { dict, locale } = await getI18n();
  const tr = (k: string, v?: Record<string, string | number>) => t(dict, k, v);

  return (
    <div className="mx-auto max-w-content px-4 py-6">
      <Breadcrumbs
        items={[
          { label: tr('levels.national'), href: '/' },
          { label: info.state, href: `/state/${state}` },
          { label: districtName },
        ]}
      />
      <h1 className="mt-3 text-2xl font-bold text-ink">{districtName}</h1>
      <p className="mt-1 text-sm text-ink-faint">{info.state}</p>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* Appointed officials — the district accountability layer */}
        <SectionCard title={tr('officials.title')} subtitle={tr('officials.subtitle')} icon="shield">
          <div className="space-y-3">
            {officials.map((seat) => (
              <OfficeSeatCard key={seat.id} seat={seat} tr={tr} locale={locale} />
            ))}
          </div>
          <Link href="/who" className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline">
            <Icon name="megaphone" size={15} /> {tr('officials.findCta')}
          </Link>
        </SectionCard>

        <div className="space-y-6">
          {ranking && ranking.entries.length > 0 && (
            <SectionCard title={tr('home.topTitle')} subtitle={tr('home.topHelp')} icon="star">
              <RankingList entries={ranking.entries} />
            </SectionCard>
          )}
          <SectionCard title={tr('accountability.title')} icon="info">
            <p className="text-sm text-ink-faint">{tr('accountability.intro')}</p>
            <Link href="/accountability" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline">
              {tr('common.readMore')} <Icon name="arrow" size={14} />
            </Link>
          </SectionCard>
          <AdSlot />
        </div>
      </div>
    </div>
  );
}

function OfficeSeatCard({
  seat,
  tr,
  locale,
}: {
  seat: OfficeSeat;
  tr: (k: string, v?: Record<string, string | number>) => string;
  locale: string;
}) {
  const inc = seat.incumbent;
  return (
    <div className="rounded-2xl border border-line p-4">
      <p className="flex items-center gap-1.5 font-bold text-ink">
        <span className="inline-grid h-7 w-7 place-items-center rounded-lg bg-brand-soft text-brand">
          <Icon name={OFFICE_META[seat.officeType].icon} size={15} />
        </span>
        {tr(`offices.${seat.officeType}.label`)}
      </p>
      <p className="mt-1.5 text-sm text-ink-soft">{tr(`offices.${seat.officeType}.handles`)}</p>

      {inc ? (
        <div className="mt-3 rounded-xl bg-paper-soft p-3">
          <p className="font-semibold text-ink">
            <Link href={`/person/${officialPersonId(inc.name)}`} className="hover:text-brand hover:underline">{inc.name}</Link>
            {inc.service ? <span className="text-sm font-normal text-ink-faint"> · {inc.service}</span> : null}
          </p>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
            {inc.office_email && (
              <a href={`mailto:${inc.office_email}`} className="inline-flex items-center gap-1 text-brand hover:underline">
                <Icon name="link" size={12} /> {inc.office_email}
              </a>
            )}
            {inc.office_phone && <span className="text-ink-faint">☎ {inc.office_phone}</span>}
          </div>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-2 text-[11px] text-ink-faint">
            <a href={inc.source_url} target="_blank" rel="noopener noreferrer nofollow" className="text-brand hover:underline">
              {inc.source_name}
            </a>
            {inc.as_of && <span>· {tr('officials.verifiedAsOf')} {formatDate(inc.as_of, locale)}</span>}
            <Link href="/grievance" className="hover:underline">· {tr('officials.reportIncorrect')}</Link>
          </p>
        </div>
      ) : (
        <p className="mt-2 text-xs text-ink-faint">{tr('officials.currentlyUnknown')}</p>
      )}

      <p className="mt-2 text-xs">
        <span className="font-semibold text-ink-faint">{tr('finder.escalateLabel')}: </span>
        <span className="text-ink-soft">{tr(`offices.${seat.officeType}.escalate`)}</span>
      </p>
    </div>
  );
}
