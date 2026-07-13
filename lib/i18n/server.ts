// Server-side locale resolution from the `lang` cookie. Used by the root layout
// and server components so the initial render is already in the chosen language.
import { cookies } from 'next/headers';
import { DEFAULT_LOCALE, normaliseLocale, LOCALE_MAP } from './locales';
import { loadMessages, type Dict } from './index';

export const LANG_COOKIE = 'lang';

export async function getLocale(): Promise<string> {
  try {
    const store = await cookies();
    return normaliseLocale(store.get(LANG_COOKIE)?.value);
  } catch {
    return DEFAULT_LOCALE;
  }
}

export async function getI18n(): Promise<{ locale: string; dict: Dict; dir: 'ltr' | 'rtl' }> {
  const locale = await getLocale();
  const dict = await loadMessages(locale);
  const dir = LOCALE_MAP[locale]?.dir ?? 'ltr';
  return { locale, dict, dir };
}
