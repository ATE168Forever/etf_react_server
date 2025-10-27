import BrandPage from '@shared/components/BrandPage/BrandPage.jsx';
import BrandFooter from '@shared/components/BrandPage/BrandFooter.jsx';
import { ThemeLanguageProvider, useThemeLanguage } from '@shared/hooks/useThemeLanguage.jsx';
import styles from '@shared/components/BrandPage/BrandPage.module.css';
import healthLifeLogo from '../assets/health-life.svg';

const translations = {
  zh: {
    title: 'Health Life',
    description: '聚焦習慣養成與恢復力追蹤，讓投資人身心同步升級。',
    intro: 'Health Life 主打個人化的健康儀表板，目前正在整合資料管線：',
    features: ['Apple Health / Garmin / Strava 等裝置整合', '自主訓練模組，記錄訓練量、心率與睡眠分數', '與財務儀表連動的「健康資產」指數'],
    outro: '功能開發中，歡迎關注更新或先使用 Dividend Life 的配息工具。',
  },
  en: {
    title: 'Health Life',
    description: 'Track habits and resilience to elevate mind and body alongside your investments.',
    intro: "Health Life focuses on a personalized wellness dashboard. We're currently integrating data pipelines:",
    features: [
      'Integrations with Apple Health, Garmin, Strava, and more',
      'Training modules that log workout load, heart rate, and sleep score',
      'A “health capital” index that syncs with your financial dashboard',
    ],
    outro: 'Development is in progress—follow along for updates or start with the Dividend Life tools today.',
  },
};

function HealthLifeContent() {
  const { lang } = useThemeLanguage();
  const locale = translations[lang] ?? translations.zh;

  return (
    <BrandPage
      experienceKey="health-life"
      title={locale.title}
      description={locale.description}
      logoSrc={healthLifeLogo}
      footerSlot={<BrandFooter />}
    >
      <div className={styles.featureList}>
        <p>{locale.intro}</p>
        <ul className={styles.list}>
          {locale.features.map((feature) => (
            <li key={feature}>{feature}</li>
          ))}
        </ul>
        <p>{locale.outro}</p>
      </div>
    </BrandPage>
  );
}

export default function HealthLifePage() {
  return (
    <ThemeLanguageProvider>
      <HealthLifeContent />
    </ThemeLanguageProvider>
  );
}
