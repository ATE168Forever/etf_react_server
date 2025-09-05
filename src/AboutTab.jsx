import React from 'react';

export default function AboutTab() {
  return (
    <div className="container" style={{ maxWidth: 800 }}>
      <h1 className="mt-4">關於這個專案</h1>
      <p>
        本網站提供 ETF 配息資訊的統整，以及簡易的持股追蹤工具。所有資料僅供參考，並非投資建議。
      </p>
      <p>
        原始碼已開放在 GitHub，歡迎提供回饋與貢獻！
      </p>
    </div>
  );
}
