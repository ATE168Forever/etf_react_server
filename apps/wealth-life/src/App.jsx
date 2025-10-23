import styles from './App.module.css';
import logo from './assets/wealth-life.svg';

export default function App() {
  return (
    <main className={styles.container}>
      <a href="/" className={styles.backLink}>
        ← 回首頁
      </a>
      <section className={styles.content}>
        <img src={logo} alt="Wealth Life" className={styles.logo} />
        <h1 className={styles.title}>Wealth Life</h1>
        <p className={styles.description}>
          整合資產、負債與現金流的全方位財富儀表板。
        </p>
        <div className={styles.featureList}>
          <p>Wealth Life 正在打造跨市場的資產視圖與警示功能：</p>
          <ul className={styles.list}>
            <li>多資產分類（股票、債券、基金、不動產、加密資產）統一管理</li>
            <li>自訂 KPI 與觸發提醒，掌握財務健康度</li>
            <li>與 Dividend Life 整合的收益與淨值報告</li>
          </ul>
          <p>開放測試前會於官網公告，敬請期待。</p>
        </div>
      </section>
    </main>
  );
}
