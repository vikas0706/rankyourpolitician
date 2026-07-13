'use client';
// Client i18n context. The server passes the already-merged dict + locale, so
// client components translate without bundling every locale.
import { createContext, useContext, useCallback } from 'react';
import { t as tt, tArr as ttArr, type Dict } from './index';

interface I18nCtx {
  locale: string;
  dict: Dict;
  dir: 'ltr' | 'rtl';
}

const Ctx = createContext<I18nCtx>({ locale: 'en', dict: {}, dir: 'ltr' });

export function I18nProvider({
  locale,
  dict,
  dir,
  children,
}: I18nCtx & { children: React.ReactNode }) {
  return <Ctx.Provider value={{ locale, dict, dir }}>{children}</Ctx.Provider>;
}

export function useI18n() {
  const { locale, dict, dir } = useContext(Ctx);
  const t = useCallback(
    (path: string, vars?: Record<string, string | number>) => tt(dict, path, vars),
    [dict],
  );
  const tArr = useCallback(
    (path: string, vars?: Record<string, string | number>) => ttArr(dict, path, vars),
    [dict],
  );
  return { locale, dir, t, tArr };
}
