import React from 'react';
import { useLanguage } from './i18n';

export default function GuideTab() {
  const { lang } = useLanguage();
  return (
    <div className="container" style={{ maxWidth: 800 }}>
      <h3 className="mt-4">{lang === 'en' ? 'User Guide' : '使用小幫手'}</h3>
      <p>
        {lang === 'en'
          ? 'Below is an introduction to the current public information features. Feel free to play with them; new tools will come later.'
          : '以下說明目前提供的公開資訊瀏覽功能，先玩玩現有功能，未來有新工具再慢慢上線囉。'}
      </p>
      <h4>{lang === 'en' ? 'Browse ETF and Dividend Info' : '瀏覽 ETF 與配息資訊'}</h4>
      <ol>
        <li>
          <strong>{lang === 'en' ? 'Search and Filter' : '搜尋與篩選'}</strong>
          <br />
          {lang === 'en'
            ? 'Enter the symbol or name on the home or list page and use filters (market, payout frequency, yield range, size, etc.) to narrow it down quickly.'
            : '在首頁或清單頁輸入代號／名稱，搭配篩選器（市場、配息頻率、殖利率區間、規模等）就能迅速縮小範圍。'}
        </li>
        <li>
          <strong>{lang === 'en' ? 'ETF Detail Page' : 'ETF 詳細頁'}</strong>
          <br />
          {lang === 'en'
            ? 'View dividend history (ex-date, payment date, per-unit payout), yield indicators (such as TTM/annual estimate), and basic info (inception date, size).'
            : '可查看配息歷史（除息日、發放日、每單位配息）、殖利率指標（如 TTM/年度預估）、基本資料（成立日、規模）。'}
        </li>
      </ol>
    </div>
  );
}
