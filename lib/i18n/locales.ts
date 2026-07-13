// The 22 languages of the Eighth Schedule of the Constitution of India, plus
// English (associate official, and our default). `native` is the endonym shown
// in the language switcher so speakers recognise their own language.
export interface Locale {
  code: string;
  english: string;
  native: string;
  dir?: 'ltr' | 'rtl';
}

export const DEFAULT_LOCALE = 'en';

export const LOCALES: Locale[] = [
  { code: 'en', english: 'English', native: 'English' },
  { code: 'hi', english: 'Hindi', native: 'हिन्दी' },
  { code: 'bn', english: 'Bengali', native: 'বাংলা' },
  { code: 'te', english: 'Telugu', native: 'తెలుగు' },
  { code: 'mr', english: 'Marathi', native: 'मराठी' },
  { code: 'ta', english: 'Tamil', native: 'தமிழ்' },
  { code: 'ur', english: 'Urdu', native: 'اردو', dir: 'rtl' },
  { code: 'gu', english: 'Gujarati', native: 'ગુજરાતી' },
  { code: 'kn', english: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'ml', english: 'Malayalam', native: 'മലയാളം' },
  { code: 'or', english: 'Odia', native: 'ଓଡ଼ିଆ' },
  { code: 'pa', english: 'Punjabi', native: 'ਪੰਜਾਬੀ' },
  { code: 'as', english: 'Assamese', native: 'অসমীয়া' },
  { code: 'mai', english: 'Maithili', native: 'मैथिली' },
  { code: 'sat', english: 'Santali', native: 'ᱥᱟᱱᱛᱟᱲᱤ' },
  { code: 'ks', english: 'Kashmiri', native: 'کٲشُر', dir: 'rtl' },
  { code: 'ne', english: 'Nepali', native: 'नेपाली' },
  { code: 'kok', english: 'Konkani', native: 'कोंकणी' },
  { code: 'sd', english: 'Sindhi', native: 'سنڌي', dir: 'rtl' },
  { code: 'doi', english: 'Dogri', native: 'डोगरी' },
  { code: 'mni', english: 'Manipuri (Meitei)', native: 'ꯃꯦꯏꯇꯦꯏ ꯂꯣꯟ' },
  { code: 'brx', english: 'Bodo', native: 'बड़ो' },
  { code: 'sa', english: 'Sanskrit', native: 'संस्कृतम्' },
];

export const LOCALE_CODES = LOCALES.map((l) => l.code);
export const LOCALE_MAP: Record<string, Locale> = Object.fromEntries(
  LOCALES.map((l) => [l.code, l]),
);

export function isRtl(code: string): boolean {
  return LOCALE_MAP[code]?.dir === 'rtl';
}

export function normaliseLocale(code: string | undefined | null): string {
  if (!code) return DEFAULT_LOCALE;
  const c = code.toLowerCase();
  return LOCALE_MAP[c] ? c : DEFAULT_LOCALE;
}
