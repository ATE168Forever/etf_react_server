import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Cookies from 'js-cookie';
import { API_HOST, HOST_URL } from './config';
import { fetchWithCache } from './api';
import { fetchDividendsByYears } from './dividendApi';
import { migrateTransactionHistory, saveTransactionHistory } from './utils/transactionStorage';
import { exportTransactionsToDrive, importTransactionsFromDrive } from './googleDrive';
import { exportTransactionsToOneDrive, importTransactionsFromOneDrive } from './oneDrive';
import { exportTransactionsToICloud, importTransactionsFromICloud } from './icloud';
import { transactionsToCsv, transactionsFromCsv } from './utils/csvUtils';
import AddTransactionModal from './components/AddTransactionModal';
import SellModal from './components/SellModal';
import TransactionHistoryTable from './components/TransactionHistoryTable';
import DataDropdown from './components/DataDropdown';
import styles from './InventoryTab.module.css';
import { useLanguage } from './i18n';
import InvestmentGoalCard from './components/InvestmentGoalCard';
import { summarizeInventory } from './utils/inventoryUtils';
import { loadInvestmentGoals, saveInvestmentGoals } from './utils/investmentGoalsStorage';
import {
  calculateDividendSummary,
  buildDividendGoalViewModel
} from './utils/dividendGoalUtils';

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
  const [dividendData, setDividendData] = useState([]);
  const { lang } = useLanguage();
  const initialGoals = useMemo(() => loadInvestmentGoals(), []);
  const initialGoalType = (() => {
    const candidate = typeof initialGoals.goalType === 'string' ? initialGoals.goalType.toLowerCase() : '';
    if (['annual', 'monthly', 'minimum'].includes(candidate)) {
      return candidate;
    }
    if (Number(initialGoals.totalTarget) > 0) return 'annual';
    if (Number(initialGoals.monthlyTarget) > 0) return 'monthly';
    if (Number(initialGoals.minimumTarget) > 0) return 'minimum';
    return 'annual';
  })();
  const [goals, setGoals] = useState({ ...initialGoals, goalType: initialGoalType });
  const [goalForm, setGoalForm] = useState(() => ({
    name: initialGoals.goalName ? String(initialGoals.goalName) : '',
    goalType: initialGoalType,
    annualTarget: initialGoals.totalTarget ? String(initialGoals.totalTarget) : '',
    monthlyTarget: initialGoals.monthlyTarget ? String(initialGoals.monthlyTarget) : '',
    minimumTarget: initialGoals.minimumTarget ? String(initialGoals.minimumTarget) : ''
  }));
  const [goalSaved, setGoalSaved] = useState(false);
  const [isGoalFormVisible, setIsGoalFormVisible] = useState(false);
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
      investmentGoals: '預期的股息目標',
      goalNameLabel: '幫目標取個名字',
      goalNamePlaceholder: '例：一年滾出 10 萬股息',
      goalNameHelper: '清楚的名稱能提醒自己為什麼開始。',
      goalFormIntro: '替你的股息計畫取個名字，選擇年度、每月或最低目標，讓努力更有方向！',
      goalTypeLabel: '選擇目標類型',
      annualGoal: '年度目標',
      monthlyGoal: '月平均目標',
      minimumGoal: '每月最低目標',
      goalDividendAccumulated: '累積股息：',
      goalDividendMonthly: '每月平均股息：',
      goalDividendMinimum: '每月最低股息：',
      goalTargetAnnual: '年度目標：',
      goalTargetMonthly: '月平均目標：',
      goalTargetMinimum: '每月最低目標：',
      goalText: '我的計畫',
      goalSave: '儲存',
      goalSaved: '已儲存，加油！',
      goalEmpty: '還沒設定股息計畫？給目標取個響亮的名字，再填上年度與每月數字吧！',
      goalInputPlaceholderTotal: '例：50000',
      goalInputPlaceholderMonthly: '例：5000',
      goalFormShow: '設定或更新目標',
      goalFormHide: '收起設定',
      goalAnnualHalf: '年度進度過半，離夢想更近一步！',
      goalAnnualDone: '恭喜完成年度目標，繼續打造現金流！',
      goalMonthlyHalf: '這個月過半囉，再衝一把！',
      goalMinimumHalf: '每月最低過半囉，再衝一把！',
      goalMonthlyDone: '月目標達成，保持這個節奏！',
      goalMinimumDone: '月最低目標達成，保持這個節奏！',
      goalDividendYtdLabel: '累積股息',
      goalDividendAnnualLabel: '年度股息',
      goalDividendMonthlyLabel: '每月平均股息',
      goalDividendMinimumLabel: '每月最低股息',
      goalAchievementLabel: '達成率',
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
      investmentGoals: 'Expected Dividend Targets',
      goalNameLabel: 'Name your goal',
      goalNamePlaceholder: 'e.g. Build a $5K dividend stream',
      goalNameHelper: 'A memorable name keeps your motivation high.',
      goalFormIntro: 'Give your dividend plan a motivating title, then choose an annual, monthly, or minimum target.',
      goalTypeLabel: 'Choose goal type',
      annualGoal: 'Annual Goal',
      monthlyGoal: 'Monthly Goal',
      minimumGoal: 'Monthly Minimum Goal',
      goalDividendAccumulated: 'Accumulated dividends:',
      goalDividendMonthly: 'Average monthly dividends:',
      goalDividendMinimum: 'Monthly minimum dividends:',
      goalTargetAnnual: 'Annual target:',
      goalTargetMonthly: 'Monthly target:',
      goalTargetMinimum: 'Monthly minimum target:',
      goalText: 'My plan',
      goalSave: 'Save',
      goalSaved: 'Plan updated—keep going!',
      goalEmpty: 'No plan yet—give your dividend goal a name and add annual and monthly targets below to stay focused.',
      goalInputPlaceholderTotal: 'e.g. 5000',
      goalInputPlaceholderMonthly: 'e.g. 500',
      goalFormShow: 'Add or edit goal',
      goalFormHide: 'Hide goal form',
      goalAnnualHalf: 'Halfway through the year—your dream cashflow is getting closer!',
      goalAnnualDone: 'Annual goal achieved! Keep that momentum building income!',
      goalMonthlyHalf: 'Over halfway this month—one more push!',
      goalMonthlyDone: 'Monthly goal achieved—stay in this winning rhythm!',
      goalMinimumHalf: 'Over halfway this month—one minimum more push!',
      goalMinimumDone: 'Monthly minimum goal achieved—stay in this winning rhythm!',
      goalDividendYtdLabel: 'Accumulated dividends',
      goalDividendAnnualLabel: 'Annual dividends',
      goalDividendMonthlyLabel: 'Average monthly dividends',
      goalDividendMinimumLabel: 'Monthly minimum dividends',
      goalAchievementLabel: 'Achievement',
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
    fetchDividendsByYears()
      .then(({ data }) => {
        const list = data;
        setDividendData(list);
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
      .catch(() => {
        setDividendData([]);
        setLatestPrices({});
      });
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

  const formatCurrency = useCallback(value => {
    if (!Number.isFinite(value)) return '0.00';
    return Number(value).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }, []);

  const dividendSummary = useMemo(
    () => calculateDividendSummary({
      inventoryList,
      dividendEvents: dividendData,
      transactionHistory
    }),
    [inventoryList, dividendData, transactionHistory]
  );

  const goalMessages = useMemo(() => ({
    annualGoal: msg.annualGoal,
    monthlyGoal: msg.monthlyGoal,
    minimumGoal: msg.minimumGoal,
    goalDividendAccumulated: msg.goalDividendAccumulated,
    goalDividendMonthly: msg.goalDividendMonthly,
    goalDividendMinimum: msg.goalDividendMinimum,
    goalDividendYtdLabel: msg.goalDividendYtdLabel,
    goalDividendAnnualLabel: msg.goalDividendAnnualLabel,
    goalDividendMonthlyLabel: msg.goalDividendMonthlyLabel,
    goalDividendMinimumLabel: msg.goalDividendMinimumLabel,
    goalAchievementLabel: msg.goalAchievementLabel,
    goalTargetAnnual: msg.goalTargetAnnual,
    goalTargetMonthly: msg.goalTargetMonthly,
    goalTargetMinimum: msg.goalTargetMinimum,
    goalAnnualHalf: msg.goalAnnualHalf,
    goalAnnualDone: msg.goalAnnualDone,
    goalMonthlyHalf: msg.goalMonthlyHalf,
    goalMonthlyDone: msg.goalMonthlyDone,
    goalMinimumHalf: msg.goalMinimumHalf,
    goalMinimumDone: msg.goalMinimumDone,
    goalEmpty: msg.goalEmpty
  }), [msg]);

  const {
    metrics: goalMetrics,
    rows: goalRows,
    emptyState: goalEmptyState
  } = useMemo(
    () => buildDividendGoalViewModel({
      summary: dividendSummary,
      goals,
      messages: goalMessages,
      formatCurrency
    }),
    [dividendSummary, goals, goalMessages, formatCurrency]
  );

  const goalSavedMessage = goalSaved ? msg.goalSaved : '';
  const goalTitle = goals.goalName?.trim() ? goals.goalName.trim() : msg.investmentGoals;
  const normalizedGoalType = ['annual', 'monthly', 'minimum'].includes(goalForm.goalType)
    ? goalForm.goalType
    : 'annual';
  const goalTypeOptions = [
    { value: 'annual', label: msg.annualGoal },
    { value: 'monthly', label: msg.monthlyGoal },
    { value: 'minimum', label: msg.minimumGoal }
  ];
  const goalTargetConfig = normalizedGoalType === 'monthly'
    ? {
        label: msg.goalTargetMonthly,
        placeholder: msg.goalInputPlaceholderMonthly,
        step: '100',
        value: goalForm.monthlyTarget
      }
    : normalizedGoalType === 'minimum'
      ? {
          label: msg.goalTargetMinimum,
          placeholder: msg.goalInputPlaceholderMonthly,
          step: '100',
          value: goalForm.minimumTarget
        }
      : {
          label: msg.goalTargetAnnual,
          placeholder: msg.goalInputPlaceholderTotal,
          step: '1000',
          value: goalForm.annualTarget
        };

  const handleGoalFormToggle = () => {
    setIsGoalFormVisible(prev => !prev);
  };

  const handleGoalNameChange = event => {
    const value = event.target.value;
    setGoalForm(prev => ({ ...prev, name: value }));
  };

  const handleGoalTypeChange = event => {
    const value = String(event.target.value || '').toLowerCase();
    setGoalForm(prev => ({
      ...prev,
      goalType: ['annual', 'monthly', 'minimum'].includes(value) ? value : prev.goalType
    }));
  };

  const handleGoalTargetChange = event => {
    const value = event.target.value;
    setGoalForm(prev => {
      const key = prev.goalType === 'monthly'
        ? 'monthlyTarget'
        : prev.goalType === 'minimum'
          ? 'minimumTarget'
          : 'annualTarget';
      return {
        ...prev,
        [key]: value
      };
    });
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
    const normalizedGoalType = ['annual', 'monthly', 'minimum'].includes(goalForm.goalType)
      ? goalForm.goalType
      : 'annual';
    const updated = {
      goalName: typeof goalForm.name === 'string' ? goalForm.name.trim().slice(0, 60) : '',
      goalType: normalizedGoalType,
      totalTarget: parseGoal(goalForm.annualTarget),
      monthlyTarget: parseGoal(goalForm.monthlyTarget),
      minimumTarget: parseGoal(goalForm.minimumTarget)
    };
    setGoals(updated);
    saveInvestmentGoals(updated);
    setGoalForm({
      name: updated.goalName,
      goalType: updated.goalType,
      annualTarget: updated.totalTarget ? String(updated.totalTarget) : '',
      monthlyTarget: updated.monthlyTarget ? String(updated.monthlyTarget) : '',
      minimumTarget: updated.minimumTarget ? String(updated.minimumTarget) : ''
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
              title={goalTitle}
              metrics={goalMetrics}
              rows={goalRows}
              savedMessage={goalSavedMessage}
              emptyState={goalEmptyState}
              form={{
                id: 'inventory-goal-form',
                isVisible: isGoalFormVisible,
                toggle: {
                  label: isGoalFormVisible ? msg.goalFormHide : msg.goalFormShow,
                  onClick: handleGoalFormToggle,
                  ariaControls: 'inventory-goal-form'
                },
                onSubmit: handleGoalSubmit,
                intro: msg.goalFormIntro,
                nameId: 'inventory-goal-name',
                nameLabel: msg.goalNameLabel,
                nameValue: goalForm.name,
                namePlaceholder: msg.goalNamePlaceholder,
                nameHelper: msg.goalNameHelper,
                onNameChange: handleGoalNameChange,
                nameMaxLength: 60,
                typeId: 'inventory-goal-type',
                typeLabel: msg.goalTypeLabel,
                typeValue: normalizedGoalType,
                typeOptions: goalTypeOptions,
                onTypeChange: handleGoalTypeChange,
                targetId: 'inventory-goal-target',
                targetLabel: goalTargetConfig.label,
                targetValue: goalTargetConfig.value,
                onTargetChange: handleGoalTargetChange,
                targetPlaceholder: goalTargetConfig.placeholder,
                targetStep: goalTargetConfig.step,
                targetMin: '0',
                saveLabel: msg.goalText,
                saveButton: msg.goalSave
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
