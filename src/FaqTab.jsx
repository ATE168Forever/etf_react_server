import React from 'react';

export default function FaqTab() {
  return (
    <div className="container" style={{ maxWidth: 800 }}>
      <h1 className="mt-4">常見問題（FAQ）</h1>

      <h2>資料與計算</h2>
      <ol>
        <li>
          <strong>殖利率是怎麼算的？</strong>
          <br />
          常見作法有：
          <ul>
            <li>TTM 殖利率＝過去 12 個月實際配息總額 ÷ 最新價格</li>
            <li>年度預估殖利率＝今年已公告配息金額（或近一期預估 × 頻率）÷ 最新價格</li>
          </ul>
          每個頁面都會註明採用的指標，ETF 的配息習慣可能不同，最後還是以發行商公告為準。
        </li>
        <li>
          <strong>公告日、除息日、發放日差在哪？</strong>
          <br />
          <ul>
            <li>公告日：發行機構公開配息資訊的那天。</li>
            <li>除息日：從這天（含）買進就不享有這次配息啦。</li>
            <li>發放日：實際匯到你帳上的時間，不同市場可能有 T+N 差異。</li>
          </ul>
        </li>
        <li>
          <strong>配息頻率如何定義？</strong>
          <br />
          我們依過去紀錄大致分成月配、季配、半年配和年配；如果發行商突然調整，分類可能會暫時跟不上。
        </li>
        <li>
          <strong>資料多久更新一次？是否有延遲？</strong>
          <br />
          會盡量即時同步，但還是取決於資料來源；部分數值可能延遲 15 分鐘或更久，若有重大更正會儘快更新。
        </li>
        <li>
          <strong>為什麼我的實際入帳與網站計算不同？</strong>
          <br />
          稅費、匯率、零股或持有數量變動、券商入帳時間…這些都會影響，請以券商對帳單為準。
        </li>
        <li>
          <strong>槓桿／反向 ETF 有收錄嗎？</strong>
          <br />
          偶爾會有，如果收錄會在標的頁明顯標註並附上風險提醒，請多加留意。
        </li>
        <li>
          <strong>是否支援多市場與多幣別？</strong>
          <br />
          支援範圍以網站公告為主；若有多幣別，系統會提供換匯紀錄或匯率欄位供你記錄。
        </li>
      </ol>

      <h2>帳號、隱私與安全</h2>
      <ol start={8}>
        <li>
          <strong>我的個人股息資料如何保存？</strong>
          <br />
          只用來生成你專屬的報表與統計，詳情見《隱私權政策》。你也能隨時匯出或刪除。
        </li>
        <li>
          <strong>如何刪除帳號或請求資料刪除？</strong>
          <br />
          在「設定 → 帳號」操作，或寄信到 <a href="mailto:giantbean2025@gmail.com">giantbean2025@gmail.com</a> 告訴我們。
        </li>
        <li>
          <strong>是否提供雙重驗證（2FA）？</strong>
          <br />
          若已提供，可在「設定 → 安全性」開啟；還沒有的話，未來版本也會補上。
        </li>
      </ol>

      <h2>功能使用</h2>
      <ol start={11}>
        <li>
          <strong>如何快速導入歷史紀錄？</strong>
          <br />
          下載 CSV 範本照欄位填寫，再到「投資組合 → 匯入」上傳，三步驟搞定。
        </li>
        <li>
          <strong>可以設定除息／發放提醒嗎？</strong>
          <br />
          若有開放通知功能，請在「設定 → 通知」開啟 Email 或推播提醒。
        </li>
        <li>
          <strong>如何報告錯誤或建議新功能？</strong>
          <br />
          右下角「意見反饋」歡迎點下去，也可寄信到 <a href="mailto:giantbean2025@gmail.com">giantbean2025@gmail.com</a>；若是資料更正，記得附上連結或佐證。
        </li>
      </ol>

      <h2>收費與合作（如有）</h2>
      <ol start={14}>
        <li>
          <strong>是否有付費方案或贊助？</strong>
          <br />
          如果有 Premium 或贊助方案，會在《方案與價格》頁清楚說明功能差異與取消方式。
        </li>
        <li>
          <strong>是否提供 API？</strong>
          <br />
          若有開放 API，會提供文件與金鑰申請流程；商務合作歡迎寄信到 <a href="mailto:giantbean2025@gmail.com">giantbean2025@gmail.com</a>。
        </li>
      </ol>
    </div>
  );
}

