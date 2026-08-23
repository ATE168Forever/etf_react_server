import styles from './MonthlyIncomeCard.module.css';
import { formatTwd } from '../utils/homeCurrencyFormat';

export default function MonthlyIncomeCard({
  twScheduled, twReceived, twPending, hasUsAmount, usScheduled, lang, t
}) {
  return (
    <section className={styles.card} aria-label={t('monthly_income_card_title')}>
      <h3 className={styles.title}>{t('monthly_income_card_title')}</h3>
      <dl className={styles.grid}>
        <div className={styles.row}>
          <dt>{t('monthly_income_scheduled_label')}</dt>
          <dd>{formatTwd(twScheduled)}</dd>
        </div>
        <div className={styles.row}>
          <dt>{t('monthly_income_received_label')}</dt>
          <dd>{formatTwd(twReceived)}</dd>
        </div>
        <div className={styles.row}>
          <dt>{t('monthly_income_pending_label')}</dt>
          <dd>{formatTwd(twPending)}</dd>
        </div>
      </dl>
      {hasUsAmount && (
        <p className={styles.disclaimer}>{t('us_dividend_pretax_disclaimer')}</p>
      )}
    </section>
  );
}
