import React, { useState } from 'react';
import GuideTab from './GuideTab';
import FaqTab from './FaqTab';
import DisclaimerTab from './DisclaimerTab';
import TermsOfServiceTab from './TermsOfServiceTab';
import PrivacyPolicyTab from './PrivacyPolicyTab';

export default function AboutTab() {
  const [innerTab, setInnerTab] = useState('guide');

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
        <ul className="nav nav-tabs mt-4 mb-3">
          <li className="nav-item">
            <button
              className={`nav-link${innerTab === 'guide' ? ' active' : ''}`}
              onClick={() => setInnerTab('guide')}
            >
              使用說明
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link${innerTab === 'faq' ? ' active' : ''}`}
              onClick={() => setInnerTab('faq')}
            >
              常見問題
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link${innerTab === 'disclaimer' ? ' active' : ''}`}
              onClick={() => setInnerTab('disclaimer')}
            >
              免責聲明
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link${innerTab === 'tos' ? ' active' : ''}`}
              onClick={() => setInnerTab('tos')}
            >
              服務條款
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link${innerTab === 'privacy' ? ' active' : ''}`}
              onClick={() => setInnerTab('privacy')}
            >
              隱私權政策
            </button>
          </li>
        </ul>
      </div>
      {innerTab === 'guide' && <GuideTab />}
      {innerTab === 'faq' && <FaqTab />}
      {innerTab === 'disclaimer' && <DisclaimerTab />}
      {innerTab === 'tos' && <TermsOfServiceTab />}
      {innerTab === 'privacy' && <PrivacyPolicyTab />}
    </>
  );
}
