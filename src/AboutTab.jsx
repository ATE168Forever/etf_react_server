import React from 'react';
import GuideTab from './GuideTab';
import FaqTab from './FaqTab';
import DisclaimerTab from './DisclaimerTab';
import TermsOfServiceTab from './TermsOfServiceTab';
import PrivacyPolicyTab from './PrivacyPolicyTab';

export default function AboutTab() {
  return (
    <>
      <div className="container" style={{ maxWidth: 800 }}>
        <h1 className="mt-4">關於本站</h1>
        <p>
          這裡是個幫你整理 ETF 配息的小天地，也附上簡單的持股追蹤工具。資料僅供參考，不構成投資建議唷！
        </p>
        <p>
          這個網站只是作者的趣味小作品，原始碼暫時沒有公開，如果有任何想法或發現 bug，歡迎輕鬆留言給我～
        </p>
      </div>
      <GuideTab />
      <FaqTab />
      <DisclaimerTab />
      <TermsOfServiceTab />
      <PrivacyPolicyTab />
    </>
  );
}
