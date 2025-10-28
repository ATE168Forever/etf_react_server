import { useThemeLanguage } from '@shared/hooks/useThemeLanguage.jsx';
import { Link } from '@shared/router';
import styles from './ExperienceNavigation.module.css';

const baseExperiences = [
  { key: 'home', labels: { zh: '首頁', en: 'Home' } },
  // { key: 'dividend-life', to: '/dividend-life', labels: { zh: 'Dividend Life', en: 'Dividend Life' } },
  // { key: 'balance-life', to: '/balance-life', labels: { zh: 'Balance Life', en: 'Balance Life' } },
  // { key: 'health-life', to: '/health-life', labels: { zh: 'Health Life', en: 'Health Life' } },
  // { key: 'wealth-life', to: '/wealth-life', labels: { zh: 'Wealth Life', en: 'Wealth Life' } },
];

export default function ExperienceNavigation({
  current,
  homeHref = '/',
  homeNavigation = 'router',
}) {
  const { lang } = useThemeLanguage();
  const experiences = baseExperiences.map((experience) =>
    experience.key === 'home'
      ? { ...experience, to: homeHref }
      : experience,
  );
  const shouldReloadHome = homeNavigation === 'reload';

  return (
    <nav className={styles.nav} aria-label="ConceptB Life navigation">
      {experiences.map((experience) => {
        const isActive = current === experience.key;
        const label =
          experience.labels?.[lang] ??
          experience.labels?.zh ??
          experience.labels?.en ??
          experience.key;

        return (
          <Link
            key={experience.key}
            to={experience.to}
            className={isActive ? `${styles.link} ${styles.active}` : styles.link}
            aria-current={isActive ? 'page' : undefined}
            reloadDocument={experience.key === 'home' ? shouldReloadHome : false}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
