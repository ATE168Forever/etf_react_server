import React from 'react';

export default function FaqTab() {
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '殖利率是怎麼算的？',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'TTM 殖利率為過去 12 個月實際配息總額除以最新價格；年度預估殖利率為今年已公告或預估的配息除以最新價格，以發行商公告為準。'
        }
      },
      {
        '@type': 'Question',
        name: '除息日和發放日差在哪？',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '除息日起買進者不享有本次配息；發放日為實際匯入或入帳時間，不同市場規則可能不同。'
        }
      },
      {
        '@type': 'Question',
        name: '配息頻率如何定義？',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '我們依過去紀錄大致分成月配、季配、半年配和年配；若發行商突然調整，分類可能會暫時跟不上。'
        }
      }
    ]
  };

  return (
    <div className="container" style={{ maxWidth: 800 }}>
      <h3 className="mt-4">常見問題（FAQ）</h3>

      <h4>資料與計算</h4>
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
          <strong>除息日和發放日差在哪？</strong>
          <br />
          <ul>
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

      <h4>聯絡我們</h4>
      <ol start={7}>
        <li>
          <strong>如何報告錯誤或建議新功能？</strong>
          <br />
          歡迎寄信到 <a href="mailto:giantbean2025@gmail.com">giantbean2025@gmail.com</a>；若是資料更正，記得附上連結或佐證。
        </li>
      </ol>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
    </div>
  );
}

