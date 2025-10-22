import React from 'react';
import { useLanguage } from './i18n';

export default function DisclaimerTab() {
  const { lang } = useLanguage();
  return (
    <div className="container" style={{ maxWidth: 800 }}>
      <h3 className="mt-4">{lang === 'en' ? 'Disclaimer' : '免責聲明'}</h3>

      <h4>{lang === 'en' ? 'Information Only' : '資訊性質'}</h4>
      <p>
        {lang === 'en'
          ? 'Dividend Life (the "Site") shares market data, tools and calculation results for learning and reference only. They are not investment advice and should not be your sole basis for trading ETFs.'
          : 'Dividend Life（以下稱「本站」）分享的市場資料、小工具和計算結果，主要是希望大家交流和自學用的參考。這些內容真的不是投資建議，也不該成為你買賣 ETF 的唯一依據喔。'}
      </p>

      <h4>{lang === 'en' ? 'No Advisory' : '非投顧聲明'}</h4>
      <p>
        {lang === 'en'
          ? 'We are not securities investment advisors or a regulated financial institution and provide no personalized advice or suitability assessment. Please evaluate based on your goals and risk tolerance and consult professionals when needed.'
          : '我們不是證券投資顧問，也不是什麼受監理的金融機構，沒有提供個別化投資建議或適合度評估。投資前還是請依自己的目標與風險承受度評估，必要時可詢問專業的投顧或稅務顧問。'}
      </p>

      <h4>{lang === 'en' ? 'Investment Risks' : '投資風險'}</h4>
      <p>
        {lang === 'en'
          ? 'Investing involves risk. ETF/fund values rise and fall with the market. Leveraged and inverse products carry higher risk and may cause significant losses. Past performance does not guarantee future results.'
          : '投資一定有風險，ETF/基金淨值會跟著市場上上下下，槓桿和反向商品風險更高，可能讓你賠掉不少本金。過去的績效也不代表未來還會一樣。'}
      </p>

      <h4>{lang === 'en' ? 'Data Sources & Accuracy' : '資料來源與正確性'}</h4>
      <p>
        {lang === 'en'
          ? 'Quotes, dividends, dates, frequencies, metrics and calculations on this site may come from sources such as TWSE, MOPS and ETF issuer websites. Data may be delayed, updated at different frequencies or contain errors. Official sources prevail.'
          : '本站使用的報價、配息、日期、頻率、指標和計算結果，來源可能包括台灣證券交易所（TWSE）、公開資訊觀測站（MOPS）、ETF 發行商官網等。這些資料可能有延遲、更新頻率不同、甚至有錯，最終還是以發行機構或官方公告為準。'}
      </p>

      <h4>{lang === 'en' ? 'Price & Time Basis' : '價格與時間基準'}</h4>
      <p>
        {lang === 'en'
          ? 'Unless otherwise noted, prices usually use the latest close or delayed quotes. Definitions of ex-dividend and payment dates may vary by market or issuer.'
          : '除非另有說明，價格通常取最新收盤或延遲行情；除息日、發放日等定義可能因市場或發行機構而有所不同。'}
      </p>

      <h4>{lang === 'en' ? 'Taxes & Compliance' : '稅務與法遵'}</h4>
      <p>
        {lang === 'en'
          ? 'The site does not provide tax or accounting advice. Actual amounts received after dividends depend on your residence, status and local regulations (e.g. withholding tax, NHI). Follow local rules and consult professionals.'
          : '本站不提供稅務或會計建議。配息後實際到手金額會因你的居住地、身份別與當地法規有所差異（例如預扣稅、二代健保等等），請依所在地規定並向專業人士請教。'}
      </p>

      <h4>{lang === 'en' ? 'Third-party Links & Disclosure' : '第三方連結與合作揭露'}</h4>
      <p>
        {lang === 'en'
          ? 'The site may contain third-party links or partnerships (including referral links/ads). Any revenue will be disclosed, but we cannot guarantee the quality or safety of third-party content or services.'
          : '網站裡可能會出現一些第三方連結或合作（包含推薦連結/廣告）。如果因此有收益，我們會好好揭露，但我們無法保證第三方內容或服務的品質與安全。'}
      </p>

      <h4>{lang === 'en' ? 'Service Interruptions & Liability' : '服務中斷與責任限制'}</h4>
      <p>
        {lang === 'en'
          ? 'The site may occasionally be interrupted or limited due to maintenance, system failures or force majeure. We are not liable for any losses from using or inability to use the site.'
          : '本網站可能偶爾因維護、系統故障或不可抗力而暫時中斷或功能受限。使用或無法使用本站所造成的任何損失，我們無法負責。'}
      </p>

      <h4>{lang === 'en' ? 'Changes to Terms' : '條款變更'}</h4>
      <p>
        {lang === 'en'
          ? 'We may update this disclaimer and related policies at any time. Updates will be announced on the page or via system messages.'
          : '我們可能隨時更新這份免責聲明與相關政策，更新後會在頁面公告或透過系統訊息通知。'}
      </p>

      <p>
        {lang === 'en'
          ? <>If you have questions about data accuracy or rights, please email <a href="mailto:giantbean2025@gmail.com">giantbean2025@gmail.com</a> to contact us.</>
          : <>如果你對資料正確性或權利有疑問，歡迎寫信到<a href="mailto:giantbean2025@gmail.com">giantbean2025@gmail.com</a>和我們聯絡。</>}
      </p>
    </div>
  );
}

