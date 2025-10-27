import BrandPage from '@shared/components/BrandPage/BrandPage.jsx';
import BrandFooter from '@shared/components/BrandPage/BrandFooter.jsx';
import { ThemeLanguageProvider, useThemeLanguage } from '@shared/hooks/useThemeLanguage.jsx';
import styles from '@shared/components/BrandPage/BrandPage.module.css';
import balanceLifeLogo from '../assets/balance-life.svg';

const translations = {
  zh: {
    title: 'Balance Life',
    description: '用數據驅動的預算工具打造可持續的生活管理系統。',
    intro: 'Balance Life 將協助你協調現金流與人生節奏，目前產品正在封測準備中：',
    features: ['多帳戶預算配置與即時餘額追蹤', '年度目標拆解、月度提醒與習慣養成儀表板', '跨裝置同步的支出記帳體驗'],
    outro: '敬請期待下一版更新，或回首頁探索其他體驗。',
  },
  en: {
    title: 'Balance Life',
    description: 'Build a sustainable life management system with data-driven budgeting tools.',
    intro: 'Balance Life helps you harmonize cash flow with your life rhythms. The product is currently in closed beta:',
    features: [
      'Multi-account budgeting with real-time balance tracking',
      'Annual goal breakdowns, monthly nudges, and habit dashboards',
      'Cross-device syncing for expense tracking',
    ],
    outro: 'Stay tuned for the next release, or explore our other experiences from the homepage.',
  },
};

function BalanceLifeContent() {
  const { lang } = useThemeLanguage();
  const locale = translations[lang] ?? translations.zh;

  return (
    <BrandPage
      experienceKey="balance-life"
      title={locale.title}
      description={locale.description}
      logoSrc={balanceLifeLogo}
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

export default function BalanceLifePage() {
  return (
    <ThemeLanguageProvider>
      <BalanceLifeContent />
    </ThemeLanguageProvider>
  );
}
