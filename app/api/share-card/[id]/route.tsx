/* Shareable Open Graph card for a person: who they are (photo, name, seat) with
 * their public rating - and their contact - shown BLURRED, legible only inside
 * the site. A shared card teases the score and pulls the reader to the profile.
 *
 * Speed / cost (see CLAUDE.md "How data flows"):
 * - Built ONLY from the committed seed via getPerson. The blurred panels are
 *   decorative, so this route reads NO live vote data and never varies with
 *   votes - immutable per person per deploy.
 * - Off the page render path entirely: referenced by the profile's og:image
 *   meta (link-unfurl bots) and lazily by the share buttons. The long
 *   Cache-Control makes it a CDN hit after the first render.
 */
import { ImageResponse } from 'next/og';
import { getPerson } from '@/lib/data';
import { initials, avatarTint } from '@/lib/format';

export const runtime = 'nodejs';

const WIDTH = 1200;
const HEIGHT = 630;

// Site palette (globals.css tokens resolved to hex - satori needs literals).
const C = {
  ink: '#1c202a',
  inkSoft: '#4a5160',
  inkFaint: '#7c8496',
  line: '#e8e4dc',
  brand: '#4f46e5',
  brandInk: '#3730a3',
  brandSoft: '#eef1ff',
  ratingInk: '#b45309',
  ratingSoft: '#fef4e2',
  amber: '#f59e0b',
  paperSoft: '#f8f7f4',
  paperSink: '#f0eee8',
};

// Manrope (the site font) fetched once per warm instance, module-cached; on any
// failure the card still renders in satori's default font. Woff (satori
// supports ttf/otf/woff, not woff2). Server fetch - browser CSP does not apply.
type FontSpec = { name: string; data: ArrayBuffer; weight: 400 | 700 | 800; style: 'normal' };
let fontsPromise: Promise<FontSpec[] | null> | null = null;
function loadFonts(): Promise<FontSpec[] | null> {
  if (!fontsPromise) {
    fontsPromise = (async () => {
      const base = 'https://cdn.jsdelivr.net/npm/@fontsource/manrope@5/files';
      const specs: { weight: 400 | 700 | 800; file: string }[] = [
        { weight: 400, file: 'manrope-latin-400-normal.woff' },
        { weight: 700, file: 'manrope-latin-700-normal.woff' },
        { weight: 800, file: 'manrope-latin-800-normal.woff' },
      ];
      try {
        return await Promise.all(
          specs.map(async (s) => {
            const res = await fetch(`${base}/${s.file}`);
            if (!res.ok) throw new Error(`font ${s.file} ${res.status}`);
            return { name: 'Manrope', data: await res.arrayBuffer(), weight: s.weight, style: 'normal' as const };
          }),
        );
      } catch {
        return null;
      }
    })();
  }
  return fontsPromise;
}

function Star({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="rgba(245,158,11,0.18)" stroke={C.amber} strokeWidth={1.6} strokeLinejoin="round">
      <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 17l-5.2 2.7 1-5.8L3.5 9.7l5.9-.9L12 3.5z" />
    </svg>
  );
}

function Lock({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={C.inkFaint} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
      <path d="M8 10.5V7.5a4 4 0 018 0v3" />
    </svg>
  );
}

async function fetchPhoto(url?: string): Promise<string | null> {
  if (!url) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 2500);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { 'user-agent': 'RankYourPolitician-ShareCard/1.0' } });
    if (!res.ok) return null;
    const type = res.headers.get('content-type') || 'image/jpeg';
    if (!type.startsWith('image/')) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length === 0 || buf.length > 5_000_000) return null;
    return `data:${type};base64,${buf.toString('base64')}`;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function Wordmark() {
  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <div style={{ display: 'flex', width: 44, height: 44, borderRadius: 13, background: C.brand, alignItems: 'center', justifyContent: 'center' }}>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="#ffffff">
          <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 17l-5.2 2.7 1-5.8L3.5 9.7l5.9-.9L12 3.5z" />
        </svg>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 13 }}>
        <div style={{ display: 'flex', fontSize: 27, fontWeight: 800, color: C.ink, letterSpacing: -0.5, lineHeight: 1.1 }}>RankYourPolitician</div>
        <div style={{ display: 'flex', fontSize: 16, color: C.inkFaint, marginTop: 2 }}>Know your representatives · non-partisan</div>
      </div>
    </div>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        width: WIDTH,
        height: HEIGHT,
        display: 'flex',
        flexDirection: 'column',
        padding: 54,
        background: 'linear-gradient(140deg, #ffffff 0%, #f7f6ff 58%, #eef1ff 100%)',
        color: C.ink,
        fontFamily: 'Manrope, sans-serif',
      }}
    >
      {children}
    </div>
  );
}

// A small "locked" tease: a quiet label over a blurred value + a lock. Used for
// the rating and the contact - both real on the site, obscured in the share.
function LockedChip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', padding: '15px 20px', borderRadius: 18, background: 'rgba(255,255,255,0.9)', border: `1px solid ${C.line}` }}>
      <div style={{ display: 'flex', fontSize: 14, fontWeight: 800, letterSpacing: 1.4, color: C.inkFaint }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', marginTop: 9, height: 44 }}>{children}</div>
    </div>
  );
}

const IMAGE_HEADERS = {
  'cache-control': 'public, max-age=3600, s-maxage=604800, stale-while-revalidate=604800',
};

async function render(el: React.ReactElement) {
  const fonts = await loadFonts();
  return new ImageResponse(el, { width: WIDTH, height: HEIGHT, headers: IMAGE_HEADERS, ...(fonts ? { fonts } : {}) });
}

function fallbackCard() {
  return (
    <Frame>
      <Wordmark />
      <div style={{ display: 'flex', flexDirection: 'column', margin: 'auto 0', maxWidth: 940 }}>
        <div style={{ display: 'flex', fontSize: 60, fontWeight: 800, color: C.ink, letterSpacing: -1 }}>Know your representatives.</div>
        <div style={{ display: 'flex', marginTop: 12, fontSize: 28, color: C.inkSoft }}>Their record and responsibilities - so you can take real action.</div>
      </div>
      <div style={{ display: 'flex', fontSize: 25, fontWeight: 800, color: C.brandInk }}>rankyourpolitician.com</div>
    </Frame>
  );
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let person;
  try {
    person = (await getPerson(id))?.person;
  } catch {
    person = undefined;
  }
  if (!person) return render(fallbackCard());

  const photo = await fetchPhoto(person.photo_url);
  const seat = [person.constituency, person.state].filter(Boolean).join(', ');
  const rateable = person.kind !== 'official';
  const name = person.name.length > 34 ? person.name.slice(0, 33).trimEnd() + '…' : person.name;
  const party = person.party ? (person.party.length > 30 ? person.party.slice(0, 28).trimEnd() + '…' : person.party) : null;
  const rawContact =
    person.contact?.emails?.[0] || person.contact?.phones?.[0] || person.office_email || person.office_phone || '';
  const contact = rawContact ? (rawContact.length > 20 ? rawContact.slice(0, 20) : rawContact) : '';

  return render(
    <Frame>
      <Wordmark />

      {/* identity */}
      <div style={{ display: 'flex', alignItems: 'center', marginTop: 40, flex: 1 }}>
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} width={148} height={148} style={{ width: 148, height: 148, borderRadius: 28, objectFit: 'cover', border: '4px solid #ffffff', boxShadow: '0 10px 26px rgba(28,32,42,0.16)' }} alt="" />
        ) : (
          <div style={{ display: 'flex', width: 148, height: 148, borderRadius: 28, background: avatarTint(person.name), alignItems: 'center', justifyContent: 'center', color: '#ffffff', fontSize: 58, fontWeight: 800, border: '4px solid #ffffff', boxShadow: '0 10px 26px rgba(28,32,42,0.16)' }}>
            {initials(person.name)}
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 30, flex: 1 }}>
          {party ? (
            <div style={{ display: 'flex', alignSelf: 'flex-start', padding: '5px 14px', borderRadius: 999, background: C.paperSink, fontSize: 20, fontWeight: 700, color: C.inkSoft }}>{party}</div>
          ) : null}
          <div style={{ display: 'flex', marginTop: 10, fontSize: 56, fontWeight: 800, color: C.ink, letterSpacing: -1.5, lineHeight: 1.02 }}>{name}</div>
          {seat ? (
            <div style={{ display: 'flex', alignItems: 'center', marginTop: 10, fontSize: 25, color: C.inkSoft }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.brand} strokeWidth={2} strokeLinejoin="round" style={{ marginRight: 7 }}>
                <path d="M12 21s7-6.3 7-11a7 7 0 10-14 0c0 4.7 7 11 7 11z" />
                <circle cx="12" cy="10" r="2.5" />
              </svg>
              {seat.length > 46 ? seat.slice(0, 44).trimEnd() + '…' : seat}
            </div>
          ) : null}
        </div>
      </div>

      {/* locked teases: rating + contact, both blurred */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {rateable ? (
          <div style={{ display: 'flex', marginRight: 16 }}>
            <LockedChip label="PUBLIC RATING">
              <div style={{ display: 'flex', fontSize: 40, fontWeight: 800, color: C.ratingInk, filter: 'blur(7px)' }}>4.3</div>
              <div style={{ display: 'flex', marginLeft: 16 }}><Star /><Star /><Star /><Star /><Star /></div>
              <div style={{ display: 'flex', marginLeft: 16 }}><Lock /></div>
            </LockedChip>
          </div>
        ) : null}
        {contact ? (
          <div style={{ display: 'flex' }}>
            <LockedChip label="CONTACT">
              <div style={{ display: 'flex', fontSize: 30, fontWeight: 700, color: C.inkSoft, filter: 'blur(6px)' }}>{contact}</div>
              <div style={{ display: 'flex', marginLeft: 16 }}><Lock /></div>
            </LockedChip>
          </div>
        ) : null}
      </div>

      {/* footer: the hook + reveal CTA */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 30, paddingTop: 22, borderTop: `1px solid ${C.line}` }}>
        <div style={{ display: 'flex', fontSize: 23, fontWeight: 700, color: C.ink }}>
          {rateable ? 'I rated them - now you rate them too.' : 'See who this office answers to.'}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', fontSize: 24, fontWeight: 800, color: C.brandInk }}>
          rankyourpolitician.com
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={C.brandInk} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 8 }}>
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </div>
      </div>
    </Frame>,
  );
}
