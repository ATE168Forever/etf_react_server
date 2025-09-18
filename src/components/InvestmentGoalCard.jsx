import styles from './InvestmentGoalCard.module.css';

export default function InvestmentGoalCard({ title, metrics = [], rows, savedMessage, form, emptyState }) {
  const { isVisible: formIsVisible = true, toggle: formToggle, id: formId, ...formProps } = form || {};
  const shouldRenderForm = Boolean(form) && formIsVisible !== false;

  return (
    <section className={styles.card}>
      <div className={styles.header}>
        <h5>{title}</h5>
        {savedMessage ? <span className={styles.savedMessage}>{savedMessage}</span> : null}
      </div>
      <div className={styles.body}>
        {metrics.length > 0 ? (
          <div className={styles.metrics}>
            {metrics.map(metric => (
              <div key={metric.id} className={styles.metric}>
                <div className={styles.metricLabel}>{metric.label}</div>
                <div className={styles.metricValue}>{metric.value}</div>
              </div>
            ))}
          </div>
        ) : null}
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
        {formToggle ? (
          <button
            type="button"
            className={styles.formToggleButton}
            onClick={formToggle.onClick}
            aria-expanded={shouldRenderForm}
            aria-controls={formToggle.ariaControls || formId || undefined}
          >
            {formToggle.label}
          </button>
        ) : null}
        {shouldRenderForm ? (
          <form id={formId} className={styles.form} onSubmit={formProps.onSubmit}>
            {formProps.intro ? <p className={styles.formIntro}>{formProps.intro}</p> : null}
            {formProps.nameLabel ? (
              <div className={styles.inputGroup}>
                <label htmlFor={formProps.nameId}>{formProps.nameLabel}</label>
                <input
                  id={formProps.nameId}
                  type="text"
                  value={formProps.nameValue}
                  onChange={formProps.onNameChange}
                  placeholder={formProps.namePlaceholder}
                  maxLength={formProps.nameMaxLength || 60}
                />
                {formProps.nameHelper ? <span className={styles.inputHelper}>{formProps.nameHelper}</span> : null}
              </div>
            ) : null}
            <div className={styles.inputGroup}>
              <label htmlFor={formProps.totalId}>{formProps.totalLabel}</label>
              <input
                id={formProps.totalId}
                type="number"
                inputMode="decimal"
                value={formProps.totalValue}
                onChange={formProps.onTotalChange}
                placeholder={formProps.totalPlaceholder}
                min="0"
                step="1000"
              />
            </div>
            <div className={styles.inputGroup}>
              <label htmlFor={formProps.monthlyId}>{formProps.monthlyLabel}</label>
              <input
                id={formProps.monthlyId}
                type="number"
                inputMode="decimal"
                value={formProps.monthlyValue}
                onChange={formProps.onMonthlyChange}
                placeholder={formProps.monthlyPlaceholder}
                min="0"
                step="100"
              />
            </div>
            <button type="submit">{formProps.saveLabel}</button>
          </form>
        ) : null}
      </div>
    </section>
  );
}
