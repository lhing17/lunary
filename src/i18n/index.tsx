import React, { createContext, useContext, useMemo, useState } from 'react';
import componentsZh from '../components/locales/zh';
import componentsEn from '../components/locales/en';
import pagesZh from '../pages/locales/zh';
import pagesEn from '../pages/locales/en';

type Lang = 'zh-CN' | 'en-US';
type Dict = Record<string, any>;

const dicts: Record<Lang, Dict> = {
  'zh-CN': { components: componentsZh, pages: pagesZh },
  'en-US': { components: componentsEn, pages: pagesEn },
};

function get(obj: any, path: string): any {
  return path.split('.').reduce((acc, key) => (acc && acc[key] != null ? acc[key] : undefined), obj);
}

function format(str: string, params?: Record<string, string | number>): string {
  if (!params) return str;
  return Object.keys(params).reduce((s, k) => s.replace(new RegExp(`\\{${k}\\}`, 'g'), String(params[k])), str);
}

function toLocale(lang: Lang): string {
  return lang === 'zh-CN' ? 'zh-CN' : 'en-US';
}

const I18nContext = createContext<{ lang: Lang; setLang: (l: Lang) => void; t: (key: string, params?: Record<string, string | number>) => string; locale: string }>({
  lang: 'zh-CN',
  setLang: () => {},
  t: (k: string) => k,
  locale: 'zh-CN',
});

export const I18nProvider: React.FC<{ children: React.ReactNode; defaultLang?: Lang }> = ({ children, defaultLang = 'zh-CN' }) => {
  const [lang, setLang] = useState<Lang>(defaultLang);
  const t = useMemo(() => {
    const dict = dicts[lang];
    return (key: string, params?: Record<string, string | number>) => {
      const v = get(dict, key);
      if (typeof v === 'string') return format(v, params);
      return key;
    };
  }, [lang]);
  const locale = useMemo(() => toLocale(lang), [lang]);
  return <I18nContext.Provider value={{ lang, setLang, t, locale }}>{children}</I18nContext.Provider>;
};

export function useI18n() {
  return useContext(I18nContext);
}

