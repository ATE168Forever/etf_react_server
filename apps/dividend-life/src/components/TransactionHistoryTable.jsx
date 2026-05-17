import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import styles from './TransactionHistoryTable.module.css';
import { HOST_URL } from '../../config';
import { useLanguage } from '../i18n';
import TooltipText from './TooltipText';
import FilterDropdown from './FilterDropdown';

export default function TransactionHistoryTable({ transactionHistory, stockList, editingIdx, editForm, setEditForm, setEditingIdx, handleEditSave, handleDelete }) {
  const { lang } = useLanguage();
  const [sortKey, setSortKey] = useState('date');
  const [sortDir, setSortDir] = useState('desc');
  const [selectedStockIds, setSelectedStockIds] = useState([]);
  const [showIdDropdown, setShowIdDropdown] = useState(false);
  const [idDropdownPosition, setIdDropdownPosition] = useState(null);
  const idFilterButtonRef = useRef(null);

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir(key === 'date' ? 'desc' : 'asc');
    }
  };

  const stockOptions = useMemo(() => {
    const seen = new Set();
    return transactionHistory
      .filter(item => item.stock_id && !seen.has(item.stock_id) && seen.add(item.stock_id))
      .map(item => {
        const stock = stockList.find(s => s.stock_id === item.stock_id);
        const name = stock?.stock_name || item.stock_name || '';
        return { value: item.stock_id, label: name ? `${item.stock_id} ${name}` : item.stock_id };
      })
      .sort((a, b) => a.value.localeCompare(b.value));
  }, [transactionHistory, stockList]);

  const sortedHistory = useMemo(() => {
    return transactionHistory
      .map((item, origIdx) => {
        const stock = stockList.find(s => s.stock_id === item.stock_id) || {};
        const currency = (stock.country || '').toUpperCase() === 'US' ? 'USD' : 'TWD';
        return { item, origIdx, currency };
      })
      .filter(({ item }) => selectedStockIds.length === 0 || selectedStockIds.includes(item.stock_id))
      .sort(({ item: a, currency: ac }, { item: b, currency: bc }) => {
        if (sortKey === 'stock_id') {
          const av = (a.stock_id || '').toLowerCase();
          const bv = (b.stock_id || '').toLowerCase();
          return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
        }
        if (sortKey === 'date') {
          const av = a.date || '';
          const bv = b.date || '';
          return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
        }
        if (sortKey === 'type') {
          const av = a.type || '';
          const bv = b.type || '';
          return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
        }
        if (sortKey === 'currency') {
          return sortDir === 'asc' ? ac.localeCompare(bc) : bc.localeCompare(ac);
        }
        const av = +(a[sortKey] ?? 0);
        const bv = +(b[sortKey] ?? 0);
        return sortDir === 'asc' ? av - bv : bv - av;
      });
  }, [transactionHistory, stockList, sortKey, sortDir, selectedStockIds]);

  const updateIdDropdownPosition = useCallback(() => {
    if (!showIdDropdown || !idFilterButtonRef.current || typeof window === 'undefined') return;
    const rect = idFilterButtonRef.current.getBoundingClientRect();
    const scrollX = window.scrollX ?? window.pageXOffset ?? 0;
    const scrollY = window.scrollY ?? window.pageYOffset ?? 0;
    const dropdownWidth = 260;
    const viewportRight = scrollX + window.innerWidth;
    const horizontalPadding = 16;
    let left = rect.left + scrollX;
    if (left + dropdownWidth > viewportRight - horizontalPadding) {
      left = Math.max(scrollX + horizontalPadding, viewportRight - dropdownWidth - horizontalPadding);
    }
    setIdDropdownPosition({ top: rect.bottom + scrollY + 8, left });
  }, [showIdDropdown]);

  useEffect(() => {
    if (!showIdDropdown || typeof window === 'undefined') return;
    updateIdDropdownPosition();
    window.addEventListener('scroll', updateIdDropdownPosition, true);
    window.addEventListener('resize', updateIdDropdownPosition);
    return () => {
      window.removeEventListener('scroll', updateIdDropdownPosition, true);
      window.removeEventListener('resize', updateIdDropdownPosition);
    };
  }, [showIdDropdown, updateIdDropdownPosition]);

  useEffect(() => {
    if (!showIdDropdown) setIdDropdownPosition(null);
  }, [showIdDropdown]);

  const thSort = (key, label) => {
    const active = sortKey === key;
    const indicator = active ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ' ⇅';
    const currentState = active ? (sortDir === 'asc' ? (lang === 'en' ? 'ascending' : '升冪') : (lang === 'en' ? 'descending' : '降冪')) : (lang === 'en' ? 'unsorted' : '未排序');
    return (
      <button type="button" className={`sortable${active ? ' sortable--active' : ''}`} onClick={() => handleSort(key)}
        aria-label={lang === 'en' ? `Sort by ${label}, currently ${currentState}` : `依${label}排序，目前${currentState}`}>
        {label}<span className="sort-indicator" aria-hidden="true">{indicator}</span>
      </button>
    );
  };

  const filterLabel = lang === 'en' ? 'Filter by stock code' : '依股票代碼篩選';

  return (
    <div className="table-responsive">
      <table className={`table table-bordered table-striped ${styles.table}`} aria-label={lang === 'en' ? 'Transaction history' : '交易紀錄'}>
        <thead>
          <tr>
            <th scope="col" className="stock-col" aria-sort={sortKey === 'stock_id' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
              {thSort('stock_id', lang === 'en' ? 'Stock Code/Name' : '股票代碼/名稱')}
              <button
                type="button"
                className={`filter-btn${selectedStockIds.length > 0 ? ' filter-btn--active' : ''}`}
                onClick={() => setShowIdDropdown(true)}
                title={filterLabel}
                aria-label={filterLabel}
                aria-expanded={showIdDropdown}
                aria-haspopup="true"
                ref={idFilterButtonRef}
              >
                🔎
              </button>
              {showIdDropdown && idDropdownPosition && (
                <FilterDropdown
                  options={stockOptions}
                  selected={selectedStockIds}
                  setSelected={setSelectedStockIds}
                  onClose={() => setShowIdDropdown(false)}
                  position={idDropdownPosition}
                />
              )}
            </th>
            <th scope="col" aria-sort={sortKey === 'date' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
              {thSort('date', lang === 'en' ? 'Transaction Date' : '交易日期')}
            </th>
            <th scope="col" aria-sort={sortKey === 'quantity' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
              {thSort('quantity', lang === 'en' ? 'Quantity (shares)' : '數量(股)')}
            </th>
            <th scope="col" aria-sort={sortKey === 'price' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
              {thSort('price', lang === 'en' ? 'Price' : '價格')}
            </th>
            <th scope="col" aria-sort={sortKey === 'currency' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
              {thSort('currency', lang === 'en' ? 'Currency' : '幣別')}
            </th>
            <th scope="col" aria-sort={sortKey === 'type' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
              {thSort('type', lang === 'en' ? 'Type' : '類型')}
            </th>
            <th scope="col" className={styles.operationCol}>{lang === 'en' ? 'Actions' : '操作'}</th>
          </tr>
        </thead>
        <tbody>
          {transactionHistory.length === 0 ? (
            <tr><td colSpan={7}>{lang === 'en' ? 'No transaction records' : '尚無交易紀錄'}</td></tr>
          ) : sortedHistory.length === 0 ? (
            <tr><td colSpan={7}>{lang === 'en' ? 'No matching records' : '無符合的交易紀錄'}</td></tr>
          ) : (
            sortedHistory.map(({ item, origIdx, currency }) => {
              const stock = stockList.find(s => s.stock_id === item.stock_id) || {};
              const isUsStock = currency === 'USD';
              const isEditing = editingIdx === origIdx;
              const name = stock.stock_name || item.stock_name || '';
              return (
                <tr key={origIdx}>
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
                          aria-label={lang === 'en' ? 'Price' : '價格'}
                        />
                      ) : (
                        item.price
                      )
                    ) : (
                      '-'
                    )}
                  </td>
                  <td>{currency}</td>
                  <td>{item.type === 'sell' ? (lang === 'en' ? 'Sell' : '賣出') : (lang === 'en' ? 'Buy' : '買入')}</td>
                  <td className={styles.operationCol}>
                    <div className={styles.actions}>
                      {isEditing ? (
                        <>
                          <button type="button" onClick={() => handleEditSave(origIdx)}>{lang === 'en' ? 'Save' : '儲存'}</button>
                          <button type="button" onClick={() => setEditingIdx(null)} className={styles.actionButton}>{lang === 'en' ? 'Cancel' : '取消'}</button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            aria-label={lang === 'en' ? `Edit ${item.stock_id} ${name}` : `修改 ${item.stock_id} ${name}`}
                            onClick={() => {
                              setEditingIdx(origIdx);
                              setEditForm({ date: item.date, quantity: item.quantity, price: item.price });
                            }}
                          >
                            {lang === 'en' ? 'Edit' : '修改'}
                          </button>
                          <button
                            type="button"
                            aria-label={lang === 'en' ? `Delete ${item.stock_id} ${name}` : `刪除 ${item.stock_id} ${name}`}
                            onClick={() => handleDelete(origIdx)}
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
