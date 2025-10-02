import './Footer.css';
import { useLanguage } from '../i18n';

export default function Footer({ theme, setTheme }) {
  const year = new Date().getFullYear();
  const { lang, setLang, t } = useLanguage();

  return (
    <footer className="footer">
      <div className="footer-content">
        {/* 控制區：主題 / 語言切換 */}
        <div className="controls">
          <div className="theme-control">
            {t('theme')}：
            <button className={['less-style', theme === 'light' ? 'btn-selected':'btn-unselected'].join(' ')}
                    onClick={() => setTheme('light')}>{t('light')}</button>
            /
            <button className={['less-style', theme === 'dark' ? 'btn-selected':'btn-unselected'].join(' ')}
                    onClick={() => setTheme('dark')}>{t('dark')}</button>
          </div>
          <div className="language-control">
            {t('language')}：
            <button className={['less-style', lang === 'zh' ? 'btn-selected':'btn-unselected'].join(' ')}
                    onClick={() => setLang('zh')}>中文</button>
            /
            <button className={['less-style', lang === 'en' ? 'btn-selected':'btn-unselected'].join(' ')}
                    onClick={() => setLang('en')}>English</button>
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

