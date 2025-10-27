import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const ThemeLanguageContext = createContext(null);

const isChineseLanguage = (lang) => typeof lang === 'string' && lang.toLowerCase().startsWith('zh');

const getPreferredTheme = () => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return 'dark';
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const getInitialTheme = () => {
  if (typeof window === 'undefined') {
    return 'dark';
  }
  const stored = window.localStorage?.getItem('theme');
  if (stored === 'light' || stored === 'dark') {
    return stored;
  }
  return getPreferredTheme();
};

const getInitialLanguage = () => {
  if (typeof window === 'undefined') {
    return 'zh';
  }

  const stored = window.localStorage?.getItem('lang');
  if (stored) {
    return stored;
  }

  const browserLanguages = window.navigator?.languages?.length
    ? window.navigator.languages
    : [window.navigator?.language];

  return browserLanguages?.some(isChineseLanguage) ? 'zh' : 'en';
};

function useProvideThemeLanguage() {
  const [theme, setTheme] = useState(getInitialTheme);
  const [lang, setLang] = useState(getInitialLanguage);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme);
    }
    if (typeof window !== 'undefined') {
      window.localStorage?.setItem('theme', theme);
    }
  }, [theme]);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      const htmlLang = lang === 'zh' ? 'zh-Hant' : 'en';
      document.documentElement.setAttribute('lang', htmlLang);
    }
    if (typeof window !== 'undefined') {
      window.localStorage?.setItem('lang', lang);
    }
  }, [lang]);

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      lang,
      setLang,
    }),
    [lang, theme],
  );

  return value;
}

export function ThemeLanguageProvider({ children }) {
  const value = useProvideThemeLanguage();
  return <ThemeLanguageContext.Provider value={value}>{children}</ThemeLanguageContext.Provider>;
}

export function useThemeLanguage() {
  const context = useContext(ThemeLanguageContext);
  if (context) {
    return context;
  }
  return useProvideThemeLanguage();
}

export { getInitialTheme, getInitialLanguage };
