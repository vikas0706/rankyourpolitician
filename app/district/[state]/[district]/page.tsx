import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getRanking, getDistrictOfficials, officialPersonId, getDistrictView } from '@/lib/data';
import { buildDistrictMap, matchDistrictName } from '@/lib/geo-districts';
import { getI18n } from '@/lib/i18n/server';
import { t } from '@/lib/i18n';
import { formatDate } from '@/lib/format';
import { OFFICE_META } from '@/lib/offices';
import type { OfficeSeat, Politician } from '@/lib/types';
import Breadcrumbs from '@/components/Breadcrumbs';
import RankingList from '@/components/RankingList';
import AdSlot from '@/components/AdSlot';
import GeoMap, { type GeoMapShape } from '@/components/GeoMap';
import { SectionCard, Avatar, PartyChip, Chip, PageHero, StatPill, Eyebrow } from '@/components/ui';
import { Reveal, CountUp } from '@/components/motion';
import Icon from '@/components/Icon';

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ state: string; district: string }>;
}): Promise<Metadata> {
  const { district } = await params;
  return { title: `${decodeURIComponent(district)} — MPs, MLAs & officials` };
}

function RepCard({ p, roleChip }: { p: Politician; roleChip: string }) {
  return (
    <Link
      href={`/person/${p.id}`}
      className="pressable flex items-center gap-3 rounded-2xl border border-line/70 bg-white/60 p-3.5 hover:border-brand/40 hover:shadow-soft"
    >
      <Avatar name={p.name} src={p.photo_url} size={52} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-bold text-ink">{p.name}</span>
          <PartyChip party={p.party} />
        </div>
        <p className="mt-0.5 flex items-center gap-1 truncate text-sm text-ink-faint">
          <Icon name="pin" size={13} /> {p.constituencyName}
        </p>
      </div>
      <Chip tone="brand">{roleChip}</Chip>
      <Icon name="chevron" size={16} className="-rotate-90 shrink-0 text-ink-faint" />
    </Link>
  );
}

export default async function DistrictPage({
  params,
}: {
  params: Promise<{ state: string; district: string }>;
}) {
  const { state, district } = await params;
  const districtParam = decodeURIComponent(district);
  const view = await getDistrictView(state, districtParam);
  if (!view) notFound();

  const [ranking, officials] = await Promise.all([
    getRanking('district', `${state}/${view.district}`),
    getDistrictOfficials(state, view.district),
  ]);
  const { dict, locale } = await getI18n();
  const tr = (k: string, v?: Record<string, string | number>) => t(dict, k, v);

  // "You are here" map: all districts of the state, this one highlighted.
  const districtMap = buildDistrictMap(state, 520);
  const canonical = matchDistrictName(state, view.district);
  const mapShapes: GeoMapShape[] | null = districtMap
    ? districtMap.shapes.map((s) => ({
        ...s,
        href: `/district/${state}/${encodeURIComponent(s.name)}`,
        sub: s.name === canonical ? tr('district.youAreHere') : view.state,
        highlighted: s.name === canonical,
        value: s.name === canonical ? 1 : 0.15,
      }))
    : null;

  return (
    <>
      <PageHero
        crumbs={
          <Breadcrumbs
            items={[
              { label: tr('levels.national'), href: '/' },
              { label: view.state, href: `/state/${state}` },
              { label: view.district },
            ]}
          />
        }
        chips={<Chip tone="neutral" icon="map">{tr('levels.district')} · {view.state}</Chip>}
        title={view.district}
        subtitle={tr('district.subtitle', { district: view.district })}
        aside={
          <div className="flex flex-wrap gap-2.5">
            <StatPill value={<CountUp value={view.mps.length} />} label={tr('district.statMps')} tone="brand" />
            <StatPill value={<CountUp value={view.mlas.length} />} label={tr('district.statMlas')} tone="perf" />
            <StatPill value={<CountUp value={view.constituencies.length} />} label={tr('home.statAreas')} tone="ink" />
          </div>
        }
      />

      <div className="mx-auto max-w-content px-4 py-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="space-y-6">
            {/* Elected representatives — the accountability layer citizens vote for */}
            <Reveal>
              <SectionCard title={tr('district.repsTitle')} subtitle={tr('district.repsHelp')} icon="people">
                {view.mps.length > 0 && (
                  <div>
                    <Eyebrow icon="parliament">{tr('district.yourMps')}</Eyebrow>
                    <div className="mt-2 space-y-2.5">
                      {view.mps.map((p) => (
                        <RepCard key={p.id} p={p} roleChip={tr('district.chipMp')} />
                      ))}
                    </div>
                  </div>
                )}
                {view.mlas.length > 0 && (
                  <div className={view.mps.length > 0 ? 'mt-5' : ''}>
                    <Eyebrow icon="flag">{tr('district.yourMlas')}</Eyebrow>
                    <div className="mt-2 space-y-2.5">
                      {view.mlas.map((p) => (
                        <RepCard key={p.id} p={p} roleChip={tr('district.chipMla')} />
                      ))}
                    </div>
                  </div>
                )}
                {view.mps.length === 0 && view.mlas.length === 0 && (
                  <p className="text-sm text-ink-faint">{tr('district.noReps')}</p>
                )}
              </SectionCard>
            </Reveal>

            {/* Appointed officials */}
            <Reveal>
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
            </Reveal>

            {ranking && ranking.entries.length > 0 && (
              <Reveal>
                <SectionCard title={tr('home.topTitle')} subtitle={tr('home.topHelp')} icon="star">
                  <RankingList entries={ranking.entries} />
                </SectionCard>
              </Reveal>
            )}
          </div>

          <div className="space-y-6">
            {mapShapes && (
              <Reveal>
                <SectionCard title={tr('district.mapTitle')} subtitle={tr('district.mapHelp', { state: view.state })} icon="map">
                  <GeoMap
                    shapes={mapShapes}
                    w={districtMap!.w}
                    h={districtMap!.h}
                    ariaLabel={tr('district.mapAria', { district: view.district, state: view.state })}
                    maxWidthClass="max-w-sm"
                  />
                </SectionCard>
              </Reveal>
            )}

            {view.constituencies.length > 0 && (
              <Reveal>
                <SectionCard title={tr('district.areasTitle')} icon="pin" subtitle={tr('district.areasHelp')}>
                  <ul className="flex flex-wrap gap-2">
                    {view.constituencies.map((c) => (
                      <li key={c.id}>
                        <Link
                          href={`/area/${c.id}`}
                          className="pressable inline-flex items-center gap-1 rounded-full border border-line bg-white/60 px-3 py-1 text-sm text-ink-soft hover:border-brand hover:text-brand"
                        >
                          {c.name}
                          <span className="text-xs text-ink-faint">{c.type === 'PC' ? tr('search.pcShort') : tr('search.acShort')}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </SectionCard>
              </Reveal>
            )}

            <Reveal>
              <SectionCard title={tr('accountability.title')} icon="info">
                <p className="text-sm text-ink-faint">{tr('accountability.intro')}</p>
                <Link href="/accountability" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline">
                  {tr('common.readMore')} <Icon name="arrow" size={14} />
                </Link>
              </SectionCard>
            </Reveal>
            <AdSlot />
          </div>
        </div>
      </div>
    </>
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
    <div className="rounded-2xl border border-line/70 bg-white/60 p-4">
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
                <Icon name="mail" size={12} /> {inc.office_email}
              </a>
            )}
            {inc.office_phone && (
              <span className="inline-flex items-center gap-1 text-ink-faint"><Icon name="phone" size={12} /> {inc.office_phone}</span>
            )}
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
