import './Footer.css';
import { useLanguage } from '../i18n';

export default function Footer({ theme, setTheme }) {
  const year = new Date().getFullYear();
  const { lang, setLang, t } = useLanguage();
  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="theme-toggle">
          <div className="theme-buttons">
            {t('theme')}：
            <button
              className={[theme === 'light' ? 'btn-selected' : 'btn-unselected', 'less-style'].join(' ')}
              onClick={() => setTheme('light')}
            >
              {t('light')}
            </button>
            /
            <button
              className={[theme === 'dark' ? 'btn-selected' : 'btn-unselected', 'less-style'].join(' ')}
              onClick={() => setTheme('dark')}
            >
              {t('dark')}
            </button>
          </div>
          <div className="language-toggle">
            {t('language')}：
            <button
              className={[lang === 'zh' ? 'btn-selected' : 'btn-unselected', 'less-style'].join(' ')}
              onClick={() => setLang('zh')}
            >
              {t('chinese')}
            </button>
            /
            <button
              className={[lang === 'en' ? 'btn-selected' : 'btn-unselected', 'less-style'].join(' ')}
              onClick={() => setLang('en')}
            >
              {t('english')}
            </button>
          </div>
        </div>
        <div className="contact-section">
            {t('email_label')}
            <a href="mailto:giantbean2025@gmail.com">giantbean2025@gmail.com</a>
        </div>
        <div className="donation-section">
          {t('donate_prompt')}
          <a
            href="https://www.buymeacoffee.com/ginatbean"
            target="_blank"
            rel="noreferrer"
            className="donate-link"
          >
            {t('donate')}
          </a>
        </div>
      </div>
      <div className="copyright">© {year} ETF Life. All rights reserved.</div>
    </footer>
  );
}
