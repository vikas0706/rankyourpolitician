'use client';
import { useRef, useState } from 'react';
import Icon from '@/components/Icon';
import { useI18n } from '@/lib/i18n/provider';
import {
  personShareUrl,
  whatsappUrl,
  xUrl,
  facebookUrl,
  fetchCardFile,
  canShareFiles,
  nativeShare,
  downloadFile,
} from '@/lib/share';

// Recognisable monochrome brand glyphs - inlined, so the row pulls in no
// external icon/SDK payload.
const Glyphs = {
  whatsapp: (
    <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 004.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2zm5.8 14.03c-.24.68-1.42 1.32-1.95 1.36-.5.05-1.13.24-3.65-.77-3.07-1.21-5.03-4.34-5.18-4.54-.15-.2-1.24-1.65-1.24-3.15s.79-2.24 1.07-2.54c.28-.3.61-.38.81-.38.2 0 .4 0 .58.01.19.01.44-.07.68.52.24.59.83 2.04.9 2.19.07.15.12.32.02.52-.1.2-.15.32-.3.5-.15.17-.31.39-.44.52-.15.15-.3.31-.13.6.17.29.76 1.25 1.63 2.03 1.12 1 2.06 1.31 2.35 1.46.29.15.46.12.63-.07.17-.2.73-.85.92-1.14.19-.29.39-.24.65-.15.26.1 1.65.78 1.94.92.29.15.48.22.55.34.07.12.07.68-.17 1.36z" />
  ),
  x: <path d="M17.53 3H21l-7.19 8.21L22 21h-6.56l-5.14-6.72L4.4 21H1l7.69-8.79L2 3h6.72l4.64 6.14L17.53 3zm-1.15 16h1.83L7.7 4.9H5.74L16.38 19z" />,
  facebook: <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.9h2.54V9.85c0-2.51 1.49-3.9 3.78-3.9 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.44 2.9h-2.34V22c4.78-.76 8.44-4.92 8.44-9.94z" />,
  instagram: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="17.2" cy="6.8" r="1.3" fill="currentColor" />
    </>
  ),
};

function LogoBtn({ label, bg, onClick, glyph }: { label: string; bg: string; onClick: () => void; glyph: keyof typeof Glyphs }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="pressable flex h-9 w-9 items-center justify-center rounded-full text-white"
      style={{ background: bg }}
    >
      <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        {Glyphs[glyph]}
      </svg>
    </button>
  );
}

/** Subtle inline share affordance: just the platform logos, sharing directly
 *  (no modal). The generated card is fetched only when Instagram / native
 *  actually needs the image file, so profile pages stay light. */
export default function ShareRow({ id, name, kind = 'elected' }: { id: string; name: string; kind?: 'elected' | 'official' }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const fileRef = useRef<File | null>(null);

  const url = personShareUrl(id);
  // Officials are information-only and are never rated, so their caption must not
  // claim a rating (matches the card's own rateable branch + CLAUDE.md neutrality).
  const text = t(kind === 'official' ? 'profile.shareTextOfficial' : 'profile.shareText', { name });

  async function ensureFile(): Promise<File | null> {
    if (!fileRef.current) fileRef.current = await fetchCardFile(id, name);
    return fileRef.current;
  }
  function open(target: string) {
    window.open(target, '_blank', 'noopener,noreferrer');
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked - the logo buttons still work */
    }
  }
  // Instagram has no web intent: share the image via the native sheet where
  // possible (mobile), else save it so it can be posted.
  async function instagram() {
    const file = await ensureFile();
    if (file && canShareFiles() && (await nativeShare({ title: name, text, url, file }))) return;
    if (file) downloadFile(file);
    else open(url);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="mr-0.5 text-xs font-semibold text-ink-faint">{t('profile.shareLabel')}</span>
      <LogoBtn label={t('profile.shareWhatsapp')} glyph="whatsapp" bg="#25d366" onClick={() => open(whatsappUrl(text, url))} />
      <LogoBtn label={t('profile.shareX')} glyph="x" bg="#111111" onClick={() => open(xUrl(text, url))} />
      <LogoBtn label={t('profile.shareFacebook')} glyph="facebook" bg="#1877f2" onClick={() => open(facebookUrl(url))} />
      <LogoBtn label={t('profile.shareInstagram')} glyph="instagram" bg="linear-gradient(45deg,#f09433,#e6683c 25%,#dc2743 50%,#cc2366 75%,#bc1888)" onClick={instagram} />
      <button
        type="button"
        onClick={copy}
        aria-label={copied ? t('profile.shareCopied') : t('profile.shareCopyLink')}
        title={copied ? t('profile.shareCopied') : t('profile.shareCopyLink')}
        className="pressable flex h-9 w-9 items-center justify-center rounded-full border border-line bg-white/80 text-ink-soft hover:border-brand/40 hover:text-brand"
      >
        <Icon name={copied ? 'check' : 'link'} size={16} className={copied ? 'text-good dark:text-green-400' : ''} />
      </button>
      {/* Announce the copy result to assistive tech (a focused-button name swap
          is not reliably announced) - WCAG 4.1.3 Status Messages. */}
      <span role="status" aria-live="polite" className="sr-only">
        {copied ? t('profile.shareCopied') : ''}
      </span>
    </div>
  );
}
