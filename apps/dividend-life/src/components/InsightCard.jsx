import styles from './InsightCard.module.css';

export default function InsightCard({ achievementLabel, lowIncomeMonthMessage, t }) {
  return (
    <section className={styles.card} aria-label={t('insight_card_title')}>
      <h3 className={styles.title}>{t('insight_card_title')}</h3>
      {achievementLabel === null ? (
        <p className={styles.empty}>{t('insight_card_no_goal')}</p>
      ) : (
        <p className={styles.achievement}>{achievementLabel}</p>
      )}
      {lowIncomeMonthMessage && (
        <p className={styles.lowIncome} data-testid="insight-low-income">{lowIncomeMonthMessage}</p>
      )}
    </section>
  );
}
