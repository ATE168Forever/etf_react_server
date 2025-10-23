import { Link } from '../router.jsx';
import dividendLifeLogo from '../assets/dividend-life.svg';
import balanceLifeLogo from '../assets/balance-life.svg';
import healthLifeLogo from '../assets/health-life.svg';
import wealthLifeLogo from '../assets/wealth-life.svg';
import styles from './HomePage.module.css';

const experiences = [
  {
    key: 'dividend-life',
    title: 'Dividend Life',
    description: '追蹤全球ETF配息日曆、收益目標與自選清單，打造月月現金流。',
    logo: dividendLifeLogo,
    to: '/dividend-life',
  },
  {
    key: 'balance-life',
    title: 'Balance Life',
    description: '規劃預算、掌握支出節奏，讓資產配置與生活步調更平衡。',
    logo: balanceLifeLogo,
    to: '/balance-life',
  },
  {
    key: 'health-life',
    title: 'Health Life',
    description: '運動紀錄與健康儀表板，陪你養成長期自律的身心習慣。',
    logo: healthLifeLogo,
    to: '/health-life',
  },
  {
    key: 'wealth-life',
    title: 'Wealth Life',
    description: '整合淨值、資產與負債走勢，掌握財富增長的每一步。',
    logo: wealthLifeLogo,
    to: '/wealth-life',
  },
];

export default function HomePage() {
  return (
    <main className={styles.container}>
      <header className={styles.hero}>
        <h1 className={styles.heroTitle}>ConceptB Life</h1>
        <p className={styles.heroSubtitle}>選擇你的生活節奏，從這裡開啟品牌宇宙的四種體驗。</p>
      </header>
      <section className={styles.grid}>
        {experiences.map((experience) => (
          <Link
            key={experience.key}
            to={experience.to}
            className={styles.card}
            aria-label={experience.title}
          >
            <img src={experience.logo} alt={`${experience.title} logo`} className={styles.logo} />
            <h2 className={styles.cardTitle}>{experience.title}</h2>
            <p className={styles.cardDescription}>{experience.description}</p>
          </Link>
        ))}
      </section>
    </main>
  );
}
