import styles from './InvestmentGoalCard.module.css';

export default function InvestmentGoalCard({ title, metrics = [], rows, savedMessage, form, emptyState }) {
  const { isVisible: formIsVisible = true, toggle: formToggle, id: formId, ...formProps } = form || {};
  const typeOptions = Array.isArray(formProps.typeOptions) ? formProps.typeOptions : [];
  const formSections = Array.isArray(formProps.sections)
    ? formProps.sections.map((section, index) => {
        const content = typeof section?.render === 'function' ? section.render() : section?.content;
        if (!content) return null;
        return {
          key: section.id || section.key || `section-${index}`,
          content
        };
      }).filter(Boolean)
    : [];
  const shouldShowTargetInput = !formProps.targetHidden && Boolean(formProps.targetLabel);
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
            {metrics.map(metric => {
              const metricClassName = [
                styles.metric,
                metric.isActive ? styles.metricActive : '',
                metric.highlight ? styles.metricHighlight : '',
                metric.showCelebration ? styles.metricCelebrate : ''
              ].filter(Boolean).join(' ');
              const metricValueClassName = [
                styles.metricValue,
                metric.showCelebration ? styles.metricValueCelebrate : ''
              ].filter(Boolean).join(' ');
              return (
                <div key={metric.id} className={metricClassName}>
                  <div className={styles.metricLabel}>{metric.label}</div>
                  <div className={metricValueClassName}>
                    {metric.value}
                    {metric.showCelebration ? (
                      <span className={styles.metricCelebrateIcon} aria-hidden="true">
                        🎆
                      </span>
                    ) : null}
                  </div>
                </div>
              );
            })}
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
            {formProps.typeLabel ? (
              <div className={styles.inputGroup}>
                <label htmlFor={formProps.typeId}>{formProps.typeLabel}</label>
                <select
                  id={formProps.typeId}
                  value={formProps.typeValue}
                  onChange={formProps.onTypeChange}
                >
                  {typeOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            {shouldShowTargetInput ? (
              <div className={styles.inputGroup}>
                <label htmlFor={formProps.targetId}>{formProps.targetLabel}</label>
                <input
                  id={formProps.targetId}
                  type="number"
                  inputMode="decimal"
                  value={formProps.targetValue}
                  onChange={formProps.onTargetChange}
                  placeholder={formProps.targetPlaceholder}
                  min={formProps.targetMin || '0'}
                  step={formProps.targetStep || '100'}
                />
              </div>
            ) : null}
            {formSections.map(section => (
              <div key={section.key} className={styles.formSection}>
                {section.content}
              </div>
            ))}
            <div className={styles.inputGroup}>
              <label>{formProps.saveLabel}</label>
              <button type="submit" style={{ width: "fit-content" }}>{formProps.saveButton}</button>
            </div>
          </form>
        ) : null}
      </div>
    </section>
  );
}
