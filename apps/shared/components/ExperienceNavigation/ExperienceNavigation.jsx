import { Link } from '@shared/router';
import styles from './ExperienceNavigation.module.css';

const experiences = [
  { key: 'home', label: '首頁', to: '/' },
  { key: 'dividend-life', label: 'Dividend Life', to: '/dividend-life' },
  { key: 'balance-life', label: 'Balance Life', to: '/balance-life' },
  { key: 'health-life', label: 'Health Life', to: '/health-life' },
  { key: 'wealth-life', label: 'Wealth Life', to: '/wealth-life' },
];

export default function ExperienceNavigation({ current }) {
  return (
    <nav className={styles.nav} aria-label="ConceptB Life navigation">
      {experiences.map((experience) => {
        const isActive = current === experience.key;
        return (
          <Link
            key={experience.key}
            to={experience.to}
            className={isActive ? `${styles.link} ${styles.active}` : styles.link}
            aria-current={isActive ? 'page' : undefined}
          >
            {experience.label}
          </Link>
        );
      })}
    </nav>
  );
}
