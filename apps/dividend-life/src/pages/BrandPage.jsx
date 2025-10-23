import { Link } from '../router.jsx';
import styles from './BrandPage.module.css';

export default function BrandPage({ title, description, logoSrc, primaryAction, secondaryAction, children }) {
  return (
    <main className={styles.container}>
      <Link to="/" className={styles.backLink}>
        ← 回首頁
      </Link>
      <section className={styles.content}>
        {logoSrc ? <img src={logoSrc} alt={`${title} logo`} className={styles.logo} /> : null}
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
    </main>
  );
}
