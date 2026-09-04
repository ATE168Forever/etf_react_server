import EmptyState from './EmptyState';
import styles from './EmptyPortfolioState.module.css';

export default function EmptyPortfolioState({ onCtaClick, onImportClick, onDemoClick, t }) {
  const actions = [];
  if (onCtaClick) {
    actions.push({ label: t('empty_cta_add_first'), onClick: onCtaClick, variant: 'primary' });
  }
  if (onImportClick) {
    actions.push({ label: t('empty_cta_import'), onClick: onImportClick, variant: 'secondary' });
  }
  return (
    <EmptyState title={t('empty_portfolio_title')} description={t('empty_portfolio_description')}>
      <div className={styles.actionsRow}>
        {actions.length > 0 ? (
          actions.map(action => (
            <button
              key={action.label}
              type="button"
              className={action.variant === 'primary' ? styles.ctaButton : styles.importButton}
              onClick={action.onClick}
            >
              {action.label}
            </button>
          ))
        ) : (
          <p className={styles.ctaText}>{t('empty_cta_add_first')}</p>
        )}
        {onDemoClick && (
          <button type="button" className={styles.demoButton} onClick={onDemoClick}>
            {t('empty_portfolio_demo_cta')}
          </button>
        )}
      </div>
      {onDemoClick && <p className={styles.disclaimer}>{t('empty_demo_disclaimer')}</p>}
    </EmptyState>
  );
}
