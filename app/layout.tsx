import './globals.css';
import type { Metadata } from 'next';
import { Manrope } from 'next/font/google';
import { getI18n } from '@/lib/i18n/server';
import { I18nProvider } from '@/lib/i18n/provider';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import MobileTabBar from '@/components/MobileTabBar';

// Self-hosted at build time by next/font — no runtime request to Google.
// Indic scripts (Devanagari, Tamil, Bengali, …) fall back to the Noto Sans
// system stack declared after the variable in globals.css/tailwind config.
const manrope = Manrope({
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  variable: '--font-manrope',
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'RankYourPolitician — Know your representatives',
    template: '%s · RankYourPolitician',
  },
  description:
    'A non-partisan, source-cited guide to Indian representatives: who represents your area, what they are responsible for, and how they are performing.',
  openGraph: {
    title: 'RankYourPolitician',
    description: 'Know your representatives. Hold them accountable.',
    url: SITE_URL,
    siteName: 'RankYourPolitician',
    type: 'website',
  },
  robots: { index: true, follow: true },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { locale, dict, dir } = await getI18n();
  return (
    <html lang={locale} dir={dir} data-scroll-behavior="smooth" className={manrope.variable}>
      <body
        className="flex min-h-screen flex-col"
        style={{
          // Manrope first for Latin; Noto Sans keeps every Indic script crisp.
          ['--font-sans' as string]:
            "var(--font-manrope), 'Segoe UI', system-ui, -apple-system, 'Noto Sans', 'Noto Sans Devanagari', 'Noto Sans Tamil', 'Noto Sans Bengali', sans-serif",
        }}
      >
        <div className="aurora" aria-hidden="true" />
        <I18nProvider locale={locale} dict={dict} dir={dir}>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-2 focus:rounded focus:bg-brand focus:px-3 focus:py-2 focus:text-white"
          >
            Skip to content
          </a>
          <Header />
          <main id="main" className="flex-1">
            {children}
          </main>
          <Footer />
          <MobileTabBar />
        </I18nProvider>
      </body>
    </html>
  );
}
