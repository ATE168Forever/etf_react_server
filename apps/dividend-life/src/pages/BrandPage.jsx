import { Link } from '../router.jsx';
import ExperienceNavigation from '../components/ExperienceNavigation';
import Footer from '../components/Footer';
import styles from './BrandPage.module.css';

export default function BrandPage({
  experienceKey,
  title,
  description,
  logoSrc,
  primaryAction,
  secondaryAction,
  children,
}) {
  return (
    <main className={styles.container}>
      <div className={styles.navigation}>
        <ExperienceNavigation current={experienceKey} />
      </div>
      {logoSrc ? (
        <div className={`${styles.panel} ${styles.logoSection}`}>
          <img src={logoSrc} alt={`${title} logo`} className={styles.logo} />
        </div>
      ) : null}
      <section className={`${styles.panel} ${styles.content}`}>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.description}>{description}</p>
        {children}
        {(primaryAction || secondaryAction) && (
          <div className={styles.actions}>
            {primaryAction ? (
              <Link to={primaryAction.to} className={styles.primaryButton}>
                {primaryAction.label}
              </Link>
            ) : null}
            {secondaryAction ? (
              <Link to={secondaryAction.to} className={styles.secondaryButton}>
                {secondaryAction.label}
              </Link>
            ) : null}
          </div>
        )}
      </section>
      <div className={styles.footer}>
        <Footer showThemeToggle={false} />
      </div>
    </main>
  );
}
