import BrandPage from './BrandPage.jsx';
import balanceLifeLogo from '../assets/balance-life.svg';
import styles from './BrandPage.module.css';

export default function BalanceLifePage() {
  return (
    <BrandPage
      title="Balance Life"
      description="用數據驅動的預算工具打造可持續的生活管理系統。"
      logoSrc={balanceLifeLogo}
    >
      <div className={styles.featureList}>
        <p>Balance Life 將協助你協調現金流與人生節奏，目前產品正在封測準備中：</p>
        <ul className={styles.list}>
          <li>多帳戶預算配置與即時餘額追蹤</li>
          <li>年度目標拆解、月度提醒與習慣養成儀表板</li>
          <li>跨裝置同步的支出記帳體驗</li>
        </ul>
        <p>敬請期待下一版更新，或回首頁探索其他體驗。</p>
      </div>
    </BrandPage>
  );
}
