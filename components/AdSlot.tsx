'use client';
import { useEffect, useRef } from 'react';

// A single, non-intrusive in-content ad. Renders ONLY when AdSense is
// configured; otherwise nothing in production (a faint placeholder in dev so
// you can see placement). Height is reserved via `.ad-reserve` to keep CLS ~0.
const CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
const SLOT = process.env.NEXT_PUBLIC_ADSENSE_SLOT;

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

export default function AdSlot({ className = '' }: { className?: string }) {
  const pushed = useRef(false);
  useEffect(() => {
    if (CLIENT && SLOT && !pushed.current) {
      pushed.current = true;
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch {}
    }
  }, []);

  if (!CLIENT || !SLOT) {
    if (process.env.NODE_ENV === 'production') return null;
    return (
      <div className={`ad-reserve grid place-items-center rounded-lg border border-dashed border-line text-xs text-ink-faint ${className}`}>
        Ad space (disabled until AdSense is configured)
      </div>
    );
  }

  return (
    <div className={`ad-reserve ${className}`} aria-hidden="true">
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={CLIENT}
        data-ad-slot={SLOT}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
