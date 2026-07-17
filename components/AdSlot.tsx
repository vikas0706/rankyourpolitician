'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

// A single, non-intrusive in-content ad unit. The AdSense loader is installed
// site-wide in app/layout.tsx, but Auto ads are intentionally NOT requested -
// ads appear only at these explicit `<AdSlot>` positions, each carrying an
// "ad below" notice. This renders a responsive display unit when a slot id is
// available (per-placement `slot` prop, else NEXT_PUBLIC_ADSENSE_SLOT). Height
// is reserved via `.ad-reserve` to keep layout shift ~0.
const CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT || 'ca-pub-6343301891816750';
const DEFAULT_SLOT = process.env.NEXT_PUBLIC_ADSENSE_SLOT;

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

// Shown just above each ad. Keeps the reader informed - why the ad is here and
// that the site itself takes nothing from them - without any urgency or dark
// pattern. Wording is truthful: the site runs no trackers of its own (see the
// Privacy Policy), though the ad is served by Google. The collapsed "How ads
// work" explainer carries the honest detail without cluttering the line.
function AdNotice() {
  return (
    <div className="mb-1.5 text-xs leading-snug text-ink-faint">
      <p>
        Sorry for the ad below - it helps cover the cost of keeping this site
        free to run. We do not track you or sell your data.
      </p>
      <details className="mt-1">
        <summary className="cursor-pointer select-none underline decoration-dotted underline-offset-2">
          How ads work
        </summary>
        <p className="mt-1">
          The ad is served by Google AdSense, not by us. Google may set its own
          cookies to show and measure ads; we never receive that data or link it
          to your ratings. You can turn off ad personalisation in your Google
          settings. More detail is in our{' '}
          <Link href="/privacy" className="underline">Privacy Policy</Link>.
        </p>
      </details>
    </div>
  );
}

export default function AdSlot({ className = '', slot }: { className?: string; slot?: string }) {
  const adSlot = slot || DEFAULT_SLOT;
  const insRef = useRef<HTMLModElement | null>(null);
  const pushed = useRef(false);
  // Only surface the apology once Google actually fills the slot. AdSense sets
  // data-ad-status="filled" / "unfilled" on the <ins>; an unfilled unit
  // collapses, so an apology over empty space would make no sense.
  const [filled, setFilled] = useState(false);

  useEffect(() => {
    if (!(CLIENT && adSlot)) return;
    if (!pushed.current) {
      pushed.current = true;
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch {}
    }
    const el = insRef.current;
    if (!el) return;
    const check = () => {
      if (el.getAttribute('data-ad-status') === 'filled') setFilled(true);
    };
    check();
    const obs = new MutationObserver(check);
    obs.observe(el, { attributes: true, attributeFilter: ['data-ad-status'] });
    return () => obs.disconnect();
  }, [adSlot]);

  // No explicit slot → nothing here (Auto ads still place ads elsewhere via the
  // site-wide loader). Dev shows a placeholder so placement is visible.
  if (!CLIENT || !adSlot) {
    if (process.env.NODE_ENV === 'production') return null;
    return (
      <div className={className}>
        <AdNotice />
        <div className="ad-reserve grid place-items-center rounded-lg border border-dashed border-line text-xs text-ink-faint">
          Ad space · set NEXT_PUBLIC_ADSENSE_SLOT (or pass slot) for a manual unit
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {filled && <AdNotice />}
      <div className="ad-reserve" aria-hidden="true">
        <ins
          ref={insRef}
          className="adsbygoogle"
          style={{ display: 'block' }}
          data-ad-client={CLIENT}
          data-ad-slot={adSlot}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      </div>
    </div>
  );
}
