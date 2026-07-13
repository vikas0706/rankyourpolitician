'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LOCALES } from '@/lib/i18n/locales';
import { useI18n } from '@/lib/i18n/provider';

const ONE_YEAR = 60 * 60 * 24 * 365;

export default function LanguageSwitcher() {
  const { locale, t } = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  function choose(code: string) {
    document.cookie = `lang=${code}; path=/; max-age=${ONE_YEAR}; samesite=lax`;
    try {
      localStorage.setItem('lang', code);
    } catch {}
    setOpen(false);
    // Re-render server components (layout + pages) in the new locale.
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
        className="flex items-center gap-1.5 rounded-md border border-line bg-white px-2.5 py-1.5 text-sm text-ink-soft hover:bg-paper-sink"
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
      </button>
      {open && (
        <ul
          role="listbox"
          className="absolute right-0 z-40 mt-1 max-h-80 w-56 overflow-auto rounded-lg border border-line bg-white p-1 shadow-lg"
        >
          {LOCALES.map((l) => (
            <li key={l.code}>
              <button
                type="button"
                role="option"
                aria-selected={l.code === locale}
                onClick={() => choose(l.code)}
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
      )}
    </div>
  );
}
