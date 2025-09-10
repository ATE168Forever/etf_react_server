import { useState, useEffect, useRef, useCallback } from 'react';
import Cookies from 'js-cookie';
import { API_HOST } from './config';
import { fetchWithCache } from './api';
import { migrateTransactionHistory, saveTransactionHistory } from './transactionStorage';
import { exportTransactionsToDrive, importTransactionsFromDrive } from './googleDrive';
import AddTransactionModal from './components/AddTransactionModal';
import SellModal from './components/SellModal';
import TransactionHistoryTable from './components/TransactionHistoryTable';
import styles from './InventoryTab.module.css';

const BACKUP_COOKIE_KEY = 'inventory_last_backup';

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

export default function InventoryTab() {
  const [stockList, setStockList] = useState([]);
  const [transactionHistory, setTransactionHistory] = useState(() => migrateTransactionHistory());
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ stock_id: '', stock_name: '', date: getToday(), quantity: '', price: '' });
  const [showInventory, setShowInventory] = useState(true);
  const [editingIdx, setEditingIdx] = useState(null);
  const [editForm, setEditForm] = useState({ date: '', quantity: '', price: '' });
  const [sellModal, setSellModal] = useState({ show: false, stock: null });
  const fileInputRef = useRef(null);
  const [cacheInfo, setCacheInfo] = useState(null);
  const [showDataMenu, setShowDataMenu] = useState(false);
  const [latestPrices, setLatestPrices] = useState({});

  const handleExport = useCallback(() => {
    const header = ['stock_id', 'date', 'quantity', 'type', 'price'];
    const rows = transactionHistory.map(item => [
      item.stock_id,
      item.date,
      item.quantity,
      item.type,
      item.price ?? ''
    ]);
    const csv = [header, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'inventory_backup.csv';
    a.click();
    URL.revokeObjectURL(url);
    Cookies.set(BACKUP_COOKIE_KEY, new Date().toISOString(), { expires: 365 });
  }, [transactionHistory]);

  const handleImport = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = event => {
      const text = event.target.result;
      const lines = text.trim().split(/\r?\n/);
      if (lines.length <= 1) return;
      const [header, ...rows] = lines;
      const fields = header.split(',');
      const list = rows.map(line => {
        const cols = line.split(',');
        const obj = {};
        fields.forEach((f, idx) => {
          obj[f] = cols[idx];
        });
        obj.quantity = Number(obj.quantity);
        if (obj.price) obj.price = Number(obj.price);
        return obj;
      });
      if (transactionHistory.length > 0) {
        if (!window.confirm('匯入後將覆蓋現有紀錄，是否繼續？')) {
          e.target.value = '';
          return;
        }
      }
      setTransactionHistory(list);
      saveTransactionHistory(list);
      e.target.value = '';
      alert('已匯入完成');
      if (typeof window !== 'undefined') window.location.reload();
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleImportClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleExportClick = () => {
    if (window.confirm('確定要匯出 CSV？')) {
      handleExport();
    }
  };

  const handleDriveExport = async () => {
    if (!window.confirm('確定要匯出到 Google Drive？')) return;
    try {
      await exportTransactionsToDrive(transactionHistory);
      Cookies.set(BACKUP_COOKIE_KEY, new Date().toISOString(), { expires: 365 });
      alert('已匯出到 Google Drive');
    } catch (err) {
      console.error('Drive manual export failed', err);
      alert('匯出到 Google Drive 失敗');
    }
  };

  const handleDriveImport = async () => {
    try {
      const text = await importTransactionsFromDrive();
      if (!text) {
        alert('未找到備份檔案');
        return;
      }
      const lines = text.trim().split(/\r?\n/);
      if (lines.length <= 1) return;
      const [header, ...rows] = lines;
      const fields = header.split(',');
      const list = rows.map(line => {
        const cols = line.split(',');
        const obj = {};
        fields.forEach((f, idx) => {
          obj[f] = cols[idx];
        });
        obj.quantity = Number(obj.quantity);
        if (obj.price) obj.price = Number(obj.price);
        return obj;
      });
      if (transactionHistory.length > 0) {
        if (!window.confirm('匯入後將覆蓋現有紀錄，是否繼續？')) {
          return;
        }
      }
      setTransactionHistory(list);
      saveTransactionHistory(list);
      alert('已從 Google Drive 匯入資料');
      if (typeof window !== 'undefined') window.location.reload();
    } catch (err) {
      console.error('Drive manual import failed', err);
      alert('匯入 Google Drive 失敗');
    }
  };

  useEffect(() => {
    if (transactionHistory.length === 0) return;
    const last = Cookies.get(BACKUP_COOKIE_KEY);
    const now = new Date();
    if (!last) {
      Cookies.set(BACKUP_COOKIE_KEY, now.toISOString(), { expires: 365 });
    } else if (now - new Date(last) >= 30 * 24 * 60 * 60 * 1000) {
      if (window.confirm('距離上次備份已超過30天，是否匯出 CSV 備份？')) {
        handleExport();
      }
      Cookies.set(BACKUP_COOKIE_KEY, now.toISOString(), { expires: 365 });
    }
  }, [transactionHistory, handleExport]);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const list = [];
        let page = 1;
        let cacheStatus = null;
        let timestamp = null;

        // fetch pages until no items are returned or we hit a safe upper bound
        while (page <= 10) {
          const { data, cacheStatus: cs, timestamp: ts } = await fetchWithCache(
            `${API_HOST}/get_stock_list?page=${page}`
          );

          if (page === 1) {
            cacheStatus = cs;
            timestamp = ts;
          }

          const arr = Array.isArray(data)
            ? data
            : Array.isArray(data?.data)
              ? data.data
              : Array.isArray(data?.items)
                ? data.items
                : [];

          if (arr.length === 0) break;
          list.push(...arr);
          page++;
        }

        setStockList(list);
        setCacheInfo({ cacheStatus, timestamp });
      } catch {
        setStockList([]);
      }
    };

    fetchAll();
  }, []);

  useEffect(() => {
    fetchWithCache(`${API_HOST}/get_dividend`)
      .then(({ data }) => {
        const list = Array.isArray(data)
          ? data
          : Array.isArray(data?.data)
            ? data.data
            : Array.isArray(data?.items)
              ? data.items
              : [];
        const priceMap = {};
        list.forEach(item => {
          const price = parseFloat(item.last_close_price);
          if (!item.stock_id || Number.isNaN(price)) return;
          if (!priceMap[item.stock_id] || new Date(item.dividend_date) > new Date(priceMap[item.stock_id].date)) {
            priceMap[item.stock_id] = { price, date: item.dividend_date };
          }
        });
        const prices = {};
        Object.keys(priceMap).forEach(id => {
          prices[id] = priceMap[id].price;
        });
        setLatestPrices(prices);
      })
      .catch(() => setLatestPrices({}));
  }, []);

  useEffect(() => {
    saveTransactionHistory(transactionHistory);
  }, [transactionHistory]);

  const inventoryMap = {};
  transactionHistory.forEach(item => {
    if (!inventoryMap[item.stock_id]) {
      const s = stockList.find(x => x.stock_id === item.stock_id) || {};
      inventoryMap[item.stock_id] = {
        stock_id: item.stock_id,
        stock_name: s.stock_name || '',
        total_quantity: 0,
        total_cost: 0
      };
    }
    const info = inventoryMap[item.stock_id];
    const qty = Number(item.quantity);
    if (item.type === 'sell') {
      const sellQty = Math.min(qty, info.total_quantity);
      if (info.total_quantity > 0) {
        const avg = info.total_cost / info.total_quantity;
        info.total_quantity -= sellQty;
        info.total_cost -= avg * sellQty;
      }
    } else {
      const price = Number(item.price) || 0;
      info.total_quantity += qty;
      info.total_cost += qty * price;
    }
  });

  const inventoryList = Object.values(inventoryMap)
    .filter(i => i.total_quantity > 0)
    .map(i => ({ ...i, avg_price: i.total_cost / i.total_quantity }));

  const totalInvestment = inventoryList.reduce((sum, item) => sum + item.total_cost, 0);
  const totalValue = inventoryList.reduce(
    (sum, item) => sum + item.total_quantity * (latestPrices[item.stock_id] || 0),
    0
  );

  const handleAdd = () => {
    if (!form.stock_id || !form.date || !form.quantity || !form.price) {
      alert('請輸入完整資料');
      return;
    }
    setTransactionHistory([
      ...transactionHistory,
      {
        stock_id: form.stock_id,
        date: form.date,
        quantity: Number(form.quantity),
        price: Number(form.price),
        type: 'buy'
      }
    ]);
    setForm({ stock_id: '', stock_name: '', date: getToday(), quantity: '', price: '' });
    setShowModal(false);
  };

  const handleEditSave = idx => {
    const original = transactionHistory[idx];
    if (!editForm.quantity || !editForm.date || (original.type === 'buy' && !editForm.price)) {
      alert('請輸入有效數字、價格和日期');
      return;
    }
    const updated = [...transactionHistory];
    updated[idx] = {
      ...updated[idx],
      date: editForm.date,
      quantity: Number(editForm.quantity)
    };
    if (original.type === 'buy') {
      updated[idx].price = Number(editForm.price);
    }
    setTransactionHistory(updated);
    setEditingIdx(null);
  };

  const handleDelete = idx => {
    if (window.confirm('確定要刪除此筆紀錄？')) {
      setTransactionHistory(transactionHistory.filter((_, i) => i !== idx));
    }
  };

  const handleSell = (stock_id, qty) => {
    const stock = inventoryList.find(s => s.stock_id === stock_id);
    if (!stock || qty > stock.total_quantity) {
      alert('賣出數量不得超過庫存');
      return;
    }
    setTransactionHistory([
      ...transactionHistory,
      { stock_id, date: getToday(), quantity: Number(qty), type: 'sell' }
    ]);
    setSellModal({ show: false, stock: null });
  };

  return (
    <div className="App">
      <p className={styles.notice}>
        這是一個免費網站，我們不會把你的資料存到後台或伺服器，所有的紀錄（像是你的設定或操作紀錄）都只會保存在你的瀏覽器裡。簡單說：你的資料只在你這台電腦，不會上傳，也不會被我們看到，請安心使用！
      </p>

      <div className={styles.topControls}>
        <button
          className={styles.button}
          onClick={() => {
            setForm({ stock_id: '', stock_name: '', date: getToday(), quantity: '', price: '' });
            setShowModal(true);
          }}
        >
          新增購買紀錄
        </button>
        <button
          className={styles.button}
          onClick={() => setShowDataMenu(!showDataMenu)}
        >
          存取資料
        </button>
        {showDataMenu && (
          <div className={styles.csvControls}>
            <button className={styles.button} onClick={handleExportClick}>
              匯出 CSV
            </button>
            <button className={styles.button} onClick={handleImportClick}>
              匯入 CSV
            </button>
            <button className={styles.button} onClick={handleDriveExport}>
              匯出 Google Drive
            </button>
            <button className={styles.button} onClick={handleDriveImport}>
              匯入 Google Drive
            </button>
          </div>
        )}
        <input
          type="file"
          accept=".csv"
          ref={fileInputRef}
          style={{ display: 'none' }}
          onChange={handleImport}
        />
      </div>

      <AddTransactionModal
        show={showModal}
        onClose={() => setShowModal(false)}
        stockList={stockList}
        form={form}
        setForm={setForm}
        onSubmit={handleAdd}
      />
      <SellModal
        show={sellModal.show}
        stock={sellModal.stock}
        onClose={() => setSellModal({ show: false, stock: null })}
        onSubmit={handleSell}
      />

      <div className="inventory-tables">
        {showInventory ? (
          <>
            <div className={styles.tableHeader}>
              <h3 className={styles.titleMargin}>目前庫存</h3>
              <button
                className={styles.button}
                onClick={() => setShowInventory(false)}
                title="切換列表顯示"
              >
                顯示：交易歷史
              </button>
            </div>
            
            {cacheInfo && (
              <div className={styles.cacheInfo}>
                快取: {cacheInfo.cacheStatus}
                {cacheInfo.timestamp ? ` (${new Date(cacheInfo.timestamp).toLocaleString()})` : ''}
              </div>
            )}

            <div className={styles.totalInvestment}>
              <span>
                總投資金額：
                {totalInvestment.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </span>
              {' / '}
              <span>
                目前總價值：
                {totalValue.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </span>
            </div>

            <div className="table-responsive">
              <table className={`table table-bordered table-striped ${styles.fullWidth}`}>
                <thead>
                  <tr>
                    <th className="stock-col">股票代碼/名稱</th>
                    <th>平均股價</th>
                    <th>總數量</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {inventoryList.length === 0
                    ? <tr><td colSpan={4}>尚無庫存</td></tr>
                    : inventoryList.map((item, idx) => (
                        <tr key={idx}>
                          <td className="stock-col">
                            <a href={`https://etflife.org/stock/${item.stock_id}`} target="_blank" rel="noreferrer">
                              {item.stock_id} {item.stock_name}
                            </a>
                          </td>
                          <td>{item.avg_price.toFixed(2)}</td>
                          <td>{item.total_quantity} ({(item.total_quantity / 1000).toFixed(3).replace(/\.0+$/, '')} 張)</td>
                          <td>
                            <button className={styles.sellButton} onClick={() => setSellModal({ show: true, stock: item })}>賣出</button>
                          </td>
                        </tr>
                      ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <>
            <div className={styles.tableHeader}>
              <h3 className={styles.titleMargin}>交易歷史 </h3>
              <button
                className={styles.button}
                onClick={() => setShowInventory(true)}
                title="切換列表顯示"
              >
                顯示：目前庫存
              </button>
            </div>
            <TransactionHistoryTable
              transactionHistory={transactionHistory}
              stockList={stockList}
              editingIdx={editingIdx}
              editForm={editForm}
              setEditForm={setEditForm}
              setEditingIdx={setEditingIdx}
              handleEditSave={handleEditSave}
              handleDelete={handleDelete}
            />
          </>
        )}
      </div>
    </div>
  );
}
