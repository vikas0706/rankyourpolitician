'use client';
import { useState, useEffect, useRef } from 'react';
import Script from 'next/script';
import { useI18n } from '@/lib/i18n/provider';

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

interface Sentiment {
  mean: number | null;
  votes: number;
  distribution: Record<string, number>;
  confidence: string;
}

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
    };
  }
}

// A small, privacy-light device fingerprint used ONLY as a soft dedupe signal.
function deviceFingerprint(): string {
  try {
    const bits = [
      navigator.language,
      new Date().getTimezoneOffset(),
      screen.width + 'x' + screen.height,
      screen.colorDepth,
      navigator.hardwareConcurrency,
      navigator.platform,
    ].join('|');
    let h = 0;
    for (let i = 0; i < bits.length; i++) h = (h * 31 + bits.charCodeAt(i)) >>> 0;
    return h.toString(36);
  } catch {
    return 'na';
  }
}

export default function VoteWidget({
  politicianId,
  initial,
}: {
  politicianId: string;
  initial: Sentiment;
}) {
  const { t } = useI18n();
  const [sentiment, setSentiment] = useState<Sentiment>(initial);
  const [selected, setSelected] = useState<number | null>(null);
  const [status, setStatus] = useState<'idle' | 'submitting' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [token, setToken] = useState('');
  const fpRef = useRef('');
  const tsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fpRef.current = deviceFingerprint();
    try {
      const prev = localStorage.getItem(`vote:${politicianId}`);
      if (prev) setSelected(Number(prev));
    } catch {}
  }, [politicianId]);

  function renderTurnstile() {
    if (SITE_KEY && tsRef.current && window.turnstile) {
      window.turnstile.render(tsRef.current, {
        sitekey: SITE_KEY,
        callback: (tok: string) => setToken(tok),
        theme: 'light',
      });
    }
  }

  async function submit() {
    if (selected == null) return;
    if (SITE_KEY && !token) {
      setStatus('error');
      setMessage(t('vote.errorBot'));
      return;
    }
    setStatus('submitting');
    try {
      const res = await fetch('/api/vote', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          politicianId,
          rating: selected,
          fingerprint: fpRef.current,
          turnstileToken: token,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus('error');
        setMessage(
          data.error === 'rate-limited'
            ? t('vote.errorRate')
            : data.error === 'captcha'
              ? t('vote.errorBot')
              : t('vote.errorGeneric'),
        );
        return;
      }
      setSentiment(data.sentiment);
      setStatus('done');
      setMessage(data.updated ? t('vote.already') : t('vote.thanks'));
      try {
        localStorage.setItem(`vote:${politicianId}`, String(selected));
      } catch {}
    } catch {
      setStatus('error');
      setMessage(t('vote.errorGeneric'));
    }
  }

  const labels = [t('vote.scale1'), '', '', '', t('vote.scale5')];
  const confKey =
    'vote.confidence' + sentiment.confidence.charAt(0).toUpperCase() + sentiment.confidence.slice(1);

  return (
    <div>
      {SITE_KEY && (
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js"
          strategy="afterInteractive"
          onLoad={renderTurnstile}
        />
      )}

      <p className="text-sm text-ink-soft">{t('vote.prompt')}</p>

      <div className="mt-3 flex items-center gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setSelected(n)}
            aria-pressed={selected === n}
            aria-label={`${n} ${labels[n - 1] || ''}`.trim()}
            className={`grid h-10 w-10 place-items-center rounded-lg border text-sm font-semibold transition ${
              selected === n
                ? 'border-sentiment bg-sentiment/15 text-[#b5502e]'
                : 'border-line bg-white text-ink-soft hover:border-sentiment'
            }`}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-ink-faint" style={{ maxWidth: '17rem' }}>
        <span>{t('vote.scale1')}</span>
        <span>{t('vote.scale5')}</span>
      </div>

      {SITE_KEY && <div ref={tsRef} className="mt-3" />}

      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={submit}
          disabled={selected == null || status === 'submitting'}
          className="rounded-lg bg-sentiment px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {status === 'submitting' ? t('vote.submitting') : t('vote.submit')}
        </button>
        {message && (
          <span className={`text-sm ${status === 'error' ? 'text-red-600' : 'text-good'}`}>{message}</span>
        )}
      </div>

      <p className="mt-2 text-xs text-ink-faint">{t('vote.oncePerPerson')} · {t('vote.notVerifiedNote')}</p>

      {/* Distribution */}
      <div className="mt-4 border-t border-line pt-4">
        <div className="mb-2 flex items-center justify-between text-xs text-ink-faint">
          <span>{t('vote.distribution')}</span>
          <span>
            {t('vote.confidence')}: {t(confKey)}
          </span>
        </div>
        {sentiment.votes === 0 ? (
          <p className="text-sm text-ink-faint">{t('vote.confidenceNone')}</p>
        ) : (
          <div className="space-y-1">
            {[5, 4, 3, 2, 1].map((n) => {
              const c = sentiment.distribution[n] || 0;
              const pct = sentiment.votes ? Math.round((c / sentiment.votes) * 100) : 0;
              return (
                <div key={n} className="flex items-center gap-2 text-xs">
                  <span className="w-3 text-ink-faint">{n}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-paper-sink">
                    <div className="h-full rounded-full bg-sentiment" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-8 text-right text-ink-faint">{c}</span>
                </div>
              );
            })}
            <p className="pt-1 text-right text-xs text-ink-faint">
              {sentiment.mean != null && `${sentiment.mean.toFixed(1)}/5 · `}
              {t('ranking.votes', { n: sentiment.votes })}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
