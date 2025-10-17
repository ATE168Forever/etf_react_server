import { useEffect, useId, useRef, useState } from 'react';
import styles from './InvestmentGoalCard.module.css';

export default function InvestmentGoalCard({
  title,
  metrics = [],
  rows = [],
  savedMessage,
  form,
  emptyState,
  share
}) {
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
  const metricsList = Array.isArray(metrics) ? metrics : [];
  const goalRows = Array.isArray(rows) ? rows : [];

  const shareConfig = share && typeof share === 'object' ? share : null;
  const shareMessage = typeof shareConfig?.message === 'string' ? shareConfig.message.trim() : '';
  const shareDestinations = typeof shareConfig?.destinations === 'string'
    ? shareConfig.destinations.trim()
    : '';
  const shareDestinationsFallback = typeof shareConfig?.destinationsFallback === 'string'
    ? shareConfig.destinationsFallback.trim()
    : '';
  const shareDestinationsNote = typeof shareConfig?.destinationsNote === 'string'
    ? shareConfig.destinationsNote.trim()
    : '';
  const hasShareContent = Boolean(shareMessage);
  const [hasNativeShare, setHasNativeShare] = useState(false);
  const [shareStatus, setShareStatus] = useState('idle');
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [shareDraft, setShareDraft] = useState(shareMessage);
  const statusResetRef = useRef(null);
  const shareMessageFieldId = useId();
  const shareDialogLabelId = shareConfig?.previewLabel ? `${shareMessageFieldId}-label` : undefined;

  useEffect(() => {
    if (!hasShareContent) {
      setHasNativeShare(false);
      return;
    }
    setHasNativeShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function');
  }, [hasShareContent]);

  useEffect(() => () => {
    if (statusResetRef.current) {
      clearTimeout(statusResetRef.current);
    }
  }, []);

  useEffect(() => {
    setShareStatus('idle');
    if (statusResetRef.current) {
      clearTimeout(statusResetRef.current);
    }
    setShareDraft(shareMessage);
  }, [shareMessage]);

  const updateShareStatus = (nextStatus) => {
    setShareStatus(nextStatus);
    if (statusResetRef.current) {
      clearTimeout(statusResetRef.current);
    }
    if (nextStatus !== 'idle') {
      statusResetRef.current = setTimeout(() => {
        setShareStatus('idle');
      }, 2400);
    }
  };

  const copyShareMessage = async (text) => {
    if (!hasShareContent || !text) {
      return false;
    }
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {
      // fall back to manual copy
    }
    if (typeof document === 'undefined') {
      return false;
    }
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.top = '-1000px';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const success = document.execCommand ? document.execCommand('copy') : false;
      document.body.removeChild(textarea);
      return success;
    } catch {
      return false;
    }
  };

  const currentShareText = shareDraft?.trim() || shareMessage;

  const handleCopyClick = async () => {
    const success = await copyShareMessage(currentShareText);
    updateShareStatus(success ? 'copied' : 'error');
  };

  const handleShareButtonClick = () => {
    if (!hasShareContent) {
      return;
    }
    setIsShareDialogOpen(true);
    updateShareStatus('idle');
  };

  const closeShareDialog = () => {
    setIsShareDialogOpen(false);
    updateShareStatus('idle');
  };

  const handleModalShareClick = async () => {
    if (!hasShareContent || !currentShareText) {
      return;
    }
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      const defaultShareTitle = shareConfig?.title
        || shareConfig?.heading
        || (typeof document !== 'undefined' ? document.title : '');
      try {
        await navigator.share({
          title: defaultShareTitle,
          text: currentShareText
        });
        updateShareStatus('shared');
        return;
      } catch (error) {
        if (error?.name === 'AbortError') {
          return;
        }
      }
    }
    const success = await copyShareMessage(currentShareText);
    updateShareStatus(success ? 'copied' : 'error');
  };

  const copyButtonLabel = shareStatus === 'copied'
    ? shareConfig?.copiedFeedback || shareConfig?.copyButtonLabel
    : shareConfig?.copyButtonLabel;
  const shareStatusMessage = shareStatus === 'shared'
    ? shareConfig?.sharedFeedback
    : shareStatus === 'error'
      ? shareConfig?.copyError
      : shareStatus === 'copied'
        ? shareConfig?.copiedFeedback
        : '';
  const shareFeedbackClassName = [
    styles.shareFeedback,
    shareStatus === 'error'
      ? styles.shareFeedbackError
      : shareStatus === 'shared'
        ? styles.shareFeedbackNeutral
        : shareStatus === 'copied'
          ? styles.shareFeedbackSuccess
          : ''
  ].filter(Boolean).join(' ');

  return (
    <section className={styles.card}>
      <div className={styles.header}>
        <h5>{title}</h5>
        {savedMessage ? <span className={styles.savedMessage}>{savedMessage}</span> : null}
      </div>
      <div className={styles.body}>
        {metricsList.length > 0 ? (
          <div className={styles.metrics}>
            {metricsList.map(metric => {
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
        {goalRows.map(row => (
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
        {hasShareContent ? (
          <div className={styles.shareSection}>
            <div className={styles.shareHeaderText}>
              {shareConfig?.heading ? (
                <h6 className={styles.shareTitle}>{shareConfig.heading}</h6>
              ) : null}
              {shareConfig?.description ? (
                <p className={styles.shareDescription}>{shareConfig.description}</p>
              ) : null}
            </div>
            <div className={styles.shareButtons}>
              <button
                type="button"
                className={styles.sharePrimaryButton}
                onClick={handleShareButtonClick}
                aria-label={shareConfig?.shareAriaLabel || shareConfig?.shareButtonLabel}
              >
                {shareConfig?.shareButtonLabel}
              </button>
            </div>
          </div>
        ) : null}
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
      {hasShareContent && isShareDialogOpen ? (
        <div
          className={styles.shareModalOverlay}
          role="presentation"
          onClick={closeShareDialog}
        >
          <div
            className={styles.shareModal}
            role="dialog"
            aria-modal="true"
            aria-labelledby={shareDialogLabelId}
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.shareModalHeader}>
              <div>
                {shareConfig?.heading ? (
                  <h6 className={styles.shareModalTitle}>{shareConfig.heading}</h6>
                ) : null}
                {shareConfig?.description ? (
                  <p className={styles.shareModalDescription}>{shareConfig.description}</p>
                ) : null}
              </div>
              <button
                type="button"
                className={styles.shareModalClose}
                onClick={closeShareDialog}
                aria-label={shareConfig?.closeAriaLabel || shareConfig?.closeLabel || 'Close'}
              >
                ×
              </button>
            </div>
            <div className={styles.shareModalBody}>
              {shareConfig?.previewLabel ? (
                <label
                  id={shareDialogLabelId}
                  htmlFor={shareMessageFieldId}
                  className={styles.shareModalLabel}
                >
                  {shareConfig.previewLabel}
                </label>
              ) : null}
              <textarea
                id={shareMessageFieldId}
                className={styles.shareModalTextarea}
                value={shareDraft}
                onChange={(event) => setShareDraft(event.target.value)}
              />
              {(hasNativeShare ? shareDestinations : shareDestinationsFallback || shareDestinations) ? (
                <p className={styles.shareDestinations}>
                  {shareConfig?.destinationsLabel ? (
                    <strong>{shareConfig.destinationsLabel}</strong>
                  ) : null}
                  {shareConfig?.destinationsLabel ? ' ' : null}
                  {hasNativeShare ? shareDestinations : shareDestinationsFallback || shareDestinations}
                </p>
              ) : null}
              {shareDestinationsNote ? (
                <p className={styles.shareDestinationsNote}>{shareDestinationsNote}</p>
              ) : null}
              {!hasNativeShare && shareConfig?.shareUnavailable ? (
                <p className={styles.shareUnavailable}>{shareConfig.shareUnavailable}</p>
              ) : null}
            </div>
            {shareStatusMessage ? (
              <div className={shareFeedbackClassName} role="status" aria-live="polite">
                {shareStatusMessage}
              </div>
            ) : null}
            <div className={styles.shareModalActions}>
              <button
                type="button"
                className={styles.sharePrimaryButton}
                onClick={handleModalShareClick}
                disabled={!hasNativeShare}
              >
                {shareConfig?.shareButtonLabel}
              </button>
              <button
                type="button"
                className={styles.shareCopyButton}
                onClick={handleCopyClick}
              >
                {copyButtonLabel || shareConfig?.copyButtonLabel}
              </button>
              <button
                type="button"
                className={styles.shareSecondaryButton}
                onClick={closeShareDialog}
              >
                {shareConfig?.closeLabel || 'Close'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
