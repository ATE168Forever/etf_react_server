import { useState } from 'react';
import styles from './CoverageProgress.module.css';
import { formatTwd } from '../utils/homeCurrencyFormat';
import { saveLivingCost } from '../utils/livingCostStorage';

export default function CoverageProgress({
  monthlyLivingCost, isLivingCostSet, coveragePercent, hasUsAmount, t, onLivingCostSaved
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftValue, setDraftValue] = useState(String(monthlyLivingCost || ''));

  const handleSave = () => {
    const numericValue = Number(draftValue);
    const safeValue = Number.isFinite(numericValue) && numericValue >= 0 ? numericValue : 0;
    saveLivingCost(safeValue);
    setIsEditing(false);
    onLivingCostSaved(safeValue);
  };

  const displayPercent = coveragePercent === null ? 0 : coveragePercent;
  const clampedPercent = Math.max(0, Math.min(100, displayPercent));

  return (
    <section className={styles.card} aria-label={t('coverage_card_title')}>
      <h3 className={styles.title}>{t('coverage_card_title')}</h3>

      {!isLivingCostSet && !isEditing && (
        <button type="button" className={styles.ctaButton} onClick={() => setIsEditing(true)}>
          {t('coverage_living_cost_cta')}
        </button>
      )}

      {isLivingCostSet && !isEditing && (
        <button
          type="button"
          className={styles.editButton}
          onClick={() => {
            setDraftValue(String(monthlyLivingCost || ''));
            setIsEditing(true);
          }}
        >
          {t('coverage_living_cost_edit')}
        </button>
      )}

      {isEditing && (
        <div className={styles.editRow}>
          <input
            type="number"
            min="0"
            value={draftValue}
            placeholder={t('coverage_living_cost_placeholder')}
            onChange={(e) => setDraftValue(e.target.value)}
          />
          <button type="button" onClick={handleSave}>{t('coverage_living_cost_save')}</button>
        </div>
      )}

      {isLivingCostSet && (
        <>
          <div
            className={styles.progressBar}
            role="progressbar"
            aria-valuenow={displayPercent}
            aria-valuemin={0}
            aria-valuemax={Math.max(100, displayPercent)}
            aria-label={t('coverage_card_title')}
          >
            <div className={styles.progressFill} style={{ width: `${clampedPercent}%` }} />
          </div>
          <p className={styles.percentLabel}>{displayPercent}%</p>
          <p className={styles.livingCostLine}>
            {t('coverage_living_cost_label')}: {formatTwd(monthlyLivingCost)}
          </p>
        </>
      )}

      {hasUsAmount && (
        <p className={styles.disclaimer}>{t('us_dividend_pretax_disclaimer')}</p>
      )}
    </section>
  );
}
