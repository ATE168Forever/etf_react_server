import React from 'react';
import { useLanguage } from './i18n';

export default function TermsOfServiceTab() {
  const { lang } = useLanguage();
  return (
    <div className="container" style={{ maxWidth: 800 }}>
      <h3 className="mt-4">{lang === 'en' ? 'Terms of Service' : '服務條款'}</h3>
      <p>
        {lang === 'en'
          ? 'By using this service you agree to follow site rules, including user obligations, intellectual property rights and liability limits. Any disputes will be handled according to applicable laws.'
          : '使用本服務即表示您同意遵守本站規範，包含使用者義務、智慧財產權與責任限制等。任何爭議將依相關法律處理。'}
      </p>
    </div>
  );
}
