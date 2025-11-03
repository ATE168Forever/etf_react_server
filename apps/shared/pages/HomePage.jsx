import { Link } from '@shared/router';
import dividendLifeLogoDark from '@dividend-life/assets/dividend-life.svg';
import dividendLifeLogoLight from '@dividend-life/assets/dividend-life-light.svg';
import balanceLifeLogoDark from '@balance-life/assets/balance-life.svg';
import balanceLifeLogoLight from '@balance-life/assets/balance-life-light.svg';
import healthLifeLogoDark from '@health-life/assets/health-life.svg';
import healthLifeLogoLight from '@health-life/assets/health-life-light.svg';
import wealthLifeLogoDark from '@wealth-life/assets/wealth-life.svg';
import wealthLifeLogoLight from '@wealth-life/assets/wealth-life-light.svg';
import Footer from '@shared/components/Footer/Footer.jsx';
import { useThemeLanguage } from '@shared/hooks/useThemeLanguage.jsx';
import styles from './HomePage.module.css';

const experiences = [
  {
    key: 'dividend-life',
    title: {
      zh: 'Dividend Life',
      en: 'Dividend Life',
    },
    description: {
      zh: '追蹤全球ETF配息日曆、收益目標與自選清單，打造月月現金流。',
      en: 'Track global ETF dividend calendars, income targets, and watchlists to build monthly cash flow.',
    },
    logos: {
      dark: dividendLifeLogoDark,
      light: dividendLifeLogoLight,
    },
    to: '/dividend-life',
  },
  {
    key: 'balance-life',
    title: {
      zh: 'Balance Life',
      en: 'Balance Life',
    },
    description: { 
      zh: '規劃預算、掌握支出節奏，讓資產配置與生活步調更平衡。',
      en: 'Plan budgets and manage spending rhythms to balance asset allocation with life pace.' 
    },
    logos: {
      dark: balanceLifeLogoDark,
      light: balanceLifeLogoLight,
    },
    to: '/balance-life',
  },
  {
    key: 'health-life',
    title: {
      zh: 'Health Life',
      en: 'Health Life',
    },
    description: { 
      zh: '運動紀錄與健康儀表板，陪你養成長期自律的身心習慣。',
      en: 'Exercise tracking and health dashboards to help you cultivate long-term disciplined body and mind habits.' 
    },
    logos: {
      dark: healthLifeLogoDark,
      light: healthLifeLogoLight,
    },
    to: '/health-life',
  },
  {
    key: 'wealth-life',
    title: {
      zh: 'Wealth Life',
      en: 'Wealth Life',
    },
    description: { 
      zh: '整合淨值、資產與負債走勢，掌握財富增長的每一步。',
      en: 'Integrate net worth, assets, and liabilities trends to keep track of every step of your wealth growth.'
    },
    logos: {
      dark: wealthLifeLogoDark,
      light: wealthLifeLogoLight,
    },
    to: '/wealth-life',
  },
];

const homeTranslations = {
  zh: {
    heroTitle: 'ConceptB Life',
    heroSubtitle: '選擇你的生活節奏，從這裡開啟品牌宇宙的四種體驗。',
  },
  en: {
    heroTitle: 'ConceptB Life',
    heroSubtitle: 'Choose your life rhythm and explore four brand experiences from here.',
  },
};

export default function HomePage() {
  const { theme, setTheme, lang, setLang } = useThemeLanguage();
  const locale = homeTranslations[lang] ?? homeTranslations.zh;

  return (
    <main className={styles.container}>
      <header className={styles.hero}>
        <h1 className={styles.heroTitle}>{locale.heroTitle}</h1>
        <p className={styles.heroSubtitle}>{locale.heroSubtitle}</p>
      </header>
      <section className={styles.grid}>
        {experiences.map((experience) => {
          const experienceTitle = experience.title[lang] ?? experience.title.zh;
          const experienceDescription =
            experience.description[lang] ?? experience.description.zh;

          return (
            <Link
              key={experience.key}
              to={experience.to}
              className={styles.card}
              aria-label={experienceTitle}
            >
              <img
                src={experience.logos?.[theme] ?? experience.logos?.dark ?? experience.logos?.light}
                alt={`${experienceTitle} logo`}
                className={styles.logo}
              />
              <h2 className={styles.cardTitle}>{experienceTitle}</h2>
              <p className={styles.cardDescription}>{experienceDescription}</p>
            </Link>
          );
        })}
      </section>
      <Footer
        theme={theme}
        setTheme={setTheme}
        lang={lang}
        setLang={setLang}
        brandName="ConceptB Life"
      />
    </main>
  );
}
