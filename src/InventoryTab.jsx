import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Cookies from 'js-cookie';
import CreatableSelect from 'react-select/creatable';
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
import selectStyles from './selectStyles';

const BACKUP_COOKIE_KEY = 'inventory_last_backup';
const SHARES_PER_LOT = 1000;
const DEFAULT_GOAL_TYPE = 'annual';
const GOAL_TYPES = ['annual', 'monthly', 'minimum', 'shares'];

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
  const initialShareTargetList = Array.isArray(initialGoals.shareTargets) ? initialGoals.shareTargets : [];
  const hasInitialShareTargets = initialShareTargetList.some(item => {
    const quantity = Number(item?.targetQuantity);
    return Number.isFinite(quantity) && quantity > 0;
  });
  const initialGoalType = (() => {
    const candidate = typeof initialGoals.goalType === 'string' ? initialGoals.goalType.toLowerCase() : '';
    if (GOAL_TYPES.includes(candidate)) {
      return candidate;
    }
    if (Number(initialGoals.totalTarget) > 0) return 'annual';
    if (Number(initialGoals.monthlyTarget) > 0) return 'monthly';
    if (Number(initialGoals.minimumTarget) > 0) return 'minimum';
    if (hasInitialShareTargets) return 'shares';
    return DEFAULT_GOAL_TYPE;
  })();
  const [goals, setGoals] = useState({ ...initialGoals, goalType: initialGoalType });
  const initialShareTargets = initialShareTargetList.length
    ? initialShareTargetList.map(item => ({
        stockId: item?.stockId || '',
        stockName: item?.stockName || '',
        targetQuantity: item?.targetQuantity ? String(item.targetQuantity) : ''
      }))
    : [];
  const [goalForm, setGoalForm] = useState(() => ({
    name: initialGoals.goalName ? String(initialGoals.goalName) : '',
    goalType: initialGoalType,
    annualTarget: initialGoals.totalTarget ? String(initialGoals.totalTarget) : '',
    monthlyTarget: initialGoals.monthlyTarget ? String(initialGoals.monthlyTarget) : '',
    minimumTarget: initialGoals.minimumTarget ? String(initialGoals.minimumTarget) : '',
    shareTargets: initialShareTargets
  }));
  const [goalSaved, setGoalSaved] = useState('');
  const [isGoalFormVisible, setIsGoalFormVisible] = useState(false);
  const [shareTargetDraft, setShareTargetDraft] = useState({ stockId: '', stockName: '', quantity: '' });
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
      goalSavedEmpty: '趕快設下你的目標吧！',
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
      shareGoalSectionTitle: '存股張數目標',
      shareGoalEmptyList: '還沒有設定存股目標，輸入代碼與目標張數後按下「新增存股目標」。',
      shareGoalStockInputLabel: '股票代碼 / 名稱',
      shareGoalStockInputPlaceholder: '例：0056 高股息ETF',
      shareGoalTargetLabelForm: '目標張數',
      shareGoalTargetPlaceholder: '例：100',
      shareGoalAddButton: '新增存股目標',
      shareGoalRemove: '移除',
      shareGoalUnit: '張',
      shareGoalCurrent: '目前張數：',
      shareGoalTargetDisplay: '目標張數：',
      shareGoalHalf: '進度過半，再加把勁！',
      shareGoalDone: '恭喜達成存股目標！',
      shareGoalInputRequired: '請先輸入股票代碼與目標張數',
      shareGoalTypeOption: '存股張數目標',
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
      goalSavedEmpty: 'Set your goal to get started!',
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
      shareGoalSectionTitle: 'Share accumulation targets',
      shareGoalEmptyList: 'No share targets yet—enter a ticker and target lots, then click “Add share target.”',
      shareGoalStockInputLabel: 'Ticker / Name',
      shareGoalStockInputPlaceholder: 'e.g. 0056 High Dividend ETF',
      shareGoalTargetLabelForm: 'Target lots',
      shareGoalTargetPlaceholder: 'e.g. 100',
      shareGoalAddButton: 'Add share target',
      shareGoalRemove: 'Remove',
      shareGoalUnit: 'lots',
      shareGoalCurrent: 'Current lots:',
      shareGoalTargetDisplay: 'Target lots:',
      shareGoalHalf: 'Over halfway there—keep it up!',
      shareGoalDone: 'Share target reached—great job!',
      shareGoalInputRequired: 'Enter a ticker and target lots first.',
      shareGoalTypeOption: 'Share accumulation target',
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
    const timer = setTimeout(() => setGoalSaved(''), 2500);
    return () => clearTimeout(timer);
  }, [goalSaved]);

  const { inventoryList, totalInvestment, totalValue } = summarizeInventory(
    transactionHistory,
    stockList,
    latestPrices
  );

  const shareTargetNameLookup = useMemo(() => {
    const map = new Map();
    (Array.isArray(stockList) ? stockList : []).forEach(item => {
      const stockId = typeof item?.stock_id === 'string' ? item.stock_id.trim().toUpperCase() : '';
      if (!stockId || map.has(stockId)) return;
      map.set(stockId, typeof item?.stock_name === 'string' ? item.stock_name.trim() : '');
    });
    (Array.isArray(inventoryList) ? inventoryList : []).forEach(item => {
      const stockId = typeof item?.stock_id === 'string' ? item.stock_id.trim().toUpperCase() : '';
      if (!stockId) return;
      const stockName = typeof item?.stock_name === 'string' ? item.stock_name.trim() : '';
      if (stockName) {
        map.set(stockId, stockName);
      }
    });
    return map;
  }, [stockList, inventoryList]);

  const shareTargetOptions = useMemo(() => {
    const optionMap = new Map();
    shareTargetNameLookup.forEach((name, stockId) => {
      optionMap.set(stockId, typeof name === 'string' ? name : '');
    });
    const goalTargets = Array.isArray(goals.shareTargets) ? goals.shareTargets : [];
    goalTargets.forEach(item => {
      const stockId = typeof item?.stockId === 'string' ? item.stockId.trim().toUpperCase() : '';
      if (!stockId || optionMap.has(stockId)) return;
      const stockName = typeof item?.stockName === 'string' ? item.stockName.trim() : '';
      optionMap.set(stockId, stockName);
    });
    return Array.from(optionMap.entries())
      .map(([stockId, stockName]) => {
        const sanitizedName = typeof stockName === 'string' ? stockName.trim() : '';
        return {
          value: stockId,
          label: sanitizedName ? `${stockId} - ${sanitizedName}` : stockId,
          stockId,
          stockName: sanitizedName
        };
      })
      .sort((a, b) => a.stockId.localeCompare(b.stockId));
  }, [shareTargetNameLookup, goals.shareTargets]);

  const parseShareTargetInputValue = useCallback(
    rawValue => {
      if (typeof rawValue !== 'string') {
        return { stockId: '', stockName: '' };
      }
      const normalized = rawValue.replace(/\u3000/g, ' ');
      const condensed = normalized
        .replace(/\s+-\s+/g, ' - ')
        .replace(/\s+/g, ' ')
        .trim();
      if (!condensed) {
        return { stockId: '', stockName: '' };
      }
      const exactMatch = shareTargetOptions.find(option => option.label === condensed);
      if (exactMatch) {
        const fallbackNameRaw = shareTargetNameLookup.get(exactMatch.stockId);
        const fallbackName = typeof fallbackNameRaw === 'string' ? fallbackNameRaw.trim().slice(0, 60) : '';
        const optionName = typeof exactMatch.stockName === 'string'
          ? exactMatch.stockName.trim().slice(0, 60)
          : '';
        return {
          stockId: exactMatch.stockId,
          stockName: optionName || fallbackName
        };
      }
      const hyphenMatch = condensed.match(/^([0-9A-Za-z.-]+)\s*[-–—]\s*(.+)$/);
      const match = hyphenMatch || condensed.match(/^([0-9A-Za-z.-]+)(?:\s+(.+))?$/);
      let stockId = '';
      let stockName = '';
      if (match) {
        stockId = match[1] ? match[1].slice(0, 16).toUpperCase() : '';
        stockName = match[2] ? match[2].trim().slice(0, 60) : '';
      } else {
        const upperValue = condensed.toUpperCase();
        shareTargetNameLookup.forEach((_, id) => {
          if (upperValue.startsWith(id) && id.length > stockId.length) {
            stockId = id;
          }
        });
        if (stockId) {
          stockName = condensed.slice(stockId.length).trim().slice(0, 60);
        } else {
          stockId = upperValue.slice(0, 16);
        }
      }
      if (!stockId) {
        return { stockId: '', stockName: '' };
      }
      const fallbackNameRaw = shareTargetNameLookup.get(stockId);
      const fallbackName = typeof fallbackNameRaw === 'string' ? fallbackNameRaw.trim().slice(0, 60) : '';
      const sanitizedName = typeof stockName === 'string' ? stockName.trim().slice(0, 60) : '';
      return {
        stockId,
        stockName: sanitizedName || fallbackName
      };
    },
    [shareTargetNameLookup, shareTargetOptions]
  );

  const formatShareTargetInputValue = useCallback(
    (stockId, stockName) => {
      const id = typeof stockId === 'string' ? stockId.trim().toUpperCase() : '';
      if (!id) return '';
      const providedName = typeof stockName === 'string' ? stockName.trim() : '';
      const fallbackNameRaw = shareTargetNameLookup.get(id);
      const fallbackName = typeof fallbackNameRaw === 'string' ? fallbackNameRaw.trim() : '';
      const nameToUse = providedName || fallbackName;
      return nameToUse ? `${id} - ${nameToUse}` : id;
    },
    [shareTargetNameLookup]
  );

  const deriveShareTargetFromOption = useCallback(
    option => {
      if (!option) {
        return { stockId: '', stockName: '' };
      }
      if (option.__isNew__) {
        return parseShareTargetInputValue(option.label ?? option.value ?? '');
      }
      const optionId = typeof option.stockId === 'string'
        ? option.stockId
        : typeof option.value === 'string'
          ? option.value
          : '';
      const stockId = optionId ? optionId.trim().toUpperCase() : '';
      if (!stockId) {
        return { stockId: '', stockName: '' };
      }
      const optionName = typeof option.stockName === 'string' ? option.stockName.trim() : '';
      const fallbackNameRaw = shareTargetNameLookup.get(stockId);
      const fallbackName = typeof fallbackNameRaw === 'string' ? fallbackNameRaw.trim() : '';
      return {
        stockId,
        stockName: optionName || fallbackName
      };
    },
    [parseShareTargetInputValue, shareTargetNameLookup]
  );

  const buildShareTargetSelectValue = useCallback(
    (stockId, stockName) => {
      const id = typeof stockId === 'string' ? stockId.trim().toUpperCase() : '';
      if (!id) {
        return null;
      }
      const name = typeof stockName === 'string' ? stockName.trim() : '';
      const matchingOption = shareTargetOptions.find(option => option.stockId === id && (!name || option.stockName === name));
      if (matchingOption) {
        return matchingOption;
      }
      return {
        value: id,
        label: formatShareTargetInputValue(id, name),
        stockId: id,
        stockName: name
      };
    },
    [formatShareTargetInputValue, shareTargetOptions]
  );

  const handleShareTargetSelectChange = index => option => {
    const parsed = deriveShareTargetFromOption(option);
    setGoalForm(prev => {
      const targets = Array.isArray(prev.shareTargets) ? [...prev.shareTargets] : [];
      const current = { ...(targets[index] || { stockId: '', stockName: '', targetQuantity: '' }) };
      current.stockId = parsed.stockId;
      current.stockName = parsed.stockName;
      targets[index] = current;
      return {
        ...prev,
        shareTargets: targets
      };
    });
  };

  const handleShareTargetQuantityChange = index => event => {
    const value = event.target.value;
    setGoalForm(prev => {
      const targets = Array.isArray(prev.shareTargets) ? [...prev.shareTargets] : [];
      const current = { ...(targets[index] || { stockId: '', stockName: '', targetQuantity: '' }) };
      current.targetQuantity = value;
      targets[index] = current;
      return {
        ...prev,
        shareTargets: targets
      };
    });
  };

  const handleShareTargetRemove = index => {
    setGoalForm(prev => ({
      ...prev,
      shareTargets: (Array.isArray(prev.shareTargets) ? prev.shareTargets : []).filter((_, i) => i !== index)
    }));
  };

  const handleShareTargetDraftSelectChange = option => {
    const parsed = deriveShareTargetFromOption(option);
    setShareTargetDraft(prev => ({
      ...prev,
      stockId: parsed.stockId,
      stockName: parsed.stockName
    }));
  };

  const handleShareTargetDraftQuantityChange = event => {
    const value = event.target.value;
    setShareTargetDraft(prev => ({ ...prev, quantity: value }));
  };

  const handleShareTargetAdd = () => {
    const stockId = String(shareTargetDraft.stockId || '').trim().toUpperCase();
    const quantity = Number(shareTargetDraft.quantity);
    if (!stockId || !Number.isFinite(quantity) || quantity <= 0) {
      alert(msg.shareGoalInputRequired);
      return;
    }
    let stockName = typeof shareTargetDraft.stockName === 'string'
      ? shareTargetDraft.stockName.trim().slice(0, 60)
      : '';
    if (!stockName) {
      const fallbackName = shareTargetNameLookup.get(stockId);
      stockName = typeof fallbackName === 'string' ? fallbackName.trim().slice(0, 60) : '';
    }
    setGoalForm(prev => {
      const targets = Array.isArray(prev.shareTargets) ? [...prev.shareTargets] : [];
      const existingIndex = targets.findIndex(item => String(item?.stockId || '').trim().toUpperCase() === stockId);
      const entry = {
        stockId,
        stockName,
        targetQuantity: String(quantity)
      };
      if (existingIndex >= 0) {
        targets[existingIndex] = entry;
      } else {
        targets.push(entry);
      }
      return {
        ...prev,
        shareTargets: targets
      };
    });
    setShareTargetDraft({ stockId: '', stockName: '', quantity: '' });
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
    const normalizedGoalType = GOAL_TYPES.includes(goalForm.goalType)
      ? goalForm.goalType
      : DEFAULT_GOAL_TYPE;
    const isShareGoalType = normalizedGoalType === 'shares';

    const shareTargetsRaw = Array.isArray(goalForm.shareTargets) ? goalForm.shareTargets : [];
    const seen = new Set();
    const sanitizedShareTargets = [];
    shareTargetsRaw.forEach(item => {
      const stockId = typeof item?.stockId === 'string' ? item.stockId.trim().toUpperCase() : '';
      if (!stockId || seen.has(stockId)) return;
      const quantity = Number(item?.targetQuantity);
      if (!Number.isFinite(quantity) || quantity <= 0) return;
      let stockName = typeof item?.stockName === 'string'
        ? item.stockName.trim().slice(0, 60)
        : '';
      if (!stockName) {
        const fallbackName = shareTargetNameLookup.get(stockId);
        stockName = typeof fallbackName === 'string' ? fallbackName.trim().slice(0, 60) : '';
      }
      sanitizedShareTargets.push({
        stockId,
        stockName,
        targetQuantity: quantity
      });
      seen.add(stockId);
    });

    const updated = {
      goalName: typeof goalForm.name === 'string' ? goalForm.name.trim().slice(0, 60) : '',
      goalType: normalizedGoalType,
      totalTarget: isShareGoalType ? 0 : parseGoal(goalForm.annualTarget),
      monthlyTarget: isShareGoalType ? 0 : parseGoal(goalForm.monthlyTarget),
      minimumTarget: isShareGoalType ? 0 : parseGoal(goalForm.minimumTarget),
      shareTargets: sanitizedShareTargets
    };

    const nextFormState = {
      name: updated.goalName,
      goalType: updated.goalType,
      annualTarget: !isShareGoalType && updated.totalTarget ? String(updated.totalTarget) : '',
      monthlyTarget: !isShareGoalType && updated.monthlyTarget ? String(updated.monthlyTarget) : '',
      minimumTarget: !isShareGoalType && updated.minimumTarget ? String(updated.minimumTarget) : '',
      shareTargets: sanitizedShareTargets.map(target => ({
        stockId: target.stockId,
        stockName: target.stockName,
        targetQuantity: String(target.targetQuantity)
      }))
    };

    setGoalForm(nextFormState);

    const isEmptyGoal = !updated.goalName
      && !updated.totalTarget
      && !updated.monthlyTarget
      && !updated.minimumTarget
      && sanitizedShareTargets.length === 0;
    if (isEmptyGoal) {
      setGoals(updated);
      saveInvestmentGoals(updated);
      setGoalSaved('empty');
      return;
    }

    const prevGoalName = typeof goals.goalName === 'string' ? goals.goalName : '';
    const prevGoalType = GOAL_TYPES.includes(goals.goalType) ? goals.goalType : DEFAULT_GOAL_TYPE;
    const prevTotalTarget = Number.isFinite(Number(goals.totalTarget)) ? Number(goals.totalTarget) : 0;
    const prevMonthlyTarget = Number.isFinite(Number(goals.monthlyTarget)) ? Number(goals.monthlyTarget) : 0;
    const prevMinimumTarget = Number.isFinite(Number(goals.minimumTarget)) ? Number(goals.minimumTarget) : 0;
    const prevShareTargets = Array.isArray(goals.shareTargets) ? goals.shareTargets : [];
    const prevShareTargetMap = new Map();
    prevShareTargets.forEach(item => {
      const stockId = typeof item?.stockId === 'string' ? item.stockId.trim().toUpperCase() : '';
      if (!stockId || prevShareTargetMap.has(stockId)) return;
      const quantity = Number(item?.targetQuantity);
      prevShareTargetMap.set(stockId, {
        stockName: typeof item?.stockName === 'string' ? item.stockName.trim().slice(0, 60) : '',
        targetQuantity: Number.isFinite(quantity) ? quantity : 0
      });
    });
    const shareTargetsChanged = sanitizedShareTargets.length !== prevShareTargetMap.size
      || sanitizedShareTargets.some(target => {
        const prevTarget = prevShareTargetMap.get(target.stockId);
        if (!prevTarget) return true;
        return prevTarget.stockName !== (target.stockName || '')
          || prevTarget.targetQuantity !== target.targetQuantity;
      });

    const hasChanged =
      updated.goalName !== prevGoalName
      || updated.goalType !== prevGoalType
      || updated.totalTarget !== prevTotalTarget
      || updated.monthlyTarget !== prevMonthlyTarget
      || updated.minimumTarget !== prevMinimumTarget
      || shareTargetsChanged;

    if (!hasChanged) {
      setGoalSaved('');
      return;
    }

    setGoals(updated);
    saveInvestmentGoals(updated);
    setGoalSaved('saved');
  };

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

  const shareGoalRows = useMemo(() => {
    const shareTargets = Array.isArray(goals.shareTargets) ? goals.shareTargets : [];
    if (!shareTargets.length) {
      return [];
    }
    const inventoryMap = new Map();
    (Array.isArray(inventoryList) ? inventoryList : []).forEach(item => {
      const stockId = typeof item?.stock_id === 'string' ? item.stock_id.trim().toUpperCase() : '';
      if (!stockId || inventoryMap.has(stockId)) return;
      inventoryMap.set(stockId, item);
    });
    const formatLots = value => {
      if (!Number.isFinite(value)) return '0';
      return Number(value).toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: Math.abs(value % 1) > 0 ? 2 : 0
      });
    };
    return shareTargets.map(target => {
      const stockId = typeof target?.stockId === 'string' ? target.stockId.trim().toUpperCase() : '';
      const targetLots = Number(target?.targetQuantity);
      if (!stockId || !Number.isFinite(targetLots) || targetLots <= 0) {
        return null;
      }
      const inventoryItem = inventoryMap.get(stockId);
      const currentShares = Number(inventoryItem?.total_quantity) || 0;
      const currentLots = currentShares / SHARES_PER_LOT;
      const targetShares = targetLots * SHARES_PER_LOT;
      const percent = targetShares > 0 ? Math.min(1, currentShares / targetShares) : 0;
      const inventoryName = typeof inventoryItem?.stock_name === 'string' ? inventoryItem.stock_name.trim() : '';
      const storedName = typeof target?.stockName === 'string' ? target.stockName.trim() : '';
      const labelName = storedName || inventoryName;
      const label = labelName ? `${stockId} (${labelName})` : stockId;
      const encouragement = percent >= 1
        ? msg.shareGoalDone
        : percent >= 0.5
          ? msg.shareGoalHalf
          : '';
      return {
        id: `share-${stockId}`,
        label,
        current: `${msg.shareGoalCurrent}${formatLots(currentLots)} ${msg.shareGoalUnit}`,
        target: `${msg.shareGoalTargetDisplay}${formatLots(targetLots)} ${msg.shareGoalUnit}`,
        percent,
        percentLabel: `${Math.min(100, Math.round(percent * 100))}%`,
        encouragement
      };
    }).filter(Boolean);
  }, [goals.shareTargets, inventoryList, msg.shareGoalCurrent, msg.shareGoalTargetDisplay, msg.shareGoalUnit, msg.shareGoalHalf, msg.shareGoalDone]);

  const normalizedSavedGoalType = GOAL_TYPES.includes(goals.goalType)
    ? goals.goalType
    : DEFAULT_GOAL_TYPE;

  const combinedGoalRows = useMemo(
    () => (normalizedSavedGoalType === 'shares'
      ? [...goalRows, ...shareGoalRows]
      : goalRows),
    [goalRows, shareGoalRows, normalizedSavedGoalType]
  );

  const combinedGoalEmptyState = normalizedSavedGoalType === 'shares' && shareGoalRows.length > 0
    ? ''
    : goalEmptyState;

  const goalSavedMessage = goalSaved === 'empty'
    ? msg.goalSavedEmpty
    : goalSaved === 'saved'
      ? msg.goalSaved
      : '';
  const goalTitle = goals.goalName?.trim() ? goals.goalName.trim() : msg.investmentGoals;
  const normalizedGoalType = GOAL_TYPES.includes(goalForm.goalType)
    ? goalForm.goalType
    : DEFAULT_GOAL_TYPE;
  const goalTypeOptions = [
    { value: 'annual', label: msg.annualGoal },
    { value: 'monthly', label: msg.monthlyGoal },
    { value: 'minimum', label: msg.minimumGoal },
    { value: 'shares', label: msg.shareGoalTypeOption }
  ];
  const goalTargetConfig = normalizedGoalType === 'shares'
    ? null
    : normalizedGoalType === 'monthly'
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
  const goalShareTargets = Array.isArray(goalForm.shareTargets) ? goalForm.shareTargets : [];

  const shareGoalFormSection = {
    id: 'share-targets',
    render: () => {
      const draftSelectValue = buildShareTargetSelectValue(
        shareTargetDraft.stockId,
        shareTargetDraft.stockName
      );
      return (
        <div className={styles.shareGoalSection}>
          <div className={styles.shareGoalHeader}>{msg.shareGoalSectionTitle}</div>
          {goalShareTargets.length ? (
            <div className={styles.shareGoalList}>
              {goalShareTargets.map((target, index) => {
                const baseId = `share-target-${index}`;
                const stockIdValue = typeof target?.stockId === 'string' ? target.stockId : '';
                const stockNameValue = typeof target?.stockName === 'string' ? target.stockName : '';
                const selectValue = buildShareTargetSelectValue(stockIdValue, stockNameValue);
                const quantityValue = typeof target?.targetQuantity === 'string'
                  ? target.targetQuantity
                  : target?.targetQuantity
                    ? String(target.targetQuantity)
                    : '';
                return (
                  <div key={`${stockIdValue || 'target'}-${index}`} className={styles.shareGoalRow}>
                    <div className={`${styles.inputGroup} ${styles.shareGoalInput}`}>
                      <label htmlFor={`${baseId}-stock`}>{msg.shareGoalStockInputLabel}</label>
                      <CreatableSelect
                        inputId={`${baseId}-stock`}
                        className={styles.shareGoalSelect}
                        classNamePrefix="share-target-select"
                        styles={selectStyles}
                        options={shareTargetOptions}
                        value={selectValue}
                        onChange={handleShareTargetSelectChange(index)}
                        placeholder={msg.shareGoalStockInputPlaceholder}
                        isClearable
                      />
                    </div>
                    <div className={`${styles.inputGroup} ${styles.shareGoalInput}`}>
                      <label htmlFor={`${baseId}-quantity`}>{msg.shareGoalTargetLabelForm}</label>
                      <input
                        id={`${baseId}-quantity`}
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="1"
                        value={quantityValue}
                        onChange={handleShareTargetQuantityChange(index)}
                        placeholder={msg.shareGoalTargetPlaceholder}
                      />
                    </div>
                    <div className={styles.shareGoalActions}>
                      <button type="button" onClick={() => handleShareTargetRemove(index)}>
                        {msg.shareGoalRemove}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className={styles.shareGoalEmpty}>{msg.shareGoalEmptyList}</p>
          )}
          <div className={styles.shareGoalRow}>
            <div className={`${styles.inputGroup} ${styles.shareGoalInput}`}>
              <label htmlFor="share-target-new-stock">{msg.shareGoalStockInputLabel}</label>
              <CreatableSelect
                inputId="share-target-new-stock"
                className={styles.shareGoalSelect}
                classNamePrefix="share-target-select"
                styles={selectStyles}
                options={shareTargetOptions}
                value={draftSelectValue}
                onChange={handleShareTargetDraftSelectChange}
                placeholder={msg.shareGoalStockInputPlaceholder}
                isClearable
              />
            </div>
            <div className={`${styles.inputGroup} ${styles.shareGoalInput}`}>
              <label htmlFor="share-target-new-quantity">{msg.shareGoalTargetLabelForm}</label>
              <input
                id="share-target-new-quantity"
                type="number"
                inputMode="decimal"
                min="0"
                step="1"
                value={shareTargetDraft.quantity}
                onChange={handleShareTargetDraftQuantityChange}
                placeholder={msg.shareGoalTargetPlaceholder}
              />
            </div>
            <div className={styles.shareGoalActions}>
              <button type="button" className={styles.shareGoalAddButton} onClick={handleShareTargetAdd}>
                {msg.shareGoalAddButton}
              </button>
            </div>
          </div>
        </div>
      );
    }
  };
  const goalFormSections = normalizedGoalType === 'shares' ? [shareGoalFormSection] : [];

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
      goalType: GOAL_TYPES.includes(value) ? value : prev.goalType
    }));
  };

  const handleGoalTargetChange = event => {
    const value = event.target.value;
    setGoalForm(prev => {
      if (prev.goalType === 'shares') {
        return prev;
      }
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
              rows={combinedGoalRows}
              savedMessage={goalSavedMessage}
              emptyState={combinedGoalEmptyState}
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
                targetLabel: goalTargetConfig?.label,
                targetValue: goalTargetConfig?.value ?? '',
                onTargetChange: handleGoalTargetChange,
                targetPlaceholder: goalTargetConfig?.placeholder,
                targetStep: goalTargetConfig?.step,
                targetMin: '0',
                targetHidden: !goalTargetConfig,
                saveLabel: msg.goalText,
                saveButton: msg.goalSave,
                sections: goalFormSections
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
