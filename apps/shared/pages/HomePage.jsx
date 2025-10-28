import { Link } from '@shared/router';
import dividendLifeLogoDark from '@dividend-life/assets/dividend-life.svg';
import dividendLifeLogoLight from '@dividend-life/assets/dividend-life-light.svg';
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
  // {
  //   key: 'balance-life',
  //   title: 'Balance Life',
  //   description: '規劃預算、掌握支出節奏，讓資產配置與生活步調更平衡。',
  //   logos: {
  //     dark: balanceLifeLogoDark,
  //     light: balanceLifeLogoLight,
  //   },
  //   to: '/balance-life',
  // },
  // {
  //   key: 'health-life',
  //   title: 'Health Life',
  //   description: '運動紀錄與健康儀表板，陪你養成長期自律的身心習慣。',
  //   logos: {
  //     dark: healthLifeLogoDark,
  //     light: healthLifeLogoLight,
  //   },
  //   to: '/health-life',
  // },
  // {
  //   key: 'wealth-life',
  //   title: 'Wealth Life',
  //   description: '整合淨值、資產與負債走勢，掌握財富增長的每一步。',
  //   logos: {
  //     dark: wealthLifeLogoDark,
  //     light: wealthLifeLogoLight,
  //   },
  //   to: '/wealth-life',
  // },
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
