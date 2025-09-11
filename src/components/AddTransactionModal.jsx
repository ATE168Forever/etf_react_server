import Select from 'react-select';
import styles from './AddTransactionModal.module.css';

const selectStyles = {
  control: provided => ({
    ...provided,
    backgroundColor: 'var(--color-card-bg)',
    borderColor: 'var(--color-border)',
    color: 'var(--color-text)'
  }),
  input: provided => ({
    ...provided,
    color: 'var(--color-text)'
  }),
  singleValue: provided => ({
    ...provided,
    color: 'var(--color-text)'
  }),
  menu: provided => ({
    ...provided,
    backgroundColor: 'var(--color-card-bg)',
    color: 'var(--color-text)',
    zIndex: 1100
  }),
  option: (provided, state) => ({
    ...provided,
    backgroundColor: state.isFocused ? 'var(--color-row-even)' : 'var(--color-card-bg)',
    color: 'var(--color-text)'
  })
};

export default function AddTransactionModal({ show, onClose, stockList, form, setForm, onSubmit }) {
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
        <h5 className={styles.title}>新增購買紀錄</h5>
        <div className={styles.form}>
          <div className={styles.formGroup}>
            <label className={styles.label}>股票：</label>
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
                placeholder="搜尋或選擇股票"
                isClearable
                styles={selectStyles}                     // ⬅️ apply custom styles
              />
            </div>
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>購買日期：</label>
            <input
              type="date"
              value={form.date}
              data-testid="date-input"
              onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              className={styles.input}
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>數量（股）：</label>
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
            <label className={styles.label}>價格（元）：</label>
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
          <button onClick={onSubmit} className={styles.primaryButton}>儲存</button>
          <button onClick={onClose} className={styles.secondaryButton}>關閉</button>
        </div>
      </div>
    </div>
  );
}
