import styles from './QuickPurchaseModal.module.css';

function getCurrencySymbol(country, messages) {
  const code = typeof country === 'string' ? country.trim().toUpperCase() : '';
  if (code === 'US' || code === 'USA') {
    return messages.quickAddCurrencyUsd;
  }
  return messages.quickAddCurrencyTwd;
}

export default function QuickPurchaseModal({ show, onClose, rows, setRows, onSubmit, messages }) {
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

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <h5 className={styles.title}>{messages.quickAddTitle}</h5>
        {hasRows ? (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>{messages.quickAddNoPurchase}</th>
                  <th>{messages.stockCodeName}</th>
                  <th>{messages.quickAddDate}</th>
                  <th>{messages.quickAddQuantity}</th>
                  <th>{messages.quickAddPrice}</th>
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
                        >
                          {disabled ? messages.quickAddResume : messages.quickAddNoPurchase}
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
          <button type="button" className={styles.secondaryButton} onClick={onClose}>
            {messages.quickAddClose}
          </button>
        </div>
      </div>
    </div>
  );
}
