import styles from './NextPaymentCard.module.css';
import { formatTwd } from '../utils/homeCurrencyFormat';

function formatCountdown(daysUntil, t) {
  if (daysUntil === 0) return t('next_payment_days_today');
  if (daysUntil === 1) return t('next_payment_days_tomorrow');
  return t('next_payment_days_in_n').replace('{days}', String(daysUntil));
}

export default function NextPaymentCard({ nextPayment, t, calendarAction = null }) {
  return (
    <section className={styles.card} aria-label={t('next_payment_card_title')}>
      <h3 className={styles.title}>{t('next_payment_card_title')}</h3>
      {!nextPayment ? (
        <p className={styles.empty}>{t('next_payment_empty')}</p>
      ) : (
        <>
          <p className={styles.stockLine}>{nextPayment.stock_id} {nextPayment.stock_name}</p>
          <p className={styles.countdown}>{formatCountdown(nextPayment.daysUntil, t)}</p>
          <p className={styles.amountLine}>
            <span>{t('next_payment_estimated_amount_label')}</span>
            <strong>{formatTwd(nextPayment.total)}</strong>
          </p>
          {calendarAction}
        </>
      )}
    </section>
  );
}
