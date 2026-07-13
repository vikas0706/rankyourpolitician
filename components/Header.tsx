'use client';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n/provider';
import SearchBox from './SearchBox';
import LanguageSwitcher from './LanguageSwitcher';
import Icon from './Icon';

export default function Header() {
  const { t } = useI18n();
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-paper-soft/90 backdrop-blur">
      <div className="mx-auto max-w-content px-4">
        <div className="flex h-16 items-center gap-3">
          <Link href="/" className="flex shrink-0 items-center gap-2" aria-label={t('brand.name')}>
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand text-white shadow-soft">
              <Icon name="parliament" size={20} />
            </span>
            <span className="hidden text-[15px] font-extrabold tracking-tight text-ink sm:inline">
              {t('brand.name')}
            </span>
          </Link>

          <div className="hidden flex-1 md:block">
            <SearchBox variant="header" />
          </div>

          <nav className="ml-auto flex items-center gap-1 text-sm font-medium" aria-label="Primary">
            <Link href="/india" className="hidden items-center gap-1.5 rounded-full px-3 py-2 text-ink-soft hover:bg-paper-sink md:flex">
              <Icon name="parliament" size={16} /> {t('nav.central')}
            </Link>
            <Link href="/who" className="hidden items-center gap-1.5 rounded-full px-3 py-2 text-ink-soft hover:bg-paper-sink lg:flex">
              <Icon name="info" size={16} /> {t('nav.accountability')}
            </Link>
            <Link href="/about" className="hidden rounded-full px-3 py-2 text-ink-soft hover:bg-paper-sink sm:inline">
              {t('nav.about')}
            </Link>
            <LanguageSwitcher />
          </nav>
        </div>

        <div className="pb-3 md:hidden">
          <SearchBox variant="header" />
        </div>
      </div>
    </header>
  );
}
