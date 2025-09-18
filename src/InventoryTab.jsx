import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Cookies from 'js-cookie';
import { API_HOST, HOST_URL } from './config';
import { fetchWithCache } from './api';
import { migrateTransactionHistory, saveTransactionHistory } from './transactionStorage';
import { exportTransactionsToDrive, importTransactionsFromDrive } from './googleDrive';
import { exportTransactionsToOneDrive, importTransactionsFromOneDrive } from './oneDrive';
import { exportTransactionsToICloud, importTransactionsFromICloud } from './icloud';
import { transactionsToCsv, transactionsFromCsv } from './csvUtils';
import AddTransactionModal from './components/AddTransactionModal';
import SellModal from './components/SellModal';
import TransactionHistoryTable from './components/TransactionHistoryTable';
import DataDropdown from './components/DataDropdown';
import styles from './InventoryTab.module.css';
import { useLanguage } from './i18n';
import InvestmentGoalCard from './components/InvestmentGoalCard';
import { summarizeInventory, calculateMonthlyContribution } from './inventoryUtils';
import { loadInvestmentGoals, saveInvestmentGoals } from './investmentGoalsStorage';

const BACKUP_COOKIE_KEY = 'inventory_last_backup';

const CURRENT_YEAR = new Date().getFullYear();
const PREVIOUS_YEAR = CURRENT_YEAR - 1;
const DIVIDEND_YEAR_QUERY = `year=${CURRENT_YEAR}&year=${PREVIOUS_YEAR}`;

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
  const { lang } = useLanguage();
  const initialGoals = useMemo(() => loadInvestmentGoals(), []);
  const [goals, setGoals] = useState(initialGoals);
  const [goalForm, setGoalForm] = useState(() => ({
    totalTarget: initialGoals.totalTarget ? String(initialGoals.totalTarget) : '',
    monthlyTarget: initialGoals.monthlyTarget ? String(initialGoals.monthlyTarget) : ''
  }));
  const [goalSaved, setGoalSaved] = useState(false);
  const text = {
    zh: {
      importOverwrite: '匯入後將覆蓋現有紀錄，是否繼續？',
      importDone: '已匯入完成',
      exportCsvConfirm: '確定要匯出 CSV？',
      exportDriveConfirm: '確定要匯出到 Google Drive？',
      exportDriveSuccess: '已匯出到 Google Drive',
      exportDriveFail: '匯出到 Google Drive 失敗',
      noBackupFound: '未找到備份檔案',
      importDriveSuccess: '已從 Google Drive 匯入資料',
      importDriveFail: '匯入 Google Drive 失敗',
      exportOneDriveConfirm: '確定要匯出到 OneDrive？',
      exportOneDriveSuccess: '已匯出到 OneDrive',
      exportOneDriveFail: '匯出到 OneDrive 失敗',
      importOneDriveSuccess: '已從 OneDrive 匯入資料',
      importOneDriveFail: '匯入 OneDrive 失敗',
      exportICloudConfirm: '確定要匯出到 iCloud Drive？',
      exportICloudSuccess: '已匯出到 iCloud Drive',
      exportICloudFail: '匯出到 iCloud Drive 失敗',
      importICloudSuccess: '已從 iCloud Drive 匯入資料',
      importICloudFail: '匯入 iCloud Drive 失敗',
      backupPrompt: '距離上次備份已超過30天，是否匯出 CSV 備份？',
      inputRequired: '請輸入完整資料',
      invalidNumbers: '請輸入有效數字、價格和日期',
      confirmDeleteRecord: '確定要刪除此筆紀錄？',
      sellExceeds: '賣出數量不得超過庫存',
      notice: '這是一個免費網站，我們不會把你的資料存到後台或伺服器，所有的紀錄（像是你的設定或操作紀錄）都只會保存在你的瀏覽器裡。簡單說：你的資料只在你這台電腦，不會上傳，也不會被我們看到，請安心使用！',
      addRecord: '新增購買',
      dataAccess: '存取資料',
      currentInventory: '目前庫存',
      showHistory: '顯示：交易歷史',
      cache: '快取',
      totalInvestment: '總投資金額：',
      totalValue: '目前總價值：',
      investmentGoals: '存股目標',
      totalGoal: '累積目標',
      monthlyGoal: '每月目標',
      goalTotalInvestment: '累積投入：',
      goalMonthlyContribution: '本月投入：',
      goalTarget: '目標：',
      goalPercentPlaceholder: '--',
      goalSave: '儲存目標',
      goalSaved: '目標已儲存',
      goalEmpty: '尚未設定目標，請在下方輸入金額',
      goalInputPlaceholderTotal: '例：500000',
      goalInputPlaceholderMonthly: '例：10000',
      goalTotalHalf: '累積目標過半！繼續保持～',
      goalTotalDone: '恭喜達成累積目標！',
      goalMonthlyHalf: '本月進度過半，再接再厲！',
      goalMonthlyDone: '本月目標達成，太棒了！',
      stockCodeName: '股票代碼/名稱',
      avgPrice: '平均股價',
      totalQuantity: '總數量',
      actions: '操作',
      noInventory: '尚無庫存',
      sell: '賣出',
      transactionHistory: '交易歷史 ',
      showInventory: '顯示：目前庫存'
    },
    en: {
      importOverwrite: 'Import will overwrite existing records. Continue?',
      importDone: 'Import completed',
      exportCsvConfirm: 'Export CSV?',
      exportDriveConfirm: 'Export to Google Drive?',
      exportDriveSuccess: 'Exported to Google Drive',
      exportDriveFail: 'Export to Google Drive failed',
      noBackupFound: 'Backup file not found',
      importDriveSuccess: 'Imported data from Google Drive',
      importDriveFail: 'Import from Google Drive failed',
      exportOneDriveConfirm: 'Export to OneDrive?',
      exportOneDriveSuccess: 'Exported to OneDrive',
      exportOneDriveFail: 'Export to OneDrive failed',
      importOneDriveSuccess: 'Imported data from OneDrive',
      importOneDriveFail: 'Import from OneDrive failed',
      exportICloudConfirm: 'Export to iCloud Drive?',
      exportICloudSuccess: 'Exported to iCloud Drive',
      exportICloudFail: 'Export to iCloud Drive failed',
      importICloudSuccess: 'Imported data from iCloud Drive',
      importICloudFail: 'Import from iCloud Drive failed',
      backupPrompt: 'It has been over 30 days since last backup. Export CSV backup?',
      inputRequired: 'Please enter all fields',
      invalidNumbers: 'Please enter valid numbers, price and date',
      confirmDeleteRecord: 'Delete this record?',
      sellExceeds: 'Sell quantity cannot exceed inventory',
      notice: 'This is a free website; we do not store your data on servers. All records stay in your browser. In short, your data remains on your computer and is not uploaded or seen by us.',
      addRecord: 'Add Purchase',
      dataAccess: 'Data Access',
      currentInventory: 'Inventory',
      showHistory: 'Show: Transaction',
      cache: 'Cache',
      totalInvestment: 'Total Investment:',
      totalValue: 'Total Value:',
      investmentGoals: 'Investment Goals',
      totalGoal: 'Total Goal',
      monthlyGoal: 'Monthly Goal',
      goalTotalInvestment: 'Invested so far:',
      goalMonthlyContribution: 'This month:',
      goalTarget: 'Target:',
      goalPercentPlaceholder: '--',
      goalSave: 'Save goals',
      goalSaved: 'Goals saved',
      goalEmpty: 'No goals yet. Add your targets below to track progress.',
      goalInputPlaceholderTotal: 'e.g. 500000',
      goalInputPlaceholderMonthly: 'e.g. 10000',
      goalTotalHalf: 'Halfway to your total goal—keep going!',
      goalTotalDone: 'Total goal achieved! Fantastic!',
      goalMonthlyHalf: 'Monthly progress is past halfway—almost there!',
      goalMonthlyDone: 'Monthly goal achieved! Great job!',
      stockCodeName: 'Stock Code/Name',
      avgPrice: 'Average Price',
      totalQuantity: 'Total Quantity',
      actions: 'Actions',
      noInventory: 'No inventory',
      sell: 'Sell',
      transactionHistory: 'Transaction ',
      showInventory: 'Show: Inventory'
    }
  };
  const msg = text[lang];

  const handleExport = useCallback(() => {
    const csv = transactionsToCsv(transactionHistory);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
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
      const imported = transactionsFromCsv(text).map(item => {
        const stock = stockList.find(s => s.stock_id === item.stock_id);
        return {
          ...item,
          stock_name: stock ? stock.stock_name : item.stock_name || ''
        };
      });
      if (imported.length === 0) {
        e.target.value = '';
        return;
      }
      if (transactionHistory.length > 0) {
        if (!window.confirm(msg.importOverwrite)) {
          e.target.value = '';
          return;
        }
      }
      setTransactionHistory(imported);
      saveTransactionHistory(imported);
      e.target.value = '';
      alert(msg.importDone);
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
    if (window.confirm(msg.exportCsvConfirm)) {
      handleExport();
    }
  };

  const handleDriveExport = async () => {
    if (!window.confirm(msg.exportDriveConfirm)) return;
    try {
      await exportTransactionsToDrive(transactionHistory);
      Cookies.set(BACKUP_COOKIE_KEY, new Date().toISOString(), { expires: 365 });
      alert(msg.exportDriveSuccess);
    } catch (err) {
      console.error('Drive manual export failed', err);
      alert(msg.exportDriveFail);
    }
  };

  const handleDriveImport = async () => {
    try {
      const list = await importTransactionsFromDrive();
      if (!list || list.length === 0) {
        alert(msg.noBackupFound);
        return;
      }
      if (transactionHistory.length > 0) {
        if (!window.confirm(msg.importOverwrite)) {
          return;
        }
      }
      const enriched = list.map(item => {
        const stock = stockList.find(s => s.stock_id === item.stock_id);
        return {
          ...item,
          stock_name: item.stock_name || (stock ? stock.stock_name : '')
        };
      });
      setTransactionHistory(enriched);
      saveTransactionHistory(enriched);
      alert(msg.importDriveSuccess);
      if (typeof window !== 'undefined') window.location.reload();
    } catch (err) {
      console.error('Drive manual import failed', err);
      alert(msg.importDriveFail);
    }
  };

  const handleOneDriveExport = async () => {
    if (!window.confirm(msg.exportOneDriveConfirm)) return;
    try {
      await exportTransactionsToOneDrive(transactionHistory);
      Cookies.set(BACKUP_COOKIE_KEY, new Date().toISOString(), { expires: 365 });
      alert(msg.exportOneDriveSuccess);
    } catch (err) {
      console.error('OneDrive manual export failed', err);
      alert(msg.exportOneDriveFail);
    }
  };

  const handleOneDriveImport = async () => {
    try {
      const list = await importTransactionsFromOneDrive();
      if (!list || list.length === 0) {
        alert(msg.noBackupFound);
        return;
      }
      if (transactionHistory.length > 0) {
        if (!window.confirm(msg.importOverwrite)) {
          return;
        }
      }
      const enriched = list.map(item => {
        const stock = stockList.find(s => s.stock_id === item.stock_id);
        return {
          ...item,
          stock_name: item.stock_name || (stock ? stock.stock_name : '')
        };
      });
      setTransactionHistory(enriched);
      saveTransactionHistory(enriched);
      alert(msg.importOneDriveSuccess);
      if (typeof window !== 'undefined') window.location.reload();
    } catch (err) {
      console.error('OneDrive manual import failed', err);
      alert(msg.importOneDriveFail);
    }
  };

  const handleICloudExport = async () => {
    if (!window.confirm(msg.exportICloudConfirm)) return;
    try {
      await exportTransactionsToICloud(transactionHistory);
      Cookies.set(BACKUP_COOKIE_KEY, new Date().toISOString(), { expires: 365 });
      alert(msg.exportICloudSuccess);
    } catch (err) {
      console.error('iCloud manual export failed', err);
      alert(msg.exportICloudFail);
    }
  };

  const handleICloudImport = async () => {
    try {
      const list = await importTransactionsFromICloud();
      if (!list || list.length === 0) {
        alert(msg.noBackupFound);
        return;
      }
      if (transactionHistory.length > 0) {
        if (!window.confirm(msg.importOverwrite)) {
          return;
        }
      }
      const enriched = list.map(item => {
        const stock = stockList.find(s => s.stock_id === item.stock_id);
        return {
          ...item,
          stock_name: item.stock_name || (stock ? stock.stock_name : '')
        };
      });
      setTransactionHistory(enriched);
      saveTransactionHistory(enriched);
      alert(msg.importICloudSuccess);
      if (typeof window !== 'undefined') window.location.reload();
    } catch (err) {
      console.error('iCloud manual import failed', err);
      alert(msg.importICloudFail);
    }
  };

  useEffect(() => {
    if (transactionHistory.length === 0) return;
    const last = Cookies.get(BACKUP_COOKIE_KEY);
    const now = new Date();
    if (!last) {
      Cookies.set(BACKUP_COOKIE_KEY, now.toISOString(), { expires: 365 });
    } else if (now - new Date(last) >= 30 * 24 * 60 * 60 * 1000) {
      if (window.confirm(msg.backupPrompt)) {
        handleExport();
      }
      Cookies.set(BACKUP_COOKIE_KEY, now.toISOString(), { expires: 365 });
    }
  }, [transactionHistory, handleExport]);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const { data, cacheStatus, timestamp } = await fetchWithCache(
          `${API_HOST}/get_stock_list`
        );
        const list = Array.isArray(data)
          ? data
          : Array.isArray(data?.data)
            ? data.data
            : Array.isArray(data?.items)
              ? data.items
              : [];
        setStockList(list);
        setCacheInfo({ cacheStatus, timestamp });
      } catch {
        setStockList([]);
      }
    };

    fetchAll();
  }, []);

  useEffect(() => {
    if (stockList.length === 0) return;
    setTransactionHistory(prev => {
      let changed = false;
      const updated = prev.map(item => {
        if (item.stock_name) return item;
        const stock = stockList.find(s => s.stock_id === item.stock_id);
        if (stock?.stock_name) {
          changed = true;
          return { ...item, stock_name: stock.stock_name };
        }
        return item;
      });
      if (changed) {
        saveTransactionHistory(updated);
        return updated;
      }
      return prev;
    });
  }, [stockList]);

  useEffect(() => {
    fetchWithCache(`${API_HOST}/get_dividend?${DIVIDEND_YEAR_QUERY}`)
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

  useEffect(() => {
    if (!goalSaved) return undefined;
    const timer = setTimeout(() => setGoalSaved(false), 2500);
    return () => clearTimeout(timer);
  }, [goalSaved]);

  const { inventoryList, totalInvestment, totalValue } = summarizeInventory(
    transactionHistory,
    stockList,
    latestPrices
  );
  const monthlyContribution = calculateMonthlyContribution(transactionHistory);

  const formatCurrency = value => {
    if (!Number.isFinite(value)) return '0.00';
    return value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const totalGoalSet = goals.totalTarget > 0;
  const monthlyGoalSet = goals.monthlyTarget > 0;
  const totalPercentValue = totalGoalSet ? Math.min(1, totalInvestment / goals.totalTarget) : 0;
  const monthlyPercentValue = monthlyGoalSet
    ? Math.min(1, monthlyContribution / goals.monthlyTarget)
    : 0;

  const goalRows = [
    {
      id: 'total',
      label: msg.totalGoal,
      current: `${msg.goalTotalInvestment}${formatCurrency(totalInvestment)}`,
      target: `${msg.goalTarget}${totalGoalSet
        ? formatCurrency(goals.totalTarget)
        : msg.goalPercentPlaceholder}`,
      percent: totalPercentValue,
      percentLabel: totalGoalSet
        ? `${Math.min(100, Math.round(totalPercentValue * 100))}%`
        : msg.goalPercentPlaceholder,
      encouragement: totalGoalSet
        ? totalPercentValue >= 1
          ? msg.goalTotalDone
          : totalPercentValue >= 0.5
            ? msg.goalTotalHalf
            : ''
        : ''
    },
    {
      id: 'monthly',
      label: msg.monthlyGoal,
      current: `${msg.goalMonthlyContribution}${formatCurrency(monthlyContribution)}`,
      target: `${msg.goalTarget}${monthlyGoalSet
        ? formatCurrency(goals.monthlyTarget)
        : msg.goalPercentPlaceholder}`,
      percent: monthlyPercentValue,
      percentLabel: monthlyGoalSet
        ? `${Math.min(100, Math.round(monthlyPercentValue * 100))}%`
        : msg.goalPercentPlaceholder,
      encouragement: monthlyGoalSet
        ? monthlyPercentValue >= 1
          ? msg.goalMonthlyDone
          : monthlyPercentValue >= 0.5
            ? msg.goalMonthlyHalf
            : ''
        : ''
    }
  ];

  const goalEmptyState = !totalGoalSet && !monthlyGoalSet ? msg.goalEmpty : '';
  const goalSavedMessage = goalSaved ? msg.goalSaved : '';

  const handleGoalTotalChange = event => {
    const value = event.target.value;
    setGoalForm(prev => ({ ...prev, totalTarget: value }));
  };

  const handleGoalMonthlyChange = event => {
    const value = event.target.value;
    setGoalForm(prev => ({ ...prev, monthlyTarget: value }));
  };

  const handleGoalSubmit = event => {
    event.preventDefault();
    const parseGoal = value => {
      if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed === '') return 0;
        const num = Number(trimmed);
        return Number.isFinite(num) && num >= 0 ? num : 0;
      }
      const num = Number(value);
      return Number.isFinite(num) && num >= 0 ? num : 0;
    };
    const updated = {
      totalTarget: parseGoal(goalForm.totalTarget),
      monthlyTarget: parseGoal(goalForm.monthlyTarget)
    };
    setGoals(updated);
    saveInvestmentGoals(updated);
    setGoalForm({
      totalTarget: updated.totalTarget ? String(updated.totalTarget) : '',
      monthlyTarget: updated.monthlyTarget ? String(updated.monthlyTarget) : ''
    });
    setGoalSaved(true);
  };

  const handleAdd = () => {
    if (!form.stock_id || !form.date || !form.quantity || !form.price) {
      alert(msg.inputRequired);
      return;
    }
    setTransactionHistory([
      ...transactionHistory,
      {
        stock_id: form.stock_id,
        stock_name: form.stock_name,
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
      alert(msg.invalidNumbers);
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
    if (window.confirm(msg.confirmDeleteRecord)) {
      setTransactionHistory(transactionHistory.filter((_, i) => i !== idx));
    }
  };

  const handleSell = (stock_id, qty) => {
    const stock = inventoryList.find(s => s.stock_id === stock_id);
    if (!stock || qty > stock.total_quantity) {
      alert(msg.sellExceeds);
      return;
    }
    setTransactionHistory([
      ...transactionHistory,
      { stock_id, stock_name: stock.stock_name, date: getToday(), quantity: Number(qty), type: 'sell' }
    ]);
    setSellModal({ show: false, stock: null });
  };

  return (
    <div className="App">
      <p className={styles.notice}>
        {msg.notice}
      </p>

      <div className={styles.topControls}>
        <button
          className={styles.button}
          onClick={() => {
            setForm({ stock_id: '', stock_name: '', date: getToday(), quantity: '', price: '' });
            setShowModal(true);
          }}
        >
          {msg.addRecord}
        </button>
        <div className="more-item">
          <button
            className={styles.button}
            onClick={() => setShowDataMenu(v => !v)}
          >
            {msg.dataAccess}
          </button>
          {showDataMenu && (
            <DataDropdown
              onClose={() => setShowDataMenu(false)}
              handleImportClick={handleImportClick}
              handleExportClick={handleExportClick}
              handleDriveImport={handleDriveImport}
              handleDriveExport={handleDriveExport}
              handleOneDriveImport={handleOneDriveImport}
              handleOneDriveExport={handleOneDriveExport}
              handleICloudImport={handleICloudImport}
              handleICloudExport={handleICloudExport}
            />
          )}
        </div>
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
              <h3 className={styles.titleMargin}>{msg.currentInventory}</h3>
              <button
                className={styles.button}
                onClick={() => setShowInventory(false)}
                title={lang === 'en' ? 'Toggle list display' : '切換列表顯示'}
              >
                {msg.showHistory}
              </button>
            </div>
            
            {cacheInfo && (
              <div className={styles.cacheInfo}>
                {msg.cache}: {cacheInfo.cacheStatus}
                {cacheInfo.timestamp ? ` (${new Date(cacheInfo.timestamp).toLocaleString()})` : ''}
              </div>
            )}

            <div className={styles.totalInvestment}>
              <div>
                {msg.totalInvestment}
                {totalInvestment.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </div>
              <span>
                {msg.totalValue}
                {totalValue.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </span>
            </div>

            <InvestmentGoalCard
              title={msg.investmentGoals}
              rows={goalRows}
              savedMessage={goalSavedMessage}
              emptyState={goalEmptyState}
              form={{
                onSubmit: handleGoalSubmit,
                totalId: 'inventory-goal-total',
                monthlyId: 'inventory-goal-monthly',
                totalLabel: msg.totalGoal,
                monthlyLabel: msg.monthlyGoal,
                totalValue: goalForm.totalTarget,
                monthlyValue: goalForm.monthlyTarget,
                onTotalChange: handleGoalTotalChange,
                onMonthlyChange: handleGoalMonthlyChange,
                totalPlaceholder: msg.goalInputPlaceholderTotal,
                monthlyPlaceholder: msg.goalInputPlaceholderMonthly,
                saveLabel: msg.goalSave
              }}
            />

            <div className="table-responsive">
              <table className={`table table-bordered table-striped ${styles.fullWidth}`}>
                <thead>
                  <tr>
                    <th className="stock-col">{msg.stockCodeName}</th>
                    <th>{msg.avgPrice}</th>
                    <th>{msg.totalQuantity}</th>
                    <th>{msg.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {inventoryList.length === 0
                    ? <tr><td colSpan={4}>{msg.noInventory}</td></tr>
                    : inventoryList.map((item, idx) => (
                        <tr key={idx}>
                          <td className="stock-col">
                            <a href={`${HOST_URL}/stock/${item.stock_id}`} target="_blank" rel="noreferrer">
                              {item.stock_id} {item.stock_name}
                            </a>
                          </td>
                          <td>{item.avg_price.toFixed(2)}</td>
                          <td>{item.total_quantity} ({(item.total_quantity / 1000).toFixed(3).replace(/\.0+$/, '')} {lang === 'en' ? 'lots' : '張'})</td>
                          <td>
                            <button className={styles.sellButton} onClick={() => setSellModal({ show: true, stock: item })}>{msg.sell}</button>
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
              <h3 className={styles.titleMargin}>{msg.transactionHistory}</h3>
              <button
                className={styles.button}
                onClick={() => setShowInventory(true)}
                title={lang === 'en' ? 'Toggle list display' : '切換列表顯示'}
              >
                {msg.showInventory}
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
