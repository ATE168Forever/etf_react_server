import styles from './EmptyPortfolioState.module.css';

export default function EmptyPortfolioState({ onCtaClick, t }) {
  return (
    <section className={styles.card}>
      <h3 className={styles.title}>{t('empty_portfolio_title')}</h3>
      <p className={styles.description}>{t('empty_portfolio_description')}</p>
      {onCtaClick ? (
        <button type="button" className={styles.ctaButton} onClick={onCtaClick}>
          {t('empty_portfolio_cta')}
        </button>
      ) : (
        <p className={styles.ctaText}>{t('empty_portfolio_cta')}</p>
      )}
    </section>
  );
}
