import React from 'react';
import GuideTab from './GuideTab';
import FaqTab from './FaqTab';
import DisclaimerTab from './DisclaimerTab';
import TermsOfServiceTab from './TermsOfServiceTab';
import PrivacyPolicyTab from './PrivacyPolicyTab';
import { useLanguage } from './i18n';

export default function AboutTab() {
  const { lang } = useLanguage();
  return (
    <div className="about-tab">
      <div className="container" style={{ maxWidth: 800 }}>
        <h3 className="mt-4">{lang === 'en' ? 'About' : '關於本站'}</h3>
        <p>
          {lang === 'en'
            ? 'This small site helps you organize ETF dividends and offers a simple holding tracker. Data is for reference only and is not investment advice.'
            : '這裡是個幫你整理 ETF 配息的小天地，也附上簡單的持股追蹤工具。資料僅供參考，不構成投資建議唷！'}
        </p>
        <p>
          {lang === 'en'
            ? 'This website is just a fun side project. The source code is not public for now. If you have ideas or find bugs, feel free to drop me a message.'
            : '這個網站只是作者的趣味小作品，原始碼暫時沒有公開，如果有任何想法或發現 bug，歡迎輕鬆留言給我～'}
        </p>
      </div>
      <GuideTab />
      <FaqTab />
      <DisclaimerTab />
      <TermsOfServiceTab />
      <PrivacyPolicyTab />
    </div>
  );
}
