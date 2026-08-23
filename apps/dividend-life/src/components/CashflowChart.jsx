import styles from './CashflowChart.module.css';
import { formatTwd } from '../utils/homeCurrencyFormat';

function formatMonthLabel(year, month, lang) {
  const formatter = new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'zh-TW', { year: 'numeric', month: 'short' });
  return formatter.format(new Date(year, month, 1));
}

export default function CashflowChart({ months, lang, t }) {
  const list = Array.isArray(months) ? months : [];
  return (
    <section className={styles.card} aria-label={t('cashflow_chart_title')}>
      <h3 className={styles.title}>{t('cashflow_chart_title')}</h3>
      <ul className={styles.list}>
        {list.map((item) => (
          <li
            key={`${item.year}-${item.month}`}
            className={item.isBelowLivingCost ? `${styles.row} ${styles.rowLow}` : styles.row}
          >
            <span className={styles.monthLabel}>{formatMonthLabel(item.year, item.month, lang)}</span>
            {item.hasAnnouncedData ? (
              <span className={styles.amount}>{formatTwd(item.amount)}</span>
            ) : (
              <span className={styles.noData}>{t('cashflow_month_no_data')}</span>
            )}
            {item.isBelowLivingCost && (
              <span className={styles.lowBadge}>{t('cashflow_below_living_cost')}</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
