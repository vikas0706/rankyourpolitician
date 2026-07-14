'use client';
import { useEffect, useRef } from 'react';

// A single, non-intrusive in-content ad unit. The AdSense loader is installed
// site-wide in app/layout.tsx, so with Auto ads enabled in the AdSense console
// Google can already place ads. This renders an explicit responsive display
// unit at each `<AdSlot>` position when a slot id is available (per-placement
// `slot` prop, else NEXT_PUBLIC_ADSENSE_SLOT). Height is reserved via
// `.ad-reserve` to keep layout shift ~0.
const CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT || 'ca-pub-6343301891816750';
const DEFAULT_SLOT = process.env.NEXT_PUBLIC_ADSENSE_SLOT;

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

export default function AdSlot({ className = '', slot }: { className?: string; slot?: string }) {
  const adSlot = slot || DEFAULT_SLOT;
  const pushed = useRef(false);
  useEffect(() => {
    if (CLIENT && adSlot && !pushed.current) {
      pushed.current = true;
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch {}
    }
  }, [adSlot]);

  // No explicit slot → nothing here (Auto ads still place ads elsewhere via the
  // site-wide loader). Dev shows a placeholder so placement is visible.
  if (!CLIENT || !adSlot) {
    if (process.env.NODE_ENV === 'production') return null;
    return (
      <div className={`ad-reserve grid place-items-center rounded-lg border border-dashed border-line text-xs text-ink-faint ${className}`}>
        Ad space · set NEXT_PUBLIC_ADSENSE_SLOT (or pass slot) for a manual unit
      </div>
    );
  }

  return (
    <div className={`ad-reserve ${className}`} aria-hidden="true">
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={CLIENT}
        data-ad-slot={adSlot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
