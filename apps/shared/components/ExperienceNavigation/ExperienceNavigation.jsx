import { useThemeLanguage } from '@shared/hooks/useThemeLanguage.jsx';
import { Link } from '@shared/router';
import conceptbLifeLogo from '@shared/assets/concept-b-life.svg';
import dividendLifeLogoDark from '@shared/assets/dividend-life.svg';
import dividendLifeLogoLight from '@shared/assets/dividend-life-light.svg';
import balanceLifeLogoDark from '@shared/assets/balance-life.svg';
import balanceLifeLogoLight from '@shared/assets/balance-life-light.svg';
import healthLifeLogoDark from '@shared/assets/health-life.svg';
import healthLifeLogoLight from '@shared/assets/health-life-light.svg';
import wealthLifeLogoDark from '@shared/assets/wealth-life.svg';
import wealthLifeLogoLight from '@shared/assets/wealth-life-light.svg';
import styles from './ExperienceNavigation.module.css';

const baseExperiences = [
  {
    key: 'home',
    labels: { zh: '首頁', en: 'Home' },
    logos: { dark: conceptbLifeLogo, light: conceptbLifeLogo },
  },
  {
    key: 'dividend-life',
    to: '/dividend-life',
    labels: { zh: 'Dividend Life', en: 'Dividend Life' },
    logos: { dark: dividendLifeLogoDark, light: dividendLifeLogoLight },
  },
  {
    key: 'balance-life',
    to: '/balance-life',
    labels: { zh: 'Balance Life', en: 'Balance Life' },
    logos: { dark: balanceLifeLogoDark, light: balanceLifeLogoLight },
  },
  {
    key: 'health-life',
    to: '/health-life',
    labels: { zh: 'Health Life', en: 'Health Life' },
    logos: { dark: healthLifeLogoDark, light: healthLifeLogoLight },
  },
  {
    key: 'wealth-life',
    to: '/wealth-life',
    labels: { zh: 'Wealth Life', en: 'Wealth Life' },
    logos: { dark: wealthLifeLogoDark, light: wealthLifeLogoLight },
  },
];

export default function ExperienceNavigation({
  current,
  homeHref = '/',
  homeNavigation = 'router',
}) {
  const { theme, lang } = useThemeLanguage();
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
        const logo =
          experience.logos?.[theme] ??
          experience.logos?.dark ??
          experience.logos?.light;

        return (
          <Link
            key={experience.key}
            to={experience.to}
            className={isActive ? `${styles.link} ${styles.active}` : styles.link}
            aria-current={isActive ? 'page' : undefined}
            reloadDocument={experience.key === 'home' ? shouldReloadHome : false}
            aria-label={label}
            title={label}
          >
            <img src={logo} alt="" aria-hidden="true" className={styles.logo} />
          </Link>
        );
      })}
    </nav>
  );
}
