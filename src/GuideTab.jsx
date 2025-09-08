import React from 'react';

export default function GuideTab() {
  return (
    <div className="container" style={{ maxWidth: 800 }}>
      <h1 className="mt-4">使用小幫手</h1>
      <p>
        以下以「公開資訊瀏覽」與「個人股息紀錄」兩大區塊說明，先玩玩現有功能，未來有新工具再慢慢上線囉。
      </p>
      <h2>A. 瀏覽 ETF 與配息資訊</h2>
      <ol>
        <li>
          <strong>搜尋與篩選</strong>
          <br />
          在首頁或清單頁輸入代號／名稱，搭配篩選器（市場、配息頻率、殖利率區間、規模、主題等）就能迅速縮小範圍。
        </li>
        <li>
          <strong>ETF 詳細頁</strong>
          <br />
          可查看配息歷史（公告日、除息日、發放日、每單位配息）、殖利率指標（如 TTM/年度預估）、基本資料（成立日、規模）。
        </li>
        <li>
          <strong>自選清單（如有）</strong>
          <br />
          於清單或詳細頁點「加入自選」，在「自選」頁即可追蹤關注標的並接收即將除息／發放的小提醒（若有通知功能）。
        </li>
      </ol>
      <h2>B. 紀錄個人股息（投資組合）</h2>
      <ol>
        <li>
          <strong>建立投資組合</strong>
          <br />
          在「投資組合」點「新增」，幫它取個名字（例如：長線、退休帳戶），再選擇幣別與可見性（只有自己看得到）。
        </li>
        <li>
          <strong>新增持有與配息紀錄</strong>
          <br />
          「新增交易」：填入日期、代號、數量、單價、手續費／稅。
          <br />
          「新增配息」：填入發放日、代號、每單位配息、持有數量（或自動帶入）、稅費、實際入帳金額；也可勾選「配息再投資」並填入成交資訊。
        </li>
        <li>
          <strong>匯入 CSV（可選）</strong>
          <br />
          下載範本，上傳符合欄位的 CSV，就能快速導入歷史資料。
          <br />
          建議欄位：date,ticker,market,action,qty,price,fee,tax,cash_dividend,stock_dividend,currency,fx_rate,note
        </li>
        <li>
          <strong>統計與圖表</strong>
          <br />
          在「統計」頁查看月／季／年股息、累計現金流。
        </li>
      </ol>
    </div>
  );
}
