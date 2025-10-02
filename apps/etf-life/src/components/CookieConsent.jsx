import { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import './CookieConsent.css';
import { useLanguage } from '../i18n';

const COOKIE_NAME = 'cookie_consent';

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const { lang } = useLanguage();

  useEffect(() => {
    const consent = Cookies.get(COOKIE_NAME);
    if (!consent) {
      setVisible(true);
    }
  }, []);

  const accept = () => {
    Cookies.set(COOKIE_NAME, 'true', { expires: 365 });
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="cookie-consent">
      <span>
        {lang === 'en'
          ? 'This site uses cookies to enhance your experience. By continuing to browse, you agree to our use of cookies.'
          : '本網站使用 Cookie 以提升使用者體驗。繼續瀏覽表示您同意我們使用 Cookie。'}
      </span>
      <button onClick={accept}>{lang === 'en' ? 'Got it!' : '知道了！'}</button>
    </div>
  );
}
