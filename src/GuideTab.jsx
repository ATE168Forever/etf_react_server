import React from 'react';

export default function GuideTab() {
  return (
    <div className="container" style={{ maxWidth: 800 }}>
      <h1 className="mt-4">使用小幫手</h1>
      <p>
        以下說明目前提供的公開資訊瀏覽功能，先玩玩現有功能，未來有新工具再慢慢上線囉。
      </p>
      <h2>瀏覽 ETF 與配息資訊</h2>
      <ol>
        <li>
          <strong>搜尋與篩選</strong>
          <br />
          在首頁或清單頁輸入代號／名稱，搭配篩選器（市場、配息頻率、殖利率區間、規模等）就能迅速縮小範圍。
        </li>
        <li>
          <strong>ETF 詳細頁</strong>
          <br />
          可查看配息歷史（除息日、發放日、每單位配息）、殖利率指標（如 TTM/年度預估）、基本資料（成立日、規模）。
        </li>
      </ol>
    </div>
  );
}
