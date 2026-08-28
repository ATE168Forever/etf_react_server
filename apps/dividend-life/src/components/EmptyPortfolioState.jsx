import styles from './EmptyPortfolioState.module.css';

export default function EmptyPortfolioState({ onCtaClick, onDemoClick, t }) {
  return (
    <section className={styles.card}>
      <h3 className={styles.title}>{t('empty_portfolio_title')}</h3>
      <p className={styles.description}>{t('empty_portfolio_description')}</p>
      <div className={styles.actions}>
        {onCtaClick ? (
          <button type="button" className={styles.ctaButton} onClick={onCtaClick}>
            {t('empty_portfolio_cta')}
          </button>
        ) : (
          <p className={styles.ctaText}>{t('empty_portfolio_cta')}</p>
        )}
        {onDemoClick && (
          <button type="button" className={styles.demoButton} onClick={onDemoClick}>
            {t('empty_portfolio_demo_cta')}
          </button>
        )}
      </div>
    </section>
  );
}
