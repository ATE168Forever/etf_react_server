import { Link } from '@shared/router';
import ExperienceNavigation from '@shared/components/ExperienceNavigation/ExperienceNavigation.jsx';
import styles from './BrandPage.module.css';

export default function BrandPage({
  experienceKey,
  title,
  description,
  navigationText,
  primaryAction,
  secondaryAction,
  footerSlot = null,
  children,
}) {
  return (
    <main className={styles.container}>
      <div className={styles.navigation}>
        <ExperienceNavigation current={experienceKey} />
        {navigationText ? (
          <img
            src={navigationText}
            alt=""
            aria-hidden="true"
            className={styles.navigationTextMark}
            loading="lazy"
          />
        ) : null}
      </div>
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
      <div className={styles.footer}>{footerSlot}</div>
    </main>
  );
}
