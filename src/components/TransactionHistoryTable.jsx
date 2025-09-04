import styles from './TransactionHistoryTable.module.css';

export default function TransactionHistoryTable({ transactionHistory, stockList, editingIdx, editForm, setEditForm, setEditingIdx, handleEditSave, handleDelete }) {
  return (
    <div className="table-responsive">
      <table className={`table table-bordered table-striped ${styles.table}`}>
        <thead>
          <tr>
            <th>代碼</th>
            <th>名稱</th>
            <th>交易日期</th>
            <th>數量(股)</th>
            <th>價格(元)</th>
            <th>類型</th>
            <th className={styles.operationCol}>操作</th>
          </tr>
        </thead>
        <tbody>
          {transactionHistory.length === 0 ? (
            <tr><td colSpan={6}>尚無交易紀錄</td></tr>
          ) : (
            transactionHistory.map((item, idx) => {
              const stock = stockList.find(s => s.stock_id === item.stock_id) || {};
              const isEditing = editingIdx === idx;
              return (
                <tr key={idx}>
                  <td>{item.stock_id}</td>
                  <td>{stock.stock_name || ''}</td>
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
                        {item.quantity} ({(item.quantity / 1000).toFixed(3).replace(/\.0+$/, '')} 張)
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
                  <td>{item.type === 'sell' ? '賣出' : '買入'}</td>
                  <td className={styles.operationCol}>
                    {isEditing ? (
                      <>
                        <button onClick={() => handleEditSave(idx)}>儲存</button>
                        <button onClick={() => setEditingIdx(null)} className={styles.actionButton}>取消</button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            setEditingIdx(idx);
                            setEditForm({ date: item.date, quantity: item.quantity, price: item.price });
                          }}
                        >
                          修改
                        </button>
                        <button
                          onClick={() => handleDelete(idx)}
                          className={styles.actionButton}
                        >
                          刪除
                        </button>
                      </>
                    )}
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
