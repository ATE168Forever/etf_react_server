import './Footer.css';

const defaultTranslations = {
  zh: {
    theme: '主題',
    light: '亮',
    dark: '暗',
    language: '語言',
    email_label: '電子信箱：',
    donate_prompt: '喜歡這個專案嗎？請作者喝杯咖啡 ☕',
    donate: '贊助',
  },
  en: {
    theme: 'Theme',
    light: 'Light',
    dark: 'Dark',
    language: 'Language',
    email_label: 'Email:',
    donate_prompt: 'Enjoy this project? Buy the author a coffee ☕',
    donate: 'Donate',
  },
};

const fallbackTranslate = (lang, translations, key) => {
  const langTranslations = translations?.[lang];
  if (langTranslations && langTranslations[key]) {
    return langTranslations[key];
  }
  const zhTranslations = translations?.zh;
  if (zhTranslations && zhTranslations[key]) {
    return zhTranslations[key];
  }
  return defaultTranslations.zh[key] ?? key;
};

export default function Footer({
  theme = 'light',
  setTheme,
  showThemeToggle = true,
  lang = 'zh',
  setLang,
  showLanguageToggle = true,
  translations = defaultTranslations,
  t,
  email = 'giantbean2025@gmail.com',
  donateLink = 'https://www.buymeacoffee.com/ginatbean',
  donateLabel,
  brandName = 'ETF Life',
}) {
  const year = new Date().getFullYear();
  const canToggleTheme = showThemeToggle && typeof setTheme === 'function';
  const canToggleLanguage =
    showLanguageToggle && typeof setLang === 'function' && lang !== undefined && lang !== null;

  const translate = (key) => {
    if (typeof t === 'function') {
      const translated = t(key);
      if (translated && translated !== key) {
        return translated;
      }
    }
    return fallbackTranslate(lang, translations, key);
  };

  const handleThemeChange = (nextTheme) => {
    if (canToggleTheme) {
      setTheme(nextTheme);
    }
  };

  const handleLanguageChange = (nextLang) => {
    if (canToggleLanguage) {
      setLang(nextLang);
    }
  };

  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="controls">
          {canToggleTheme ? (
            <div className="theme-control">
              {translate('theme')}：
              <button
                className={['less-style', theme === 'light' ? 'btn-selected' : 'btn-unselected'].join(' ')}
                onClick={() => handleThemeChange('light')}
                type="button"
              >
                {translate('light')}
              </button>
              /
              <button
                className={['less-style', theme === 'dark' ? 'btn-selected' : 'btn-unselected'].join(' ')}
                onClick={() => handleThemeChange('dark')}
                type="button"
              >
                {translate('dark')}
              </button>
            </div>
          ) : null}
          {showLanguageToggle ? (
            <div className="language-control">
              {translate('language')}：
              <button
                className={['less-style', lang === 'zh' ? 'btn-selected' : 'btn-unselected'].join(' ')}
                onClick={() => handleLanguageChange('zh')}
                type="button"
                disabled={!canToggleLanguage}
              >
                中文
              </button>
              /
              <button
                className={['less-style', lang === 'en' ? 'btn-selected' : 'btn-unselected'].join(' ')}
                onClick={() => handleLanguageChange('en')}
                type="button"
                disabled={!canToggleLanguage}
              >
                English
              </button>
            </div>
          ) : null}
        </div>
        <div className="info">
          <span>
            {translate('email_label')}
            <a href={`mailto:${email}`}>{email}</a>
          </span>
          <span className="donation">
            {translate('donate_prompt')}
            <a href={donateLink} target="_blank" rel="noreferrer">
              {donateLabel ?? translate('donate')}
            </a>
          </span>
        </div>
      </div>
      <div className="copyright">© {year} {brandName}. All rights reserved.</div>
    </footer>
  );
}

export { defaultTranslations as footerTranslations };
