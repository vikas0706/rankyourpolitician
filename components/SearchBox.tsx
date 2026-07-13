'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n/provider';

interface Results {
  politicians: { id: string; name: string; party: string; area: string }[];
  constituencies: { id: string; name: string; state: string }[];
  districts: { href: string; district: string; state: string }[];
  states: { stateCode: string; state: string }[];
}

const EMPTY: Results = { politicians: [], constituencies: [], districts: [], states: [] };

export default function SearchBox({ variant = 'header' }: { variant?: 'header' | 'hero' }) {
  const { t } = useI18n();
  const router = useRouter();
  const [q, setQ] = useState('');
  const [res, setRes] = useState<Results>(EMPTY);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const runSearch = useCallback((value: string) => {
    if (value.trim().length < 1) {
      setRes(EMPTY);
      return;
    }
    fetch(`/api/search?q=${encodeURIComponent(value)}`)
      .then((r) => (r.ok ? r.json() : EMPTY))
      .then((d) => setRes({ ...EMPTY, ...d }))
      .catch(() => setRes(EMPTY));
  }, []);

  function onChange(value: string) {
    setQ(value);
    setOpen(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => runSearch(value), 180);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (q.trim()) {
      setOpen(false);
      router.push(`/search?q=${encodeURIComponent(q.trim())}`);
    }
  }

  const total =
    res.politicians.length + res.constituencies.length + res.districts.length + res.states.length;

  const box =
    variant === 'hero'
      ? 'w-full rounded-2xl border-2 border-brand/25 bg-white px-5 py-4 text-lg shadow-soft focus:border-brand'
      : 'w-full rounded-full border border-line bg-paper-soft px-4 py-2.5 text-sm focus:border-brand focus:bg-white';

  return (
    <div className="relative w-full" ref={ref}>
      <form onSubmit={submit} role="search">
        <label htmlFor={`search-${variant}`} className="sr-only">
          {t('search.placeholder')}
        </label>
        <div className="relative">
          <input
            id={`search-${variant}`}
            type="search"
            autoComplete="off"
            value={q}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => q && setOpen(true)}
            placeholder={t('search.placeholder')}
            className={`${box} pr-10 outline-none`}
          />
          <button
            type="submit"
            aria-label={t('search.button')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-faint hover:text-brand"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
              <path d="M21 21l-4.3-4.3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </form>

      {open && q.trim() && (
        <div className="absolute left-0 right-0 z-40 mt-2 max-h-96 overflow-auto rounded-2xl border border-line bg-white p-1.5 shadow-lift">
          {total === 0 ? (
            <p className="px-3 py-3 text-sm text-ink-faint">{t('search.noResults')}</p>
          ) : (
            <>
              <Group label={t('search.groups.politicians')} show={res.politicians.length > 0}>
                {res.politicians.map((p) => (
                  <Row key={p.id} href={`/person/${p.id}`} onNavigate={() => setOpen(false)}>
                    <span className="font-medium text-ink">{p.name}</span>
                    <span className="text-xs text-ink-faint">
                      {p.party} · {p.area}
                    </span>
                  </Row>
                ))}
              </Group>
              <Group label={t('search.groups.constituencies')} show={res.constituencies.length > 0}>
                {res.constituencies.map((c) => (
                  <Row key={c.id} href={`/area/${c.id}`} onNavigate={() => setOpen(false)}>
                    <span className="font-medium text-ink">{c.name}</span>
                    <span className="text-xs text-ink-faint">{c.state}</span>
                  </Row>
                ))}
              </Group>
              <Group label={t('search.groups.districts')} show={res.districts.length > 0}>
                {res.districts.map((d) => (
                  <Row key={d.href} href={d.href} onNavigate={() => setOpen(false)}>
                    <span className="font-medium text-ink">{d.district}</span>
                    <span className="text-xs text-ink-faint">{d.state}</span>
                  </Row>
                ))}
              </Group>
              <Group label={t('search.groups.states')} show={res.states.length > 0}>
                {res.states.map((s) => (
                  <Row key={s.stateCode} href={`/state/${s.stateCode}`} onNavigate={() => setOpen(false)}>
                    <span className="font-medium text-ink">{s.state}</span>
                  </Row>
                ))}
              </Group>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Group({ label, show, children }: { label: string; show: boolean; children: React.ReactNode }) {
  if (!show) return null;
  return (
    <div className="py-1">
      <p className="px-3 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
        {label}
      </p>
      {children}
    </div>
  );
}

function Row({ href, onNavigate, children }: { href: string; onNavigate: () => void; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className="flex flex-col gap-0.5 rounded px-3 py-1.5 hover:bg-brand-soft"
    >
      {children}
    </Link>
  );
}
