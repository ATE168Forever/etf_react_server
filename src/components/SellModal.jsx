import { useState, useEffect } from 'react';
import styles from './SellModal.module.css';

export default function SellModal({ show, stock, onClose, onSubmit }) {
  const [quantity, setQuantity] = useState(1);
  useEffect(() => {
    if (stock) setQuantity(stock.total_quantity);
  }, [stock]);
  if (!show || !stock) return null;
  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <h5 className={styles.title}>賣出股票</h5>
        <p className={styles.text}>股票：{stock.stock_id} - {stock.stock_name}</p>
        <div className={styles.formGroup}>
          <label className={styles.label}>賣出數量：</label>
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
          <button onClick={() => { onSubmit(stock.stock_id, quantity); }} className={styles.primaryButton}>確認</button>
          <button onClick={onClose} className={styles.secondaryButton}>關閉</button>
        </div>
      </div>
    </div>
  );
}
