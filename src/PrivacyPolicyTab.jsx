import React from 'react';
import { useLanguage } from './i18n';

export default function PrivacyPolicyTab() {
  const { lang } = useLanguage();
  return (
    <div className="container" style={{ maxWidth: 800 }}>
      <h3 className="mt-4">{lang === 'en' ? 'Privacy Policy' : '隱私權政策'}</h3>
      <p>
        {lang === 'en'
          ? 'We respect and protect your personal data, collecting only information necessary to provide services. You may query, download, correct or delete your data at any time. See this policy for details.'
          : '本站尊重並保護您的個人資料，僅蒐集提供服務所必需的資訊。您可隨時查詢、下載、 更正或刪除自己的資料，詳細內容請參考本政策。'}
      </p>
    </div>
  );
}
