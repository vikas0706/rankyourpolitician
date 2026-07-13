import './globals.css';
import type { Metadata } from 'next';
import { getI18n } from '@/lib/i18n/server';
import { I18nProvider } from '@/lib/i18n/provider';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

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
    <html lang={locale} dir={dir} data-scroll-behavior="smooth">
      <body className="min-h-screen flex flex-col">
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
        </I18nProvider>
      </body>
    </html>
  );
}
