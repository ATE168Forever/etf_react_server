import { useEffect, useState } from 'react';
import Footer from '@shared/components/Footer/Footer.jsx';

const getInitialTheme = () => {
  if (typeof window === 'undefined') {
    return 'dark';
  }
  return window.localStorage?.getItem('theme') || 'dark';
};

const isChineseLanguage = (lang) => lang && lang.toLowerCase().startsWith('zh');

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

export default function BrandFooter({ brandName = 'ETF Life' }) {
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
    if (typeof window !== 'undefined') {
      window.localStorage?.setItem('lang', lang);
    }
  }, [lang]);

  return (
    <Footer
      theme={theme}
      setTheme={setTheme}
      lang={lang}
      setLang={setLang}
      brandName={brandName}
    />
  );
}
