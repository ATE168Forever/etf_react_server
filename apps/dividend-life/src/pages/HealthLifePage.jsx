import BrandPage from './BrandPage.jsx';
import healthLifeLogo from '../assets/health-life.svg';
import styles from './BrandPage.module.css';

export default function HealthLifePage() {
  return (
    <BrandPage
      experienceKey="health-life"
      title="Health Life"
      description="聚焦習慣養成與恢復力追蹤，讓投資人身心同步升級。"
      logoSrc={healthLifeLogo}
    >
      <div className={styles.featureList}>
        <p>Health Life 主打個人化的健康儀表板，目前正在整合資料管線：</p>
        <ul className={styles.list}>
          <li>Apple Health / Garmin / Strava 等裝置整合</li>
          <li>自主訓練模組，記錄訓練量、心率與睡眠分數</li>
          <li>與財務儀表連動的「健康資產」指數</li>
        </ul>
        <p>功能開發中，歡迎關注更新或先使用 Dividend Life 的配息工具。</p>
      </div>
    </BrandPage>
  );
}
