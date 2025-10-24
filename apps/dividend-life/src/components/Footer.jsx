import './Footer.css';
import { useLanguage } from '../i18n';

export default function Footer({ theme = 'light', setTheme, showThemeToggle = true }) {
  const year = new Date().getFullYear();
  const { lang, setLang, t } = useLanguage();
  const canToggleTheme = typeof setTheme === 'function';
  const shouldShowThemeControls = showThemeToggle && canToggleTheme;

  const handleThemeChange = (nextTheme) => {
    if (canToggleTheme) {
      setTheme(nextTheme);
    }
  };

  return (
    <footer className="footer">
      <div className="footer-content">
        {/* 控制區：主題 / 語言切換 */}
        <div className="controls">
          {shouldShowThemeControls ? (
            <div className="theme-control">
              {t('theme')}：
              <button
                className={['less-style', theme === 'light' ? 'btn-selected' : 'btn-unselected'].join(' ')}
                onClick={() => handleThemeChange('light')}
                type="button"
              >
                {t('light')}
              </button>
              /
              <button
                className={['less-style', theme === 'dark' ? 'btn-selected' : 'btn-unselected'].join(' ')}
                onClick={() => handleThemeChange('dark')}
                type="button"
              >
                {t('dark')}
              </button>
            </div>
          ) : null}
          <div className="language-control">
            {t('language')}：
            <button
              className={['less-style', lang === 'zh' ? 'btn-selected' : 'btn-unselected'].join(' ')}
              onClick={() => setLang('zh')}
              type="button"
            >
              中文
            </button>
            /
            <button
              className={['less-style', lang === 'en' ? 'btn-selected' : 'btn-unselected'].join(' ')}
              onClick={() => setLang('en')}
              type="button"
            >
              English
            </button>
          </div>
        </div>
        {/* 資訊區：聯絡 + 贊助 */}
        <div className="info">
          <span>
            {t('email_label')}
            <a href="mailto:giantbean2025@gmail.com">giantbean2025@gmail.com</a>
          </span>
          <span className="donation">
            {t('donate_prompt')}
            <a href="https://www.buymeacoffee.com/ginatbean" target="_blank" rel="noreferrer">
              {t('donate')}
            </a>
          </span>
        </div>
      </div>
      <div className="copyright">© {year} ETF Life. All rights reserved.</div>
    </footer>
  );
}

