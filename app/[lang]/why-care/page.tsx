import type { Metadata } from 'next';
import Link from 'next/link';
import { getI18n, type LangParams } from '@/lib/i18n/server';
import { t } from '@/lib/i18n';
import Breadcrumbs from '@/components/Breadcrumbs';
import { PageHero, Chip } from '@/components/ui';
import { Reveal } from '@/components/motion';
import Icon, { type IconName } from '@/components/Icon';
import AdSlot from '@/components/AdSlot';

// Weekly self-heal only - prose from the seed, changes on deploy (see README).
export const revalidate = 604800;
export { allLocaleStaticParams as generateStaticParams } from '@/lib/i18n/server';

export async function generateMetadata({ params }: { params: Promise<LangParams> }): Promise<Metadata> {
  const { dict } = await getI18n((await params).lang);
  return {
    title: t(dict, 'whyCare.title'),
    description: t(dict, 'whyCare.metaDescription'),
    alternates: { canonical: '/why-care' },
    openGraph: {
      title: t(dict, 'whyCare.metaTitle'),
      description: t(dict, 'whyCare.metaDescription'),
    },
  };
}

// Presentation (icons, optional cross-links) lives in code, by index; the words
// (title, desc) are fully localised under whyCare.* as arrays of {title, desc}.
const EVERYDAY: IconName[] = ['wallet', 'map', 'cap', 'shield', 'briefcase', 'megaphone'];
const IGNORE: IconName[] = ['clock', 'warn', 'people', 'wallet'];
const POWER: { icon: IconName; href?: string }[] = [
  { icon: 'flag' },
  { icon: 'info', href: '/rights' },
  { icon: 'pin', href: '/who' },
  { icon: 'star', href: '/rankings' },
  { icon: 'share' },
];
const GOOD: IconName[] = ['calendar', 'megaphone', 'wallet', 'phone', 'people', 'shield', 'scales'];
const START: { icon: IconName; href?: string }[] = [
  { icon: 'search', href: '/search' },
  { icon: 'star' },
  { icon: 'sparkle' },
  { icon: 'pin', href: '/who' },
  { icon: 'share' },
];

const TOC: { key: string; id: string }[] = [
  { key: 'everyday', id: 'everyday' },
  { key: 'ignore', id: 'ignore' },
  { key: 'power', id: 'power' },
  { key: 'good', id: 'good' },
  { key: 'start', id: 'start' },
];

type Item = { title: string; desc: string };

export default async function WhyCarePage({ params }: { params: Promise<LangParams> }) {
  const { dict } = await getI18n((await params).lang);
  const tr = (k: string, v?: Record<string, string | number>) => t(dict, k, v);
  // Read a localised array of {title, desc} straight off the merged dictionary.
  const items = (path: string): Item[] => {
    const v = path.split('.').reduce<any>((o, k) => (o == null ? undefined : o[k]), dict);
    return Array.isArray(v) ? (v as Item[]) : [];
  };

  return (
    <>
      <PageHero
        crumbs={<Breadcrumbs items={[{ label: tr('levels.national'), href: '/' }, { label: tr('nav.whyCare') }]} />}
        title={tr('whyCare.title')}
        subtitle={tr('whyCare.subtitle')}
        chips={
          <>
            <Chip tone="brand" icon="sparkle">{tr('whyCare.eyebrow')}</Chip>
            <Chip tone="neutral" icon="shield">{tr('whyCare.nonpartisanTag')}</Chip>
          </>
        }
      />

      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* Framing note - not preachy, not partisan */}
        <div className="flex items-start gap-2.5 rounded-2xl border border-line bg-paper-soft px-4 py-3 text-sm text-ink-soft">
          <Icon name="info" size={18} className="mt-0.5 shrink-0 text-brand" />
          <p>{tr('whyCare.note')}</p>
        </div>

        {/* On this page */}
        <nav aria-label={tr('whyCare.tocTitle')} className="mt-5">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-ink-faint">{tr('whyCare.tocTitle')}</p>
          <div className="flex flex-wrap gap-2">
            {TOC.map(({ key, id }) => (
              <a
                key={id}
                href={`#${id}`}
                className="pressable rounded-full border border-line bg-white px-3 py-1.5 text-sm font-semibold text-ink-soft hover:border-brand/40 hover:text-brand"
              >
                {tr(`whyCare.toc.${key}`)}
              </a>
            ))}
          </div>
        </nav>

        {/* 1 - It touches your day */}
        <section id="everyday" aria-labelledby="everyday-h" className="mt-10 scroll-mt-24">
          <Reveal>
            <SectionHead eyebrow={tr('whyCare.everyday.eyebrow')} title={tr('whyCare.everyday.title')} intro={tr('whyCare.everyday.intro')} id="everyday-h" />
          </Reveal>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items('whyCare.everyday.items').map((it, i) => (
              <Reveal key={i} delay={(i % 3) * 60} as="div">
                <div className="glass flex h-full flex-col rounded-3xl p-5">
                  <span className="inline-grid h-11 w-11 place-items-center rounded-2xl bg-brand-soft text-brand">
                    <Icon name={EVERYDAY[i] ?? 'sparkle'} size={23} />
                  </span>
                  <h3 className="mt-3 font-bold text-ink">{it.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-ink-soft">{it.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* 2 - The cost of looking away */}
        <section id="ignore" aria-labelledby="ignore-h" className="mt-12 scroll-mt-24">
          <Reveal>
            <SectionHead eyebrow={tr('whyCare.ignore.eyebrow')} title={tr('whyCare.ignore.title')} intro={tr('whyCare.ignore.intro')} id="ignore-h" />
          </Reveal>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {items('whyCare.ignore.items').map((it, i) => (
              <Reveal key={i} delay={(i % 2) * 60} as="div">
                <div className="flex h-full gap-3 rounded-3xl border border-accent/25 bg-accent-soft/50 p-5">
                  <span className="inline-grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-accent-soft text-accent-ink">
                    <Icon name={IGNORE[i] ?? 'warn'} size={21} />
                  </span>
                  <div>
                    <h3 className="font-bold text-ink">{it.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-ink-soft">{it.desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* 3 - More than one vote */}
        <section id="power" aria-labelledby="power-h" className="mt-12 scroll-mt-24">
          <Reveal>
            <SectionHead eyebrow={tr('whyCare.power.eyebrow')} title={tr('whyCare.power.title')} intro={tr('whyCare.power.intro')} id="power-h" />
          </Reveal>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {items('whyCare.power.items').map((it, i) => {
              const { icon, href } = POWER[i] ?? { icon: 'check' as IconName };
              const inner = (
                <div className={`glass flex h-full items-start gap-3 rounded-3xl p-5 ${href ? 'pressable transition hover:shadow-lift' : ''}`}>
                  <span className="inline-grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-perf-soft text-perf">
                    <Icon name={icon} size={21} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="flex items-center gap-1.5 font-bold text-ink">
                      {it.title}
                      {href && <Icon name="arrow" size={15} className="text-brand" />}
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-ink-soft">{it.desc}</p>
                  </div>
                </div>
              );
              return (
                <Reveal key={i} delay={(i % 2) * 60} as="div">
                  {href ? <Link href={href} className="block">{inner}</Link> : inner}
                </Reveal>
              );
            })}
          </div>
        </section>

        {/* 4 - What good looks like */}
        <section id="good" aria-labelledby="good-h" className="mt-12 scroll-mt-24">
          <Reveal>
            <SectionHead eyebrow={tr('whyCare.good.eyebrow')} title={tr('whyCare.good.title')} intro={tr('whyCare.good.intro')} id="good-h" />
          </Reveal>
          <Reveal className="mt-6">
            <div className="glass rounded-3xl p-5 sm:p-6">
              <ul className="grid gap-4 sm:grid-cols-2">
                {items('whyCare.good.items').map((it, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="mt-0.5 inline-grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-perf-soft text-perf">
                      <Icon name={GOOD[i] ?? 'check'} size={18} />
                    </span>
                    <div>
                      <h3 className="font-bold text-ink">{it.title}</h3>
                      <p className="mt-0.5 text-sm leading-relaxed text-ink-soft">{it.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <Link
                href="/methodology"
                className="mt-5 flex items-start gap-2.5 rounded-2xl bg-paper-soft p-4 text-sm text-ink-soft transition hover:text-brand"
              >
                <Icon name="info" size={17} className="mt-0.5 shrink-0 text-brand" />
                <span>{tr('whyCare.good.note')} <span className="font-semibold text-brand">{tr('nav.methodology')} →</span></span>
              </Link>
            </div>
          </Reveal>
        </section>

        {/* 5 - Start in five minutes */}
        <section id="start" aria-labelledby="start-h" className="mt-12 scroll-mt-24">
          <Reveal>
            <SectionHead eyebrow={tr('whyCare.start.eyebrow')} title={tr('whyCare.start.title')} intro={tr('whyCare.start.intro')} id="start-h" />
          </Reveal>
          <div className="mt-6 grid gap-3">
            {items('whyCare.start.items').map((it, i) => {
              const { icon, href } = START[i] ?? { icon: 'check' as IconName };
              const inner = (
                <div className={`flex items-start gap-3.5 rounded-2xl border border-line bg-white p-4 ${href ? 'pressable transition hover:border-brand/40 hover:shadow-soft' : ''}`}>
                  <span className="relative inline-grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-brand-soft text-brand">
                    <Icon name={icon} size={20} />
                    <span className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-ink text-[11px] font-bold text-paper">{i + 1}</span>
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="flex items-center gap-1.5 font-bold text-ink">
                      {it.title}
                      {href && <Icon name="arrow" size={15} className="text-brand" />}
                    </h3>
                    <p className="mt-0.5 text-sm leading-relaxed text-ink-soft">{it.desc}</p>
                  </div>
                </div>
              );
              return (
                <Reveal key={i} delay={(i % 3) * 50} as="div">
                  {href ? <Link href={href} className="block">{inner}</Link> : inner}
                </Reveal>
              );
            })}
          </div>
        </section>

        {/* Closing CTA */}
        <Reveal className="mt-12">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand to-brand-deep p-6 text-white shadow-glow sm:p-7">
            <h2 className="font-display text-xl font-extrabold">{tr('whyCare.closing.title')}</h2>
            <p className="mt-1.5 max-w-2xl text-sm text-white/85">{tr('whyCare.closing.desc')}</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href="/search"
                className="pressable inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-bold text-brand shadow-soft hover:bg-white/90"
              >
                <Icon name="search" size={15} /> {tr('whyCare.closing.findCta')}
              </Link>
              <Link
                href="/rights"
                className="pressable inline-flex items-center gap-1.5 rounded-full bg-white/15 px-4 py-2 text-sm font-bold text-white ring-1 ring-white/25 hover:bg-white/25"
              >
                <Icon name="scales" size={15} /> {tr('whyCare.closing.rightsCta')}
              </Link>
            </div>
            <p className="mt-4 flex items-center gap-1.5 text-xs text-white/70">
              <Icon name="shield" size={13} /> {tr('whyCare.closing.note')}
            </p>
          </div>
        </Reveal>

        <div className="mt-8">
          <AdSlot />
        </div>
      </div>
    </>
  );
}

function SectionHead({ eyebrow, title, intro, id }: { eyebrow: string; title: string; intro: string; id: string }) {
  return (
    <div className="max-w-2xl">
      <p className="text-[11px] font-bold uppercase tracking-wider text-ink-faint">{eyebrow}</p>
      <h2 id={id} className="mt-1 font-display text-2xl font-extrabold tracking-tight text-ink">{title}</h2>
      <p className="mt-2 text-ink-soft">{intro}</p>
    </div>
  );
}
