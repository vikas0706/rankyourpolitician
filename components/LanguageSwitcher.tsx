'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { clsx } from 'clsx';
import { LOCALES } from '@/lib/i18n/locales';
import { useI18n } from '@/lib/i18n/provider';

const ONE_YEAR = 60 * 60 * 24 * 365;

/** Persist the choice and re-render server components in the new locale.
 *  Shared by the header switcher and the home-page hint strip. */
function applyLocale(code: string) {
  document.cookie = `lang=${code}; path=/; max-age=${ONE_YEAR}; samesite=lax`;
  try {
    localStorage.setItem('lang', code);
  } catch {}
}

/** Close-on-outside-click for a popover. */
function useOutsideClose(onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return ref;
}

function LocaleListbox({ locale, onChoose }: { locale: string; onChoose: (code: string) => void }) {
  return (
    <ul
      role="listbox"
      className="glass-overlay absolute right-0 z-40 mt-1.5 max-h-80 w-56 origin-top-right animate-scale-in overflow-auto rounded-2xl p-1"
    >
      {LOCALES.map((l) => (
        <li key={l.code}>
          <button
            type="button"
            role="option"
            aria-selected={l.code === locale}
            onClick={() => onChoose(l.code)}
            dir={l.dir ?? 'ltr'}
            className={`flex w-full items-center justify-between gap-2 rounded px-2.5 py-1.5 text-left text-sm hover:bg-brand-soft ${
              l.code === locale ? 'bg-brand-soft font-semibold text-brand-ink' : 'text-ink-soft'
            }`}
          >
            <span>{l.native}</span>
            <span className="text-xs text-ink-faint">{l.english}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

export default function LanguageSwitcher() {
  const { locale, t } = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useOutsideClose(() => setOpen(false));

  function choose(code: string) {
    applyLocale(code);
    setOpen(false);
    router.refresh();
  }

  const current = LOCALES.find((l) => l.code === locale) ?? LOCALES[0];

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t('nav.language')}
        className="pressable flex items-center gap-1.5 rounded-full border border-line bg-white/90 px-3 py-1.5 text-sm text-ink-soft backdrop-blur hover:bg-paper-sink"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M12 21a9 9 0 100-18 9 9 0 000 18zM3 12h18M12 3c2.5 2.5 3.5 6 3.5 9S14.5 18.5 12 21c-2.5-2.5-3.5-6-3.5-9S9.5 5.5 12 3z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
        <span className="hidden sm:inline">{current.native}</span>
        <span className="sm:hidden">{current.code.toUpperCase()}</span>
        {/* The quiet discoverability cue: the button always says how many
            OTHER languages are behind it, not just the current one. */}
        <span className="rounded-full bg-brand-soft px-1.5 py-px text-[10px] font-bold tabular-nums text-brand-ink">
          +{LOCALES.length - 1}
        </span>
      </button>
      {open && <LocaleListbox locale={locale} onChoose={choose} />}
    </div>
  );
}

/**
 * Home-hero hint strip: one muted line that says HOW MANY languages the site
 * speaks and shows a few native scripts as one-tap switches (a reader spots
 * their own script faster than any English label). The "+N" chip opens the
 * full picker. Deliberately not a modal/interstitial - discovery without
 * landing friction.
 */
export function LanguageHint({ className }: { className?: string }) {
  const { locale, t } = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useOutsideClose(() => setOpen(false));

  function choose(code: string) {
    applyLocale(code);
    setOpen(false);
    router.refresh();
  }

  // LOCALES is ordered by speaker count (after English), so the first five
  // that aren't the current locale are the most widely recognised scripts.
  const featured = LOCALES.filter((l) => l.code !== locale).slice(0, 5);
  const rest = LOCALES.length - 1 - featured.length;

  return (
    <div className={clsx('flex flex-wrap items-center gap-x-2 gap-y-1.5 text-sm', className)}>
      <span className="flex items-center gap-1.5 text-ink-faint">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M12 21a9 9 0 100-18 9 9 0 000 18zM3 12h18M12 3c2.5 2.5 3.5 6 3.5 9S14.5 18.5 12 21c-2.5-2.5-3.5-6-3.5-9S9.5 5.5 12 3z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
        {t('home.langHint', { n: LOCALES.length })}
      </span>
      {featured.map((l) => (
        <button
          key={l.code}
          type="button"
          onClick={() => choose(l.code)}
          dir={l.dir ?? 'ltr'}
          lang={l.code}
          className="pressable rounded-full border border-line bg-white/70 px-2.5 py-0.5 text-sm text-ink-soft backdrop-blur hover:border-brand/40 hover:text-brand"
        >
          {l.native}
        </button>
      ))}
      <span className="relative" ref={ref}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={t('nav.language')}
          className="pressable rounded-full border border-line bg-white/70 px-2.5 py-0.5 text-sm font-semibold text-ink-soft backdrop-blur hover:border-brand/40 hover:text-brand"
        >
          {t('home.langMore', { n: rest })}
        </button>
        {open && <LocaleListbox locale={locale} onChoose={choose} />}
      </span>
    </div>
  );
}
