import { useState, useEffect } from 'react';
import styles from './SellModal.module.css';
import { useLanguage } from '../i18n';

export default function SellModal({ show, stock, onClose, onSubmit }) {
  const { lang } = useLanguage();
  const [quantity, setQuantity] = useState(1);
  useEffect(() => {
    if (stock) setQuantity(stock.total_quantity);
  }, [stock]);
  if (!show || !stock) return null;
  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <h5 className={styles.title}>{lang === 'en' ? 'Sell Stock' : '賣出股票'}</h5>
        <p className={styles.text}>{lang === 'en' ? 'Stock:' : '股票：'}{stock.stock_id} - {stock.stock_name}</p>
        <div className={styles.formGroup}>
          <label className={styles.label}>{lang === 'en' ? 'Sell Quantity:' : '賣出數量：'}</label>
          <input
            type="number"
            min={1}
            max={stock.total_quantity}
            step={1}
            value={quantity}
            onChange={e => {
              let val = Math.floor(Number(e.target.value));
              if (!val) val = 1;
              if (val > stock.total_quantity) val = stock.total_quantity;
              if (val < 1) val = 1;
              setQuantity(val);
            }}
            className={styles.input}
          />
        </div>
        <div className={styles.buttonRow}>
          <button onClick={() => { onSubmit(stock.stock_id, quantity); }} className={styles.primaryButton}>{lang === 'en' ? 'Confirm' : '確認'}</button>
          <button onClick={onClose} className={styles.secondaryButton}>{lang === 'en' ? 'Close' : '關閉'}</button>
        </div>
      </div>
    </div>
  );
}
