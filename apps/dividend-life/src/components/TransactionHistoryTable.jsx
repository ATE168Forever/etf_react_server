import styles from './TransactionHistoryTable.module.css';
import { HOST_URL } from '../../../shared/config';
import { useLanguage } from '../i18n';

export default function TransactionHistoryTable({ transactionHistory, stockList, editingIdx, editForm, setEditForm, setEditingIdx, handleEditSave, handleDelete }) {
  const { lang } = useLanguage();
  return (
    <div className="table-responsive">
      <table className={`table table-bordered table-striped ${styles.table}`}>
        <thead>
          <tr>
            <th className="stock-col">{lang === 'en' ? 'Stock Code/Name' : '股票代碼/名稱'}</th>
            <th>{lang === 'en' ? 'Transaction Date' : '交易日期'}</th>
            <th>{lang === 'en' ? 'Quantity (shares)' : '數量(股)'}</th>
            <th>{lang === 'en' ? 'Price(NT$)' : '價格(元)'}</th>
            <th>{lang === 'en' ? 'Type' : '類型'}</th>
            <th className={styles.operationCol}>{lang === 'en' ? 'Actions' : '操作'}</th>
          </tr>
        </thead>
        <tbody>
          {transactionHistory.length === 0 ? (
            <tr><td colSpan={6}>{lang === 'en' ? 'No transaction records' : '尚無交易紀錄'}</td></tr>
          ) : (
            transactionHistory.map((item, idx) => {
              const stock = stockList.find(s => s.stock_id === item.stock_id) || {};
              const isEditing = editingIdx === idx;
              const name = stock.stock_name || item.stock_name || '';
              return (
                <tr key={idx}>
                  <td className="stock-col">
                    <a href={`${HOST_URL}/stock/${item.stock_id}`} target="_blank" rel="noreferrer">
                      {item.stock_id} {name}
                    </a>
                  </td>
                  <td>
                    {isEditing ? (
                      <input
                        type="date"
                        value={editForm.date}
                        onChange={e => setEditForm(f => ({ ...f, date: e.target.value }))}
                      />
                    ) : (
                      item.date
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <input
                        type="number"
                        min={item.type === 'buy' ? 1000 : 1}
                        step={item.type === 'buy' ? 1000 : 1}
                        value={editForm.quantity}
                        onChange={e => setEditForm(f => ({ ...f, quantity: e.target.value }))}
                        className={styles.smallInput}
                      />
                    ) : (
                      <>
                        {item.quantity} ({(item.quantity / 1000).toFixed(3).replace(/\.0+$/, '')} {lang === 'en' ? 'lots' : '張'})
                      </>
                    )}
                  </td>
                  <td>
                    {item.type === 'buy' ? (
                      isEditing ? (
                        <input
                          type="number"
                          step={0.01}
                          value={editForm.price}
                          onChange={e => setEditForm(f => ({ ...f, price: e.target.value }))}
                          className={styles.smallInput}
                        />
                      ) : (
                        item.price
                      )
                    ) : (
                      '-'
                    )}
                  </td>
                  <td>{item.type === 'sell' ? (lang === 'en' ? 'Sell' : '賣出') : (lang === 'en' ? 'Buy' : '買入')}</td>
                  <td className={styles.operationCol}>
                    <div className={styles.actions}>
                      {isEditing ? (
                        <>
                          <button onClick={() => handleEditSave(idx)}>{lang === 'en' ? 'Save' : '儲存'}</button>
                          <button onClick={() => setEditingIdx(null)} className={styles.actionButton}>{lang === 'en' ? 'Cancel' : '取消'}</button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              setEditingIdx(idx);
                              setEditForm({ date: item.date, quantity: item.quantity, price: item.price });
                            }}
                          >
                            {lang === 'en' ? 'Edit' : '修改'}
                          </button>
                          <button
                            onClick={() => handleDelete(idx)}
                            className={styles.actionButton}
                          >
                            {lang === 'en' ? 'Delete' : '刪除'}
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
