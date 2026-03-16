import { useEffect } from 'react';
import Select from 'react-select';
import styles from './AddTransactionModal.module.css';
import { useLanguage } from '../i18n';
import selectStyles from '../selectStyles';

const createBlankEntry = () => ({ stock_id: '', stock_name: '', quantity: '', price: '' });

export default function AddTransactionModal({ show, onClose, stockList, form, setForm, onSubmit }) {
  const { lang } = useLanguage();
  useEffect(() => {
    if (!show) return;
    const onKeyDown = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [show, onClose]);
  if (!show) return null;
  const options = stockList.map(s => ({
    value: s.stock_id,
    label: `${s.stock_id} - ${s.stock_name}${s.dividend_frequency ? '' : ' x'}`,
    isDisabled: !s.dividend_frequency
  }));

  const entries = Array.isArray(form?.entries) && form.entries.length
    ? form.entries
    : [
        {
          stock_id: form?.stock_id || '',
          stock_name: form?.stock_name || '',
          quantity: form?.quantity || '',
          price: form?.price || ''
        }
      ];

  const updateEntries = updater => {
    setForm(prev => {
      const prevEntries = Array.isArray(prev?.entries) && prev.entries.length
        ? prev.entries
        : [createBlankEntry()];
      const nextEntries = updater(prevEntries);
      return {
        ...prev,
        entries: nextEntries
      };
    });
  };

  const handleEntrySelectChange = (index, option) => {
    updateEntries(prevEntries => {
      const next = prevEntries.map((entry, idx) => {
        if (idx !== index) return entry;
        const stock = stockList.find(s => s.stock_id === (option ? option.value : ''));
        return {
          ...entry,
          stock_id: option ? option.value : '',
          stock_name: stock ? stock.stock_name : ''
        };
      });
      return next;
    });
  };

  const handleEntryFieldChange = (index, field) => event => {
    const value = event.target.value;
    updateEntries(prevEntries => {
      const next = prevEntries.map((entry, idx) => (idx === index ? { ...entry, [field]: value } : entry));
      return next;
    });
  };

  const handleAddEntry = () => {
    updateEntries(prevEntries => [...prevEntries, createBlankEntry()]);
  };

  const handleRemoveEntry = index => {
    updateEntries(prevEntries => {
      const next = prevEntries.filter((_, idx) => idx !== index);
      return next.length ? next : [createBlankEntry()];
    });
  };

  return (
    <div className={styles.overlay} role="presentation">
      <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="add-transaction-modal-title">
        <h5 id="add-transaction-modal-title" className={styles.title}>{lang === 'en' ? 'Add Purchase Record' : '新增購買紀錄'}</h5>
        <div className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="add-tx-date" className={styles.label}>{lang === 'en' ? 'Purchase Date:' : '購買日期：'}</label>
            <input
              id="add-tx-date"
              type="date"
              value={form?.date || ''}
              data-testid="date-input"
              onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              className={styles.input}
              autoFocus
            />
          </div>
          <div className={styles.entryList}>
            {entries.map((entry, index) => {
              const selectedOption = options.find(o => o.value === entry.stock_id) || null;
              return (
                <div key={`entry-${index}`} className={styles.entrySection}>
                  <div className={styles.entryHeader}>
                    <span className={styles.entryTitle}>
                      {lang === 'en' ? `ETF ${index + 1}` : `第 ${index + 1} 檔 ETF`}
                    </span>
                    {entries.length > 1 && (
                      <button
                        type="button"
                        className={styles.removeEntryButton}
                        aria-label={lang === 'en' ? `Remove ETF ${index + 1}` : `刪除第 ${index + 1} 檔 ETF`}
                        onClick={() => handleRemoveEntry(index)}
                      >
                        {lang === 'en' ? 'Remove' : '刪除'}
                      </button>
                    )}
                  </div>
                  <div className={styles.formGroup}>
                    <label htmlFor={`add-tx-stock-${index}`} className={styles.label}>{lang === 'en' ? 'Stock:' : '股票：'}</label>
                    <div className={styles.inputWrapper}>
                      <Select
                        inputId={`add-tx-stock-${index}`}
                        options={options}
                        value={selectedOption}
                        onChange={option => handleEntrySelectChange(index, option)}
                        placeholder={lang === 'en' ? 'Search or select stock' : '搜尋或選擇股票'}
                        isClearable
                        styles={selectStyles}
                      />
                    </div>
                  </div>
                  <div className={styles.formGroup}>
                    <label htmlFor={`add-tx-qty-${index}`} className={styles.label}>{lang === 'en' ? 'Quantity (shares):' : '數量（股）：'}</label>
                    <input
                      id={`add-tx-qty-${index}`}
                      type="number"
                      min={1000}
                      step={1000}
                      value={entry.quantity}
                      data-testid={index === 0 ? 'quantity-input' : undefined}
                      onChange={handleEntryFieldChange(index, 'quantity')}
                      className={styles.input}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label htmlFor={`add-tx-price-${index}`} className={styles.label}>{lang === 'en' ? 'Price (NT$):' : '價格（元）：'}</label>
                    <input
                      id={`add-tx-price-${index}`}
                      type="number"
                      min={0}
                      step={0.01}
                      value={entry.price}
                      data-testid={index === 0 ? 'price-input' : undefined}
                      onChange={handleEntryFieldChange(index, 'price')}
                      className={styles.input}
                    />
                  </div>
                </div>
              );
            })}
            <button type="button" className={styles.addEntryButton} onClick={handleAddEntry}>
              {lang === 'en' ? 'Add another ETF' : '新增一檔 ETF'}
            </button>
          </div>
        </div>
        <div className={styles.buttonRow}>
          <button type="button" onClick={onSubmit} className={styles.primaryButton}>{lang === 'en' ? 'Save' : '儲存'}</button>
          <button type="button" onClick={onClose} className={styles.secondaryButton}>{lang === 'en' ? 'Close' : '關閉'}</button>
        </div>
      </div>
    </div>
  );
}
