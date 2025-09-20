import Select from 'react-select';
import styles from './AddTransactionModal.module.css';
import { useLanguage } from '../i18n';
import selectStyles from '../selectStyles';

export default function AddTransactionModal({ show, onClose, stockList, form, setForm, onSubmit }) {
  const { lang } = useLanguage();
  if (!show) return null;
  const options = stockList.map(s => ({
    value: s.stock_id,
    label: `${s.stock_id} - ${s.stock_name}${s.dividend_frequency ? '' : ' x'}`,
    isDisabled: !s.dividend_frequency
  }));
  const selectedOption = options.find(o => o.value === form.stock_id) || null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <h5 className={styles.title}>{lang === 'en' ? 'Add Purchase Record' : '新增購買紀錄'}</h5>
        <div className={styles.form}>
          <div className={styles.formGroup}>
            <label className={styles.label}>{lang === 'en' ? 'Stock:' : '股票：'}</label>
            <div className={styles.inputWrapper}>
              <Select
                options={options}
                value={selectedOption}
                onChange={option => {
                  const stock = stockList.find(s => s.stock_id === (option ? option.value : ''));
                  setForm(f => ({
                    ...f,
                    stock_id: option ? option.value : '',
                    stock_name: stock ? stock.stock_name : ''
                  }));
                }}
                placeholder={lang === 'en' ? 'Search or select stock' : '搜尋或選擇股票'}
                isClearable
                styles={selectStyles}                     // ⬅️ apply custom styles
              />
            </div>
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>{lang === 'en' ? 'Purchase Date:' : '購買日期：'}</label>
            <input
              type="date"
              value={form.date}
              data-testid="date-input"
              onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              className={styles.input}
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>{lang === 'en' ? 'Quantity (shares):' : '數量（股）：'}</label>
            <input
              type="number"
              min={1000}
              value={form.quantity}
              step={1000}
              data-testid="quantity-input"
              onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
              className={styles.input}
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>{lang === 'en' ? 'Price (NT$):' : '價格（元）：'}</label>
            <input
              type="number"
              min={0}
              step={0.01}
              value={form.price}
              data-testid="price-input"
              onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
              className={styles.input}
            />
          </div>
        </div>
        <div className={styles.buttonRow}>
          <button onClick={onSubmit} className={styles.primaryButton}>{lang === 'en' ? 'Save' : '儲存'}</button>
          <button onClick={onClose} className={styles.secondaryButton}>{lang === 'en' ? 'Close' : '關閉'}</button>
        </div>
      </div>
    </div>
  );
}
