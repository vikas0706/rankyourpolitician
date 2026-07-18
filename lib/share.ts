// Share plumbing shared by the client share sheet. Pure URL builders here stay
// framework-free; the navigator.* helpers are guarded so they no-op on the
// server. No SDKs, no third-party beacons - every "share" is a plain intent URL
// (a user-initiated navigation) or the native Web Share API. See CLAUDE.md.

/** Absolute, locale-less canonical URL for a person profile. Share the clean
 *  URL so the recipient's own language cookie applies (a /{locale}/ prefix
 *  would force the sharer's language and is robots-blocked). */
export function personShareUrl(id: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/person/${id}`;
}

export function shareCardUrl(id: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/api/share-card/${encodeURIComponent(id)}`;
}

/** Web-intent URLs. Each opens the platform's own composer/unfurl - the shared
 *  page URL carries the og:image, so WhatsApp/X/Facebook show the blurred card. */
export function whatsappUrl(text: string, url: string): string {
  return `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`;
}
export function xUrl(text: string, url: string): string {
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
}
export function facebookUrl(url: string): string {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
}

/** Can the browser share actual files (Web Share Level 2)? This is the path
 *  that puts Instagram / Stories in the native sheet on mobile. */
export function canShareFiles(): boolean {
  try {
    return (
      typeof navigator !== 'undefined' &&
      typeof navigator.canShare === 'function' &&
      // A tiny probe file - canShare validates the payload shape, not this file.
      navigator.canShare({ files: [new File([new Blob()], 'p.png', { type: 'image/png' })] })
    );
  } catch {
    return false;
  }
}

/** Fetch the generated card as a File for the native share sheet / download. */
export async function fetchCardFile(id: string, name: string): Promise<File | null> {
  try {
    const res = await fetch(shareCardUrl(id));
    if (!res.ok) return null;
    const blob = await res.blob();
    const safe = name.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'leader';
    return new File([blob], `rankyourpolitician-${safe}.png`, { type: 'image/png' });
  } catch {
    return null;
  }
}

/** Native share with the image file attached; falls back to link-only share.
 *  Returns false only when the API is unavailable (never for user-cancel). */
export async function nativeShare(opts: { title: string; text: string; url: string; file?: File | null }): Promise<boolean> {
  const nav = typeof navigator !== 'undefined' ? navigator : undefined;
  if (!nav || typeof nav.share !== 'function') return false;
  try {
    if (opts.file && typeof nav.canShare === 'function' && nav.canShare({ files: [opts.file] })) {
      // When an image FILE is attached, many targets (WhatsApp, Instagram) drop
      // the separate `url` field and keep only the caption - so fold the link
      // into the text, otherwise the recipient gets the picture but no way back
      // to the site. Pass url too for targets that do use it.
      await nav.share({ title: opts.title, text: `${opts.text} ${opts.url}`, url: opts.url, files: [opts.file] });
    } else {
      await nav.share({ title: opts.title, text: opts.text, url: opts.url });
    }
    return true;
  } catch (err) {
    // AbortError = user dismissed the sheet: treat as handled, not a failure.
    if (err instanceof Error && err.name === 'AbortError') return true;
    return false;
  }
}

/** Trigger a browser download of a File (Instagram / desktop path). */
export function downloadFile(file: File) {
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoke on the next tick so the click has committed the navigation.
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
