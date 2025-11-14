import BrandPage from '@shared/components/BrandPage/BrandPage.jsx';
import BrandFooter from '@shared/components/BrandPage/BrandFooter.jsx';
import { ThemeLanguageProvider, useThemeLanguage } from '@shared/hooks/useThemeLanguage.jsx';
import styles from '@shared/components/BrandPage/BrandPage.module.css';
import wealthLifeTextDark from '@shared/assets/wealth-life-text.svg';
import wealthLifeTextLight from '@shared/assets/wealth-life-text-light.svg';

const translations = {
  zh: {
    title: 'Wealth Life',
    description: '整合資產、負債與現金流的全方位財富儀表板。',
    intro: 'Wealth Life 正在打造跨市場的資產視圖與警示功能：',
    features: ['多資產分類（股票、債券、基金、不動產、加密資產）統一管理', '自訂 KPI 與觸發提醒，掌握財務健康度', '與 Dividend Life 整合的收益與淨值報告'],
    outro: '開放測試前會於官網公告，敬請期待。',
  },
  en: {
    title: 'Wealth Life',
    description: 'A holistic wealth dashboard unifying assets, liabilities, and cash flow.',
    intro: 'Wealth Life is building cross-market asset views and smart alerts:',
    features: [
      'Unified management for equities, bonds, funds, real estate, and digital assets',
      'Custom KPIs and triggers to monitor financial health',
      'Integrated income and net-worth reports with Dividend Life',
    ],
    outro: "We'll announce beta access on the official site—stay tuned.",
  },
};

function WealthLifeContent() {
  const { lang, theme } = useThemeLanguage();
  const locale = translations[lang] ?? translations.zh;
  const navigationText = theme === 'light' ? wealthLifeTextLight : wealthLifeTextDark;

  return (
    <BrandPage
      experienceKey="wealth-life"
      title={locale.title}
      description={locale.description}
      navigationText={navigationText}
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

export default function WealthLifePage() {
  return (
    <ThemeLanguageProvider>
      <WealthLifeContent />
    </ThemeLanguageProvider>
  );
}
