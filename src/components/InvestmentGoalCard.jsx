import styles from './InvestmentGoalCard.module.css';

export default function InvestmentGoalCard({ title, rows, savedMessage, form, emptyState }) {
  return (
    <section className={styles.card}>
      <div className={styles.header}>
        <h5>{title}</h5>
        {savedMessage ? <span className={styles.savedMessage}>{savedMessage}</span> : null}
      </div>
      <div className={styles.body}>
        {rows.map(row => (
          <div key={row.id} className={styles.goalRow}>
            <div className={styles.goalRowHeader}>
              <div>
                <div className={styles.goalLabel}>{row.label}</div>
                <div className={styles.goalAmounts}>
                  <span>{row.current}</span>
                  <span>{row.target}</span>
                </div>
              </div>
              <div className={styles.goalPercent}>{row.percentLabel}</div>
            </div>
            <div
              className={styles.progressBar}
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(Math.min(1, Math.max(0, row.percent || 0)) * 100)}
            >
              <div
                className={styles.progressFill}
                style={{ width: `${Math.min(100, Math.max(0, row.percent || 0) * 100)}%` }}
              />
            </div>
            {row.encouragement ? <div className={styles.encouragement}>{row.encouragement}</div> : null}
          </div>
        ))}
        {emptyState ? <div className={styles.emptyState}>{emptyState}</div> : null}
        {form ? (
          <form className={styles.form} onSubmit={form.onSubmit}>
            <div className={styles.inputGroup}>
              <label htmlFor={form.totalId}>{form.totalLabel}</label>
              <input
                id={form.totalId}
                type="number"
                inputMode="decimal"
                value={form.totalValue}
                onChange={form.onTotalChange}
                placeholder={form.totalPlaceholder}
                min="0"
                step="1000"
              />
            </div>
            <div className={styles.inputGroup}>
              <label htmlFor={form.monthlyId}>{form.monthlyLabel}</label>
              <input
                id={form.monthlyId}
                type="number"
                inputMode="decimal"
                value={form.monthlyValue}
                onChange={form.onMonthlyChange}
                placeholder={form.monthlyPlaceholder}
                min="0"
                step="100"
              />
            </div>
            <button type="submit">{form.saveLabel}</button>
          </form>
        ) : null}
      </div>
    </section>
  );
}
