import styles from './App.module.css';
import logo from './assets/health-life.svg';

export default function App() {
  return (
    <main className={styles.container}>
      <a href="/" className={styles.backLink}>
        ← 回首頁
      </a>
      <section className={styles.content}>
        <img src={logo} alt="Health Life" className={styles.logo} />
        <h1 className={styles.title}>Health Life</h1>
        <p className={styles.description}>
          聚焦習慣養成與恢復力追蹤，讓投資人身心同步升級。
        </p>
        <div className={styles.featureList}>
          <p>Health Life 主打個人化的健康儀表板，目前正在整合資料管線：</p>
          <ul className={styles.list}>
            <li>Apple Health / Garmin / Strava 等裝置整合</li>
            <li>自主訓練模組，記錄訓練量、心率與睡眠分數</li>
            <li>與財務儀表連動的「健康資產」指數</li>
          </ul>
          <p>功能開發中，歡迎關注更新或先使用 Dividend Life 的配息工具。</p>
        </div>
      </section>
    </main>
  );
}
