import { useCallback, useEffect, useRef, useState } from 'react';
import { useThemeLanguage } from '@shared/hooks/useThemeLanguage.jsx';
import { Link } from '@shared/router';
import conceptbLifeLogoDark from '@shared/assets/concept-b-life.svg';
import conceptbLifeLogoLight from '@shared/assets/concept-b-life-light.svg';
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
    logos: { dark: conceptbLifeLogoDark, light: conceptbLifeLogoLight },
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
  theme: themeProp,
  lang: langProp,
}) {
  const { theme: hookTheme, lang: hookLang } = useThemeLanguage();
  const theme = themeProp ?? hookTheme;
  const lang = langProp ?? hookLang;
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const mobileSwitcherRef = useRef(null);
  const mobileToggleRef = useRef(null);

  const experiences = baseExperiences.map((experience) =>
    experience.key === 'home'
      ? { ...experience, to: homeHref }
      : experience,
  );
  const shouldReloadHome = homeNavigation === 'reload';
  const activeExperience = experiences.find((experience) => experience.key === current) ?? experiences[0];

  const closeMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(false);
  }, []);

  useEffect(() => {
    if (!isMobileMenuOpen) return undefined;

    const handlePointerDown = (event) => {
      if (mobileSwitcherRef.current && !mobileSwitcherRef.current.contains(event.target)) {
        closeMobileMenu();
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        closeMobileMenu();
        mobileToggleRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMobileMenuOpen, closeMobileMenu]);

  const labelFor = (experience) =>
    experience.labels?.[lang] ?? experience.labels?.zh ?? experience.labels?.en ?? experience.key;
  const logoFor = (experience) =>
    experience.logos?.[theme] ?? experience.logos?.dark ?? experience.logos?.light;

  return (
    <nav aria-label="ConceptB Life navigation">
      <div className={styles.nav}>
        {experiences.map((experience) => {
          const isActive = current === experience.key;
          return (
            <Link
              key={`${experience.key}-${theme}`}
              to={experience.to}
              className={isActive ? `${styles.link} ${styles.active}` : styles.link}
              aria-current={isActive ? 'page' : undefined}
              reloadDocument={experience.key === 'home' ? shouldReloadHome : false}
            >
              <img
                src={logoFor(experience)}
                alt=""
                aria-hidden="true"
                className={styles.logo}
              />
              <span className={styles.label}>{labelFor(experience)}</span>
            </Link>
          );
        })}
      </div>

      <div className={styles.mobileSwitcher} ref={mobileSwitcherRef}>
        <button
          type="button"
          ref={mobileToggleRef}
          className={styles.mobileToggle}
          aria-expanded={isMobileMenuOpen}
          aria-haspopup="listbox"
          onClick={() => setIsMobileMenuOpen((open) => !open)}
        >
          <img
            src={logoFor(activeExperience)}
            alt=""
            aria-hidden="true"
            className={styles.mobileToggleLogo}
          />
          <span className={styles.mobileToggleLabel}>{labelFor(activeExperience)}</span>
          <span className={styles.mobileToggleChevron} aria-hidden="true">
            {isMobileMenuOpen ? '▴' : '▾'}
          </span>
        </button>

        {isMobileMenuOpen && (
          <ul
            className={styles.mobileDropdown}
            role="listbox"
            aria-label={lang === 'en' ? 'Switch product' : '切換產品'}
          >
            {experiences.map((experience) => {
              const isActive = current === experience.key;
              return (
                <li
                  key={experience.key}
                  role="option"
                  aria-selected={isActive}
                  className={isActive ? `${styles.mobileDropdownItem} ${styles.mobileDropdownItemActive}` : styles.mobileDropdownItem}
                  onClick={closeMobileMenu}
                >
                  <Link
                    to={experience.to}
                    className={styles.mobileDropdownLink}
                    reloadDocument={experience.key === 'home' ? shouldReloadHome : false}
                    onClick={closeMobileMenu}
                  >
                    <img src={logoFor(experience)} alt="" aria-hidden="true" className={styles.mobileDropdownLogo} />
                    <span>{labelFor(experience)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </nav>
  );
}
