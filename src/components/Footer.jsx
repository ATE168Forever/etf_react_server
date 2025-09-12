import './Footer.css';
import { useLanguage } from '../i18n';

export default function Footer({ theme, toggleTheme }) {
  const year = new Date().getFullYear();
  const { lang, setLang, t } = useLanguage();
  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="theme-toggle">
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              toggleTheme();
            }}
            className="theme-toggle-link"
          >
            {theme === 'dark' ? t('light_theme') : t('dark_theme')}
          </a>
          <div className="language-toggle">
            <button onClick={() => setLang('zh')} disabled={lang === 'zh'}>中</button>
            <button onClick={() => setLang('en')} disabled={lang === 'en'}>英</button>
          </div>
        </div>
        <div className="contact-section">
          <p>
            {t('email_label')}
            <a href="mailto:giantbean2025@gmail.com">giantbean2025@gmail.com</a>
          </p>
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
