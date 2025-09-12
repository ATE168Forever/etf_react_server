import { createContext, useContext } from 'react';

export const translations = {
  zh: {
    theme: '主題',
    light: '亮',
    dark: '暗',
    language: '語言',
    chinese: '中文',
    english: 'English',
    email_label: '電子信箱：',
    donate_prompt: '喜歡這個專案嗎？請作者喝杯咖啡 ☕',
    donate: '贊助',
    site_stats: '本站數據概況',
    latest: '最新收錄',
    etf_tips: 'ETF 小知識',
    home: '首頁',
    inventory: '庫存管理',
    mydividend: '我的配息',
    dividend: 'ETF 配息查詢',
    about: '關於本站'
  },
  en: {
    theme: 'Theme',
    light: 'Light',
    dark: 'Dark',
    language: 'Language',
    chinese: 'Chinese',
    english: 'English',
    email_label: 'Email:',
    donate_prompt: 'Enjoy this project? Buy the author a coffee ☕',
    donate: 'Donate',
    site_stats: 'Site Stats',
    latest: 'Latest Listings',
    etf_tips: 'ETF Tips',
    home: 'Home',
    inventory: 'Inventory',
    mydividend: 'My Dividends',
    dividend: 'Dividend Search',
    about: 'About'
  }
};

export const LanguageContext = createContext({
  lang: 'zh',
  setLang: () => {},
  t: (key) => translations.zh[key] || key
});

export const useLanguage = () => useContext(LanguageContext);
