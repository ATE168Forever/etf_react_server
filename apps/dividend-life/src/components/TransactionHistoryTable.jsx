import styles from './TransactionHistoryTable.module.css';
import { HOST_URL } from '../../config';
import { useLanguage } from '../i18n';
import TooltipText from './TooltipText';

export default function TransactionHistoryTable({ transactionHistory, stockList, editingIdx, editForm, setEditForm, setEditingIdx, handleEditSave, handleDelete }) {
  const { lang } = useLanguage();
  return (
    <div className="table-responsive">
      <table className={`table table-bordered table-striped ${styles.table}`} aria-label={lang === 'en' ? 'Transaction history' : '交易紀錄'}>
        <thead>
          <tr>
            <th scope="col" className="stock-col">{lang === 'en' ? 'Stock Code/Name' : '股票代碼/名稱'}</th>
            <th scope="col">{lang === 'en' ? 'Transaction Date' : '交易日期'}</th>
            <th scope="col">{lang === 'en' ? 'Quantity (shares)' : '數量(股)'}</th>
            <th scope="col">{lang === 'en' ? 'Price(NT$)' : '價格(元)'}</th>
            <th scope="col">{lang === 'en' ? 'Type' : '類型'}</th>
            <th scope="col" className={styles.operationCol}>{lang === 'en' ? 'Actions' : '操作'}</th>
          </tr>
        </thead>
        <tbody>
          {transactionHistory.length === 0 ? (
            <tr><td colSpan={6}>{lang === 'en' ? 'No transaction records' : '尚無交易紀錄'}</td></tr>
          ) : (
            transactionHistory.map((item, idx) => {
              const stock = stockList.find(s => s.stock_id === item.stock_id) || {};
              const isUsStock = (stock.country || '').toUpperCase() === 'US';
              const isEditing = editingIdx === idx;
              const name = stock.stock_name || item.stock_name || '';
              return (
                <tr key={idx}>
                  <td className="stock-col">
                    <a href={`${HOST_URL}/stock/${item.stock_id}`} target="_blank" rel="noreferrer"
                      aria-label={`${item.stock_id} ${name} (${lang === 'en' ? 'opens in new tab' : '開啟新分頁'})`}>
                      <TooltipText tooltip={name}>
                        <span>
                          {item.stock_id}
                        </span>
                      </TooltipText>
                    </a>
                  </td>
                  <td>
                    {isEditing ? (
                      <input
                        type="date"
                        value={editForm.date}
                        onChange={e => setEditForm(f => ({ ...f, date: e.target.value }))}
                        aria-label={lang === 'en' ? 'Transaction date' : '交易日期'}
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
                        aria-label={lang === 'en' ? 'Quantity (shares)' : '數量（股）'}
                      />
                    ) : (
                      isUsStock ? (
                        item.quantity
                      ) : (
                        <>
                          {item.quantity} ({(item.quantity / 1000).toFixed(3).replace(/\.0+$/, '')} {lang === 'en' ? 'lots' : '張'})
                        </>
                      )
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
                          aria-label={lang === 'en' ? 'Price (NT$)' : '價格（元）'}
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
                          <button type="button" onClick={() => handleEditSave(idx)}>{lang === 'en' ? 'Save' : '儲存'}</button>
                          <button type="button" onClick={() => setEditingIdx(null)} className={styles.actionButton}>{lang === 'en' ? 'Cancel' : '取消'}</button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            aria-label={lang === 'en' ? `Edit ${item.stock_id} ${name}` : `修改 ${item.stock_id} ${name}`}
                            onClick={() => {
                              setEditingIdx(idx);
                              setEditForm({ date: item.date, quantity: item.quantity, price: item.price });
                            }}
                          >
                            {lang === 'en' ? 'Edit' : '修改'}
                          </button>
                          <button
                            type="button"
                            aria-label={lang === 'en' ? `Delete ${item.stock_id} ${name}` : `刪除 ${item.stock_id} ${name}`}
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
