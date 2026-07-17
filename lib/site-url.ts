// The site's own origin. It stamps the canonical + Open Graph URLs on every page
// (app/[lang]/layout.tsx), every entry in the sitemap (app/sitemap.ts), and the
// sitemap pointer in robots.ts. Canonical/OG tags and sitemaps have to be absolute
// URLs, so this must always be a full origin, never a relative path.
//
// NEXT_PUBLIC_* is inlined at BUILD time: setting NEXT_PUBLIC_SITE_URL in Vercel
// only takes effect on the next redeploy (see the CLAUDE.md gotchas). The fallback
// below is therefore what actually ships whenever the var is unset, so it has to be
// correct on its own. A build that forgot the var once already stamped
// http://localhost:3000 as the canonical/og:url across every page - which breaks the
// WhatsApp/X/Instagram link-share preview (the site's main growth channel) and
// confuses crawlers about the real host. Hence the fallback is environment-aware:
// any Vercel build gets the real canonical www host (never localhost), and only a
// genuine local build (no VERCEL env) falls back to localhost for dev convenience.
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL ? 'https://www.rankyourpolitician.com' : 'http://localhost:3000');

// The env var is still the intended source of truth (it lets preview/staging deploys
// point at their own host). A Vercel build that falls through to the hard-coded value
// works fine, but log it so an unset var is visible in the build output.
if (process.env.VERCEL && !process.env.NEXT_PUBLIC_SITE_URL) {
  console.warn(`⚠ NEXT_PUBLIC_SITE_URL is not set - using fallback ${SITE_URL} for canonicals/OG/sitemap.`);
}
