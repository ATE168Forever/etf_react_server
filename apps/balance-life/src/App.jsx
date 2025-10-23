import styles from './App.module.css';
import logo from './assets/balance-life.svg';

export default function App() {
  return (
    <main className={styles.container}>
      <a href="/" className={styles.backLink}>
        ← 回首頁
      </a>
      <section className={styles.content}>
        <img src={logo} alt="Balance Life" className={styles.logo} />
        <h1 className={styles.title}>Balance Life</h1>
        <p className={styles.description}>
          用數據驅動的預算工具打造可持續的生活管理系統。
        </p>
        <div className={styles.featureList}>
          <p>Balance Life 將協助你協調現金流與人生節奏，目前產品正在封測準備中：</p>
          <ul className={styles.list}>
            <li>多帳戶預算配置與即時餘額追蹤</li>
            <li>年度目標拆解、月度提醒與習慣養成儀表板</li>
            <li>跨裝置同步的支出記帳體驗</li>
          </ul>
          <p>敬請期待下一版更新，或回首頁探索其他體驗。</p>
        </div>
      </section>
    </main>
  );
}
