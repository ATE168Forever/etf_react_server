import { useEffect, useRef } from 'react';
import styles from './QuickPurchaseModal.module.css';
import useFocusTrap from '../hooks/useFocusTrap';

function getCurrencySymbol(country, messages) {
  const code = typeof country === 'string' ? country.trim().toUpperCase() : '';
  if (code === 'US' || code === 'USA') {
    return messages.quickAddCurrencyUsd;
  }
  return messages.quickAddCurrencyTwd;
}

export default function QuickPurchaseModal({ show, onClose, rows, setRows, onSubmit, messages }) {
  const modalRef = useRef(null);
  useFocusTrap(modalRef, show);
  useEffect(() => {
    if (!show) return;
    const onKeyDown = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [show, onClose]);
  if (!show) return null;

  const list = Array.isArray(rows) ? rows : [];

  const handleToggle = index => {
    setRows(prev => {
      if (!Array.isArray(prev)) return prev;
      return prev.map((row, idx) => (idx === index ? { ...row, enabled: !row.enabled } : row));
    });
  };

  const handleFieldChange = (index, field) => event => {
    const value = event.target.value;
    setRows(prev => {
      if (!Array.isArray(prev)) return prev;
      return prev.map((row, idx) => (idx === index ? { ...row, [field]: value } : row));
    });
  };

  const hasRows = list.length > 0;

  const selectedCount = list.filter(row => row?.enabled).length;

  return (
    <div className={styles.overlay} role="presentation">
      <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="quick-purchase-modal-title" ref={modalRef}>
        <h5 id="quick-purchase-modal-title" className={styles.title}>{messages.quickAddTitle}</h5>
        {hasRows ? (
          <div className={styles.tableWrapper}>
            <div className={styles.selectionSummary}>
              {messages.quickAddSelectionSummary?.replace('{count}', selectedCount) ?? `Selected ETFs: ${selectedCount}`}
            </div>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">#</th>
                  <th scope="col">{messages.quickAddNoPurchase}</th>
                  <th scope="col">{messages.stockCodeName}</th>
                  <th scope="col">{messages.quickAddDate}</th>
                  <th scope="col">{messages.quickAddQuantity}</th>
                  <th scope="col">{messages.quickAddPrice}</th>
                </tr>
              </thead>
              <tbody>
                {list.map((row, index) => {
                  const disabled = !row.enabled;
                  const currencySymbol = getCurrencySymbol(row.country, messages);
                  return (
                    <tr key={row.stock_id || index} className={disabled ? styles.disabledRow : ''}>
                      <td>{index + 1}</td>
                      <td>
                        <button
                          type="button"
                          className={styles.skipButton}
                          onClick={() => handleToggle(index)}
                          aria-pressed={!disabled}
                          aria-label={`${row.stock_id} ${row.stock_name || ''} - ${disabled ? (messages.quickAddNoPurchase || 'skip') : (messages.quickAddDate || 'include')}`}
                        >
                          {disabled ? 'N' : 'Y'}
                        </button>
                      </td>
                      <td className={styles.stockColumn}>
                        <div className={styles.stockInfo}>
                          <span className={styles.stockId}>{row.stock_id}</span>
                          {row.stock_name && <span className={styles.stockName}>{row.stock_name}</span>}
                        </div>
                      </td>
                      <td>
                        <input
                          type="date"
                          value={row.date || ''}
                          onChange={handleFieldChange(index, 'date')}
                          disabled={disabled}
                          aria-label={`${row.stock_id} ${messages.quickAddDate}`}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={row.quantity ?? ''}
                          onChange={handleFieldChange(index, 'quantity')}
                          disabled={disabled}
                          placeholder={messages.quickAddPlaceholderQuantity}
                          aria-label={`${row.stock_id} ${messages.quickAddQuantity}`}
                        />
                      </td>
                      <td>
                        <div className={styles.priceField}>
                          <span className={styles.currency}>{currencySymbol}</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={row.price ?? ''}
                            onChange={handleFieldChange(index, 'price')}
                            disabled={disabled}
                            placeholder={messages.quickAddPlaceholderPrice}
                            aria-label={`${row.stock_id} ${messages.quickAddPrice}`}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className={styles.emptyState}>{messages.quickAddEmpty}</div>
        )}
        <div className={styles.buttonRow}>
          <button type="button" className={styles.primaryButton} onClick={onSubmit} disabled={!hasRows}>
            {messages.quickAddSave}
          </button>
          <button type="button" autoFocus className={styles.secondaryButton} onClick={onClose}>
            {messages.quickAddClose}
          </button>
        </div>
      </div>
    </div>
  );
}
