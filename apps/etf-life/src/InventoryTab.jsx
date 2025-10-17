import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Cookies from 'js-cookie';
import CreatableSelect from 'react-select/creatable';
import { HOST_URL } from './config';
import { fetchDividendsByYears } from './dividendApi';
import { fetchStockList } from './stockApi';
import useEffectOnce from './hooks/useEffectOnce';
import {
  migrateTransactionHistory,
  saveTransactionHistory,
  getTransactionHistoryUpdatedAt
} from './utils/transactionStorage';
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
import { useFirebaseAuth } from './firebase/AuthProvider';
import { useWorkspaceTransactions } from './hooks/useWorkspaceTransactions';
import {
  areTransactionsEqual,
  ensureTransactionListHasIds,
  generateTransactionId
} from './utils/transactionUtils';

const BACKUP_COOKIE_KEY = 'inventory_last_backup';
const SHARES_PER_LOT = 1000;
const DEFAULT_GOAL_TYPE = 'annual';

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

const createEmptyPurchaseEntry = () => ({
  stock_id: '',
  stock_name: '',
  quantity: '',
  price: ''
});

const createInitialFormState = () => ({
  date: getToday(),
  entries: [createEmptyPurchaseEntry()]
});

export default function InventoryTab() {
  const [stockList, setStockList] = useState([]);
  const [transactionHistory, setTransactionHistory] = useState(() =>
    ensureTransactionListHasIds(migrateTransactionHistory())
  );
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(createInitialFormState);
  const [showInventory, setShowInventory] = useState(true);
  const [editingIdx, setEditingIdx] = useState(null);
  const [editForm, setEditForm] = useState({ date: '', quantity: '', price: '' });
  const [sellModal, setSellModal] = useState({ show: false, stock: null });
  const fileInputRef = useRef(null);
  const autoSaveRequestRef = useRef(0);
  const autoSaveDirectoryHandleRef = useRef(null);
  const autoSaveFileHandleRef = useRef(null);
  const [cacheInfo, setCacheInfo] = useState(null);
  const [dividendCacheInfo, setDividendCacheInfo] = useState(null);
  const [showDataMenu, setShowDataMenu] = useState(false);
  const [selectedDataSource, setSelectedDataSource] = useState('csv');
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(false);
  const [autoSaveState, setAutoSaveState] = useState({ status: 'idle', provider: 'csv' });
  const [transactionHistoryUpdatedAt, setTransactionHistoryUpdatedAt] = useState(
    () => getTransactionHistoryUpdatedAt() ?? 0
  );
  const [latestPrices, setLatestPrices] = useState({});
  const [dividendData, setDividendData] = useState([]);
  const { lang } = useLanguage();
  const {
    user,
    initializing: authInitializing,
    error: authError,
    signIn: signInWithGoogle,
    signOut: signOutFromGoogle
  } = useFirebaseAuth();
  const workspaceId = user?.uid ?? null;
  const {
    transactions: remoteTransactions,
    status: syncStatus,
    error: syncError,
    initialLoadComplete: remoteInitialLoadComplete,
    addTransactions: addRemoteTransactions,
    updateTransaction: updateRemoteTransaction,
    deleteTransactions: deleteRemoteTransactions,
    replaceAllTransactions: replaceRemoteTransactions
  } = useWorkspaceTransactions(workspaceId);
  const [hasUploadedLocalSnapshot, setHasUploadedLocalSnapshot] = useState(false);
  const replaceRemoteWithList = useCallback(
    async list => {
      if (!workspaceId || !Array.isArray(list) || list.length === 0) {
        return;
      }
      try {
        const normalized = ensureTransactionListHasIds(list);
        if (normalized.length === 0) return;
        await replaceRemoteTransactions(normalized);
      } catch (error) {
        console.error('Failed to replace remote transactions', error);
      }
    },
    [workspaceId, replaceRemoteTransactions]
  );
  const handleSignIn = useCallback(async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error('Sign-in attempt failed', error);
    }
  }, [signInWithGoogle]);
  const handleSignOut = useCallback(async () => {
    try {
      await signOutFromGoogle();
    } catch (error) {
      console.error('Sign-out attempt failed', error);
    }
  }, [signOutFromGoogle]);
  const initialGoals = useMemo(() => loadInvestmentGoals(), []);
  const initialShareTargetList = Array.isArray(initialGoals.shareTargets) ? initialGoals.shareTargets : [];
  const hasInitialShareTargets = initialShareTargetList.some(item => {
    const quantityValue = +item?.targetQuantity;
    return Number.isFinite(quantityValue) && quantityValue > 0;
  });
  const initialCashflowGoalList = Array.isArray(initialGoals.cashflowGoals) ? initialGoals.cashflowGoals : [];
  const initialPrimaryGoalType = (() => {
    const firstGoalType = initialCashflowGoalList.find(goal => {
      const type = typeof goal?.goalType === 'string' ? goal.goalType.toLowerCase() : '';
      return ['annual', 'monthly', 'minimum'].includes(type);
    })?.goalType;
    if (firstGoalType) {
      return firstGoalType;
    }
    if (hasInitialShareTargets) return 'shares';
    return DEFAULT_GOAL_TYPE;
  })();
  const [goals, setGoals] = useState({
    ...initialGoals,
    goalType: initialPrimaryGoalType
  });
  const initialShareTargets = initialShareTargetList.length
    ? initialShareTargetList.map(item => ({
        stockId: item?.stockId || '',
        stockName: item?.stockName || '',
        targetQuantity: item?.targetQuantity ? String(item.targetQuantity) : ''
      }))
    : [];
  const initialCashflowGoalEntries = initialCashflowGoalList.length
    ? initialCashflowGoalList.map((goal, index) => {
        const rawType = typeof goal?.goalType === 'string' ? goal.goalType.toLowerCase() : '';
        const goalType = ['annual', 'monthly', 'minimum'].includes(rawType) ? rawType : 'annual';
        const currencyRaw = typeof goal?.currency === 'string' ? goal.currency.toUpperCase() : '';
        const currency = ['TWD', 'USD'].includes(currencyRaw) ? currencyRaw : 'TWD';
        return {
          id: typeof goal?.id === 'string' && goal.id.trim() ? goal.id.trim() : `goal-${index + 1}`,
          goalType,
          currency,
          target: goal?.target ? String(goal.target) : '',
          name: typeof goal?.name === 'string' ? goal.name : ''
        };
      })
    : [];
  const [goalForm, setGoalForm] = useState(() => ({
    name: initialGoals.goalName ? String(initialGoals.goalName) : '',
    cashflowGoals: initialCashflowGoalEntries,
    shareTargets: initialShareTargets
  }));
  const cashflowGoalIdRef = useRef(initialCashflowGoalEntries.length);
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
      notice: '這是一個免費網站，我們不會把你的資料存到後台或伺服器，所有的紀錄（像是你的設定或操作紀錄）都只會保存在你的瀏覽器裡，開啟自動儲存功能後會自動幫你儲存。簡單說：你的資料只在你這台電腦，不會上傳，也不會被我們看到，請安心使用！',
      addRecord: '新增購買',
      dataAccess: '存取資料',
      syncSignIn: '登入雲端同步',
      syncSigningIn: '登入中…',
      syncSignOut: '登出',
      syncSignedIn: '雲端同步已啟用',
      syncSignedOut: '尚未登入雲端同步',
      syncConnecting: '同步連線中…',
      syncPending: '有待送出的修改',
      syncOffline: '離線使用中，將於恢復後同步',
      syncReady: '雲端同步完成',
      syncError: '同步失敗，請稍後再試',
      syncUserPrefix: '雲端帳號：',
      currentInventory: '目前庫存',
      showHistory: '顯示：交易歷史',
      cache: '快取',
      stockCache: '股票清單快取',
      dividendCache: '股息資料快取',
      totalInvestment: '總投資金額：',
      totalValue: '目前總價值：',
      investmentGoals: '預期的股息目標',
      goalNameLabel: '幫目標取個名字',
      goalNamePlaceholder: '例：一年滾出 10 萬股息',
      goalNameHelper: '清楚的名稱能提醒自己為什麼開始。',
      goalFormIntro: '替你的股息計畫取個名字，選擇年度、每月或最低目標，讓努力更有方向！',
      goalCurrencyLabel: '目標幣別',
      goalCurrencyTwd: '台幣（NT$）',
      goalCurrencyUsd: '美金（US$）',
      goalCashflowSectionTitle: '現金流目標',
      goalCashflowEmpty: '還沒有設定現金流目標，按「新增現金流目標」開始。',
      goalCashflowAdd: '新增現金流目標',
      goalCashflowRemove: '移除目標',
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
      syncSignIn: 'Sign in to sync',
      syncSigningIn: 'Signing in…',
      syncSignOut: 'Sign out',
      syncSignedIn: 'Cloud sync active',
      syncSignedOut: 'Not signed in',
      syncConnecting: 'Connecting to cloud…',
      syncPending: 'Pending local changes',
      syncOffline: 'Offline mode – syncing when back online',
      syncReady: 'Cloud sync up to date',
      syncError: 'Sync failed. Please try again later.',
      syncUserPrefix: 'Cloud account: ',
      currentInventory: 'Inventory',
      showHistory: 'Show: Transaction',
      cache: 'Cache',
      stockCache: 'Stock list cache',
      dividendCache: 'Dividend cache',
      totalInvestment: 'Total Investment:',
      totalValue: 'Total Value:',
      investmentGoals: 'Expected Dividend Targets',
      goalNameLabel: 'Name your goal',
      goalNamePlaceholder: 'e.g. Build a $5K dividend stream',
      goalNameHelper: 'A memorable name keeps your motivation high.',
      goalFormIntro: 'Give your dividend plan a motivating title, then choose an annual, monthly, or minimum target.',
      goalCurrencyLabel: 'Currency',
      goalCurrencyTwd: 'New Taiwan Dollar (NT$)',
      goalCurrencyUsd: 'US Dollar (US$)',
      goalCashflowSectionTitle: 'Cash-flow goals',
      goalCashflowEmpty: 'No cash-flow goals yet. Click “Add cash-flow goal” to start.',
      goalCashflowAdd: 'Add cash-flow goal',
      goalCashflowRemove: 'Remove goal',
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
  const syncStatusMap = {
    connecting: msg.syncConnecting,
    pending: msg.syncPending,
    offline: msg.syncOffline,
    synced: msg.syncReady,
    error: msg.syncError,
    idle: user ? msg.syncSignedIn : msg.syncSignedOut
  };
  const syncStatusMessage = syncStatusMap[syncStatus] || (user ? msg.syncSignedIn : msg.syncSignedOut);
  const syncAccountLabel = user?.displayName || user?.email || '';

  const mapTransactionsWithStockNames = useCallback(
    list =>
      ensureTransactionListHasIds(
        (Array.isArray(list) ? list : []).map(item => {
          const stock = stockList.find(s => s.stock_id === item.stock_id);
          return {
            ...item,
            stock_name: item.stock_name || (stock ? stock.stock_name : '')
          };
        })
      ),
    [stockList]
  );

  const ensurePermission = useCallback(async (handle, mode = 'readwrite') => {
    if (!handle) return false;
    if (!handle.queryPermission || !handle.requestPermission) {
      return true;
    }
    const current = await handle.queryPermission({ mode });
    if (current === 'granted') {
      return true;
    }
    if (current === 'denied') {
      return false;
    }
    const requested = await handle.requestPermission({ mode });
    return requested === 'granted';
  }, []);

  const resetCsvAutoSaveHandles = useCallback(() => {
    autoSaveDirectoryHandleRef.current = null;
    autoSaveFileHandleRef.current = null;
  }, []);

  const maybeRestoreFromBackup = useCallback(
    async provider => {
      const localUpdatedAt = transactionHistoryUpdatedAt ?? getTransactionHistoryUpdatedAt() ?? 0;
      try {
        if (provider === 'csv') {
          if (typeof window === 'undefined' || typeof window.showDirectoryPicker !== 'function') {
            return null;
          }

          let directoryHandle = autoSaveDirectoryHandleRef.current;
          if (!directoryHandle) {
            directoryHandle = await window.showDirectoryPicker({ id: 'inventory-auto-save' });
            autoSaveDirectoryHandleRef.current = directoryHandle;
            autoSaveFileHandleRef.current = null;
          }

          if (!(await ensurePermission(directoryHandle, 'readwrite'))) {
            resetCsvAutoSaveHandles();
            return null;
          }

          let fileHandle = autoSaveFileHandleRef.current;
          if (!fileHandle) {
            try {
              fileHandle = await directoryHandle.getFileHandle('inventory_backup.csv');
            } catch (error) {
              if (error?.name === 'NotFoundError' || error?.code === 'NotFoundError') {
                return null;
              }
              throw error;
            }
            autoSaveFileHandleRef.current = fileHandle;
          }

          if (!(await ensurePermission(fileHandle, 'read'))) {
            return null;
          }

          const file = await fileHandle.getFile();
          const modifiedTime = Number.isFinite(file?.lastModified) ? file.lastModified : null;
          if (modifiedTime && modifiedTime <= localUpdatedAt) {
            return null;
          }

          const text = await file.text();
          const imported = mapTransactionsWithStockNames(transactionsFromCsv(text));
          if (!Array.isArray(imported) || imported.length === 0) {
            return null;
          }

          setTransactionHistory(imported);
          saveTransactionHistory(imported);
          await replaceRemoteWithList(imported);
          const timestamp = modifiedTime || Date.now();
          setTransactionHistoryUpdatedAt(timestamp);

          let relativePath = '';
          if (typeof directoryHandle.resolve === 'function') {
            try {
              const segments = await directoryHandle.resolve(fileHandle);
              if (Array.isArray(segments) && segments.length > 1) {
                relativePath = segments.slice(0, -1).join('/');
              }
            } catch (resolveError) {
              console.warn('Failed to resolve file path', resolveError);
            }
          }

          const basePath = directoryHandle?.name ? String(directoryHandle.name) : '';
          const combinedPath = relativePath ? `${basePath}/${relativePath}` : basePath;

          setAutoSaveState({
            status: 'success',
            timestamp,
            provider: 'csv',
            location: {
              type: 'fileSystem',
              path: combinedPath,
              filename: file?.name || 'inventory_backup.csv'
            }
          });

          return imported;
        }

        if (provider === 'googleDrive') {
          const result = await importTransactionsFromDrive({ includeMetadata: true });
          const list = Array.isArray(result) ? result : result?.list;
          if (!Array.isArray(list) || list.length === 0) {
            return null;
          }
          const remoteModified =
            !Array.isArray(result) && Number.isFinite(result?.modifiedTime) ? result.modifiedTime : null;
          if (remoteModified && remoteModified <= localUpdatedAt) {
            return null;
          }
          const imported = mapTransactionsWithStockNames(list);
          if (imported.length === 0) {
            return null;
          }
          setTransactionHistory(imported);
          saveTransactionHistory(imported);
          await replaceRemoteWithList(imported);
          const timestamp = remoteModified || Date.now();
          setTransactionHistoryUpdatedAt(timestamp);
          setAutoSaveState({ status: 'success', timestamp, provider: 'googleDrive' });
          return imported;
        }

        if (provider === 'oneDrive') {
          const result = await importTransactionsFromOneDrive({ includeMetadata: true });
          const list = Array.isArray(result) ? result : result?.list;
          if (!Array.isArray(list) || list.length === 0) {
            return null;
          }
          const remoteModified =
            !Array.isArray(result) && Number.isFinite(result?.modifiedTime) ? result.modifiedTime : null;
          if (remoteModified && remoteModified <= localUpdatedAt) {
            return null;
          }
          const imported = mapTransactionsWithStockNames(list);
          if (imported.length === 0) {
            return null;
          }
          setTransactionHistory(imported);
          saveTransactionHistory(imported);
          await replaceRemoteWithList(imported);
          const timestamp = remoteModified || Date.now();
          setTransactionHistoryUpdatedAt(timestamp);
          setAutoSaveState({ status: 'success', timestamp, provider: 'oneDrive' });
          return imported;
        }
      } catch (error) {
        console.error('Auto-save backup sync failed', error);
      }
      return null;
    },
    [
      ensurePermission,
      mapTransactionsWithStockNames,
      transactionHistoryUpdatedAt,
      resetCsvAutoSaveHandles,
      replaceRemoteWithList
    ]
  );

  const runAutoSave = useCallback(
    async (list, options = {}) => {
      const { provider: providerOverride, force = false } = options;
      const provider = providerOverride || selectedDataSource;
      if (!provider) return;
      if (!autoSaveEnabled && !force) return;

      const data = Array.isArray(list) ? list : transactionHistory;
      const requestId = Date.now();
      autoSaveRequestRef.current = requestId;
      setAutoSaveState({ status: 'saving', provider });

      try {
        let locationInfo;
        if (provider === 'csv') {
          const csvContent = transactionsToCsv(data);
          if (typeof window === 'undefined') {
            throw new Error('CSV auto-save requires a browser environment');
          }

          if (typeof window.showDirectoryPicker === 'function') {
            let directoryHandle = autoSaveDirectoryHandleRef.current;
            if (directoryHandle) {
              const directoryPermission = await ensurePermission(directoryHandle, 'readwrite');
              if (!directoryPermission) {
                resetCsvAutoSaveHandles();
                directoryHandle = null;
              }
            }

            if (!directoryHandle) {
              directoryHandle = await window.showDirectoryPicker({ id: 'inventory-auto-save' });
              autoSaveDirectoryHandleRef.current = directoryHandle;
              autoSaveFileHandleRef.current = null;
            }

            if (!(await ensurePermission(directoryHandle, 'readwrite'))) {
              throw new Error('Permission denied for the selected directory');
            }

            let fileHandle = autoSaveFileHandleRef.current;
            if (!fileHandle) {
              fileHandle = await directoryHandle.getFileHandle('inventory_backup.csv', { create: true });
              autoSaveFileHandleRef.current = fileHandle;
            }

            if (!(await ensurePermission(fileHandle, 'readwrite'))) {
              throw new Error('Permission denied for the backup file');
            }

            const writable = await fileHandle.createWritable();
            await writable.write(csvContent);
            await writable.close();

            let relativePath = '';
            if (typeof directoryHandle.resolve === 'function') {
              try {
                const segments = await directoryHandle.resolve(fileHandle);
                if (Array.isArray(segments) && segments.length > 1) {
                  relativePath = segments.slice(0, -1).join('/');
                }
              } catch (resolveError) {
                console.warn('Failed to resolve file path', resolveError);
              }
            }

            const basePath = directoryHandle?.name ? String(directoryHandle.name) : '';
            const combinedPath = relativePath ? `${basePath}/${relativePath}` : basePath;

            locationInfo = {
              type: 'fileSystem',
              path: combinedPath,
              filename: fileHandle?.name || 'inventory_backup.csv'
            };
          } else if (typeof window.showSaveFilePicker === 'function') {
            let fileHandle = autoSaveFileHandleRef.current;
            if (!fileHandle) {
              fileHandle = await window.showSaveFilePicker({
                suggestedName: 'inventory_backup.csv',
                types: [{ description: 'CSV Files', accept: { 'text/csv': ['.csv'] } }]
              });
              autoSaveFileHandleRef.current = fileHandle;
            }

            if (!(await ensurePermission(fileHandle, 'readwrite'))) {
              throw new Error('Permission denied for the selected file');
            }

            const writable = await fileHandle.createWritable();
            await writable.write(csvContent);
            await writable.close();

            locationInfo = {
              type: 'fileSystem',
              filename: fileHandle?.name || 'inventory_backup.csv'
            };
          } else {
            throw new Error('This browser does not support saving files to the local filesystem');
          }
        } else if (provider === 'googleDrive') {
          await exportTransactionsToDrive(data);
        } else if (provider === 'oneDrive') {
          await exportTransactionsToOneDrive(data);
        } else if (provider === 'icloudDrive') {
          await exportTransactionsToICloud(data);
        } else {
          throw new Error(`Unsupported auto-save provider: ${provider}`);
        }

        if (autoSaveRequestRef.current === requestId) {
          setAutoSaveState({
            status: 'success',
            timestamp: Date.now(),
            provider,
            ...(locationInfo ? { location: locationInfo } : {})
          });
        }
      } catch (error) {
        console.error('Auto save failed', error);
        if (provider === 'csv') {
          resetCsvAutoSaveHandles();
        }
        if (autoSaveRequestRef.current === requestId) {
          setAutoSaveState({ status: 'error', timestamp: Date.now(), provider });
        }
      }
    },
    [
      autoSaveEnabled,
      ensurePermission,
      resetCsvAutoSaveHandles,
      selectedDataSource,
      transactionHistory
    ]
  );

  const handleDataSourceChange = useCallback(
    value => {
      setSelectedDataSource(value);
      runAutoSave(transactionHistory, { provider: value, force: autoSaveEnabled });
    },
    [autoSaveEnabled, runAutoSave, transactionHistory]
  );

  const handleAutoSaveToggle = useCallback(() => {
    if (autoSaveEnabled) {
      setAutoSaveEnabled(false);
      return;
    }

    (async () => {
      let syncedList = null;
      try {
        syncedList = await maybeRestoreFromBackup(selectedDataSource);
      } catch (error) {
        console.error('Auto-save sync before enabling failed', error);
      }
      setAutoSaveEnabled(true);
      const dataToPersist = Array.isArray(syncedList) ? syncedList : transactionHistory;
      runAutoSave(dataToPersist, { force: true, provider: selectedDataSource });
    })();
  }, [
    autoSaveEnabled,
    maybeRestoreFromBackup,
    runAutoSave,
    selectedDataSource,
    transactionHistory
  ]);

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
    reader.onload = async event => {
      const text = event.target.result;
      const imported = mapTransactionsWithStockNames(transactionsFromCsv(text));
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
      await replaceRemoteWithList(imported);
      e.target.value = '';
      alert(msg.importDone);
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
      const enriched = mapTransactionsWithStockNames(list);
      setTransactionHistory(enriched);
      saveTransactionHistory(enriched);
      await replaceRemoteWithList(enriched);
      alert(msg.importDriveSuccess);
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
      const enriched = mapTransactionsWithStockNames(list);
      setTransactionHistory(enriched);
      saveTransactionHistory(enriched);
      await replaceRemoteWithList(enriched);
      alert(msg.importOneDriveSuccess);
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
      const enriched = mapTransactionsWithStockNames(list);
      setTransactionHistory(enriched);
      saveTransactionHistory(enriched);
      await replaceRemoteWithList(enriched);
      alert(msg.importICloudSuccess);
    } catch (err) {
      console.error('iCloud manual import failed', err);
      alert(msg.importICloudFail);
    }
  };

  const backupPrompt = msg.backupPrompt;

  useEffect(() => {
    if (transactionHistory.length === 0) return;
    const last = Cookies.get(BACKUP_COOKIE_KEY);
    const now = new Date();
    if (!last) {
      Cookies.set(BACKUP_COOKIE_KEY, now.toISOString(), { expires: 365 });
    } else if (now - new Date(last) >= 30 * 24 * 60 * 60 * 1000) {
      if (window.confirm(backupPrompt)) {
        handleExport();
      }
      Cookies.set(BACKUP_COOKIE_KEY, now.toISOString(), { expires: 365 });
    }
  }, [transactionHistory, handleExport, backupPrompt]);

  useEffectOnce(() => {
    let cancelled = false;

    const fetchAll = async () => {
      try {
        const { list, meta } = await fetchStockList();
        if (cancelled) return;
        setStockList(list);
        setCacheInfo(meta ? { cacheStatus: meta.cacheStatus ?? null, timestamp: meta.timestamp ?? null } : null);
      } catch {
        if (!cancelled) {
          setStockList([]);
          setCacheInfo(null);
        }
      }
    };

    fetchAll();

    return () => {
      cancelled = true;
    };
  });

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
    if (!workspaceId) {
      setHasUploadedLocalSnapshot(false);
      return;
    }
    if (!remoteInitialLoadComplete) return;

    const normalizedRemote = mapTransactionsWithStockNames(remoteTransactions);
    if (
      normalizedRemote.length === 0 &&
      transactionHistory.length > 0 &&
      !hasUploadedLocalSnapshot
    ) {
      const prepared = ensureTransactionListHasIds(transactionHistory);
      setHasUploadedLocalSnapshot(true);
      replaceRemoteTransactions(prepared);
      return;
    }

    if (!areTransactionsEqual(normalizedRemote, transactionHistory)) {
      setTransactionHistory(normalizedRemote);
    }
    setHasUploadedLocalSnapshot(true);
  }, [
    workspaceId,
    remoteInitialLoadComplete,
    remoteTransactions,
    transactionHistory,
    mapTransactionsWithStockNames,
    hasUploadedLocalSnapshot,
    replaceRemoteTransactions
  ]);

  useEffect(() => {
    if (!workspaceId) {
      setHasUploadedLocalSnapshot(false);
    }
  }, [workspaceId]);

  useEffectOnce(() => {
    let cancelled = false;

    // The dividend feed reuses fetchWithCache, so if the previous payload is still
    // fresh we may reuse the localStorage entry without issuing another
    // network call. Surface the cache metadata so it's clear why the API
    // wasn't contacted again after a cached /get_stock_list response.
    fetchDividendsByYears()
      .then(({ data, meta }) => {
        if (cancelled) return;
        const list = data;
        setDividendData(list);
        const primaryMeta = Array.isArray(meta) && meta.length ? meta[0] : null;
        setDividendCacheInfo(primaryMeta
          ? {
              cacheStatus: primaryMeta.cacheStatus ?? null,
              timestamp: primaryMeta.timestamp ?? null
            }
          : null);
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
        if (!cancelled) {
          setDividendData([]);
          setDividendCacheInfo(null);
          setLatestPrices({});
        }
      });

    return () => {
      cancelled = true;
    };
  });

  useEffect(() => {
    saveTransactionHistory(transactionHistory);
    setTransactionHistoryUpdatedAt(Date.now());
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
    const quantityValue = +shareTargetDraft.quantity;
    if (!stockId || !Number.isFinite(quantityValue) || quantityValue <= 0) {
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
        targetQuantity: String(quantityValue)
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

  const generateCashflowGoalId = useCallback(() => {
    cashflowGoalIdRef.current += 1;
    return `goal-${Date.now()}-${cashflowGoalIdRef.current}`;
  }, []);

  const normalizeFormCashflowGoals = useCallback((rawGoals) => {
    if (!Array.isArray(rawGoals)) {
      return [];
    }
    return rawGoals.map(goal => {
      let id = typeof goal?.id === 'string' && goal.id.trim() ? goal.id.trim() : '';
      if (!id) {
        id = generateCashflowGoalId();
      }
      const goalTypeRaw = typeof goal?.goalType === 'string' ? goal.goalType.toLowerCase() : '';
      const goalType = ['annual', 'monthly', 'minimum'].includes(goalTypeRaw) ? goalTypeRaw : 'annual';
      const currencyRaw = typeof goal?.currency === 'string' ? goal.currency.toUpperCase() : '';
      const currency = ['TWD', 'USD'].includes(currencyRaw) ? currencyRaw : 'TWD';
      const targetValue = typeof goal?.target === 'string'
        ? goal.target
        : goal?.target
          ? String(goal.target)
          : '';
      const name = typeof goal?.name === 'string' ? goal.name : '';
      return {
        id,
        goalType,
        currency,
        target: targetValue,
        name
      };
    });
  }, [generateCashflowGoalId]);

  const handleCashflowGoalAdd = () => {
    setGoalForm(prev => {
      const currentGoals = Array.isArray(prev.cashflowGoals) ? [...prev.cashflowGoals] : [];
      currentGoals.push({
        id: generateCashflowGoalId(),
        goalType: 'annual',
        currency: 'TWD',
        target: '',
        name: ''
      });
      return {
        ...prev,
        cashflowGoals: currentGoals
      };
    });
  };

  const handleCashflowGoalRemove = id => {
    setGoalForm(prev => {
      const currentGoals = Array.isArray(prev.cashflowGoals) ? prev.cashflowGoals.filter(goal => goal?.id !== id) : [];
      return {
        ...prev,
        cashflowGoals: currentGoals
      };
    });
  };

  const handleCashflowGoalTypeChange = id => event => {
    const value = String(event.target.value || '').toLowerCase();
    setGoalForm(prev => {
      const currentGoals = Array.isArray(prev.cashflowGoals) ? prev.cashflowGoals.map(goal => {
        if (goal?.id !== id) {
          return goal;
        }
        const nextType = ['annual', 'monthly', 'minimum'].includes(value) ? value : goal.goalType;
        return { ...goal, goalType: nextType };
      }) : [];
      return {
        ...prev,
        cashflowGoals: currentGoals
      };
    });
  };

  const handleCashflowGoalCurrencyChange = id => event => {
    const value = String(event.target.value || '').toUpperCase();
    setGoalForm(prev => {
      const currentGoals = Array.isArray(prev.cashflowGoals) ? prev.cashflowGoals.map(goal => {
        if (goal?.id !== id) {
          return goal;
        }
        const nextCurrency = ['TWD', 'USD'].includes(value) ? value : goal.currency;
        return { ...goal, currency: nextCurrency };
      }) : [];
      return {
        ...prev,
        cashflowGoals: currentGoals
      };
    });
  };

  const handleCashflowGoalTargetChange = id => event => {
    const value = event.target.value;
    setGoalForm(prev => {
      const currentGoals = Array.isArray(prev.cashflowGoals) ? prev.cashflowGoals.map(goal => (
        goal?.id === id
          ? { ...goal, target: value }
          : goal
      )) : [];
      return {
        ...prev,
        cashflowGoals: currentGoals
      };
    });
  };

  const handleGoalSubmit = event => {
    event.preventDefault();

    const normalizedFormGoals = normalizeFormCashflowGoals(goalForm.cashflowGoals);
    const shareTargetsRaw = Array.isArray(goalForm.shareTargets) ? goalForm.shareTargets : [];
    const seenShareTargets = new Set();
    const sanitizedShareTargets = [];
    shareTargetsRaw.forEach(item => {
      const stockId = typeof item?.stockId === 'string' ? item.stockId.trim().toUpperCase() : '';
      if (!stockId || seenShareTargets.has(stockId)) return;
      const quantityValue = +item?.targetQuantity;
      if (!Number.isFinite(quantityValue) || quantityValue <= 0) return;
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
        targetQuantity: quantityValue
      });
      seenShareTargets.add(stockId);
    });

    const sanitizedCashflowGoals = [];
    normalizedFormGoals.forEach(goal => {
      const targetValue = Number(goal?.target);
      if (!Number.isFinite(targetValue) || targetValue <= 0) {
        return;
      }
      sanitizedCashflowGoals.push({
        id: goal.id,
        goalType: goal.goalType,
        target: targetValue,
        currency: goal.currency,
        name: typeof goal?.name === 'string' ? goal.name : ''
      });
    });

    const goalName = typeof goalForm.name === 'string' ? goalForm.name.trim().slice(0, 60) : '';
    const legacyAnnual = sanitizedCashflowGoals.find(goal => goal.goalType === 'annual' && goal.currency === 'TWD')?.target || 0;
    const legacyMonthly = sanitizedCashflowGoals.find(goal => goal.goalType === 'monthly' && goal.currency === 'TWD')?.target || 0;
    const legacyMinimum = sanitizedCashflowGoals.find(goal => goal.goalType === 'minimum' && goal.currency === 'TWD')?.target || 0;
    const nextGoalType = sanitizedCashflowGoals.length
      ? sanitizedCashflowGoals[0].goalType
      : sanitizedShareTargets.length > 0
        ? 'shares'
        : DEFAULT_GOAL_TYPE;

    const updated = {
      goalName,
      goalType: nextGoalType,
      cashflowGoals: sanitizedCashflowGoals,
      shareTargets: sanitizedShareTargets,
      totalTarget: legacyAnnual,
      monthlyTarget: legacyMonthly,
      minimumTarget: legacyMinimum
    };

    const nextFormState = {
      name: goalName,
      cashflowGoals: normalizedFormGoals,
      shareTargets: sanitizedShareTargets.map(target => ({
        stockId: target.stockId,
        stockName: target.stockName,
        targetQuantity: String(target.targetQuantity)
      }))
    };

    setGoalForm(nextFormState);

    const isEmptyGoal = !goalName && sanitizedCashflowGoals.length === 0 && sanitizedShareTargets.length === 0;
    if (isEmptyGoal) {
      setGoals(updated);
      saveInvestmentGoals(updated);
      setGoalSaved('empty');
      return;
    }

    const prevGoalName = typeof goals.goalName === 'string' ? goals.goalName.trim().slice(0, 60) : '';
    const prevGoalTypeRaw = typeof goals.goalType === 'string' ? goals.goalType.toLowerCase() : DEFAULT_GOAL_TYPE;
    const prevCashflowGoals = Array.isArray(goals.cashflowGoals) ? goals.cashflowGoals : [];
    const prevShareTargets = Array.isArray(goals.shareTargets) ? goals.shareTargets : [];

    const prevCashflowMap = new Map();
    prevCashflowGoals.forEach(goal => {
      const id = typeof goal?.id === 'string' && goal.id.trim()
        ? goal.id.trim()
        : `${goal?.goalType || 'goal'}-${goal?.currency || 'TWD'}-${goal?.target || 0}`;
      prevCashflowMap.set(id, {
        goalType: typeof goal?.goalType === 'string' ? goal.goalType.toLowerCase() : '',
        currency: typeof goal?.currency === 'string' ? goal.currency.toUpperCase() : 'TWD',
        target: Number(goal?.target) || 0,
        name: typeof goal?.name === 'string' ? goal.name : ''
      });
    });

    const cashflowChanged = sanitizedCashflowGoals.length !== prevCashflowMap.size
      || sanitizedCashflowGoals.some(goal => {
        const prevGoal = prevCashflowMap.get(goal.id);
        if (!prevGoal) return true;
        return prevGoal.goalType !== goal.goalType
          || prevGoal.currency !== goal.currency
          || prevGoal.target !== goal.target
          || (prevGoal.name || '') !== (goal.name || '');
      });

    const prevShareTargetMap = new Map();
    prevShareTargets.forEach(item => {
      const stockId = typeof item?.stockId === 'string' ? item.stockId.trim().toUpperCase() : '';
      if (!stockId || prevShareTargetMap.has(stockId)) return;
      const quantityValue = +item?.targetQuantity;
      prevShareTargetMap.set(stockId, {
        stockName: typeof item?.stockName === 'string' ? item.stockName.trim().slice(0, 60) : '',
        targetQuantity: Number.isFinite(quantityValue) ? quantityValue : 0
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
      goalName !== prevGoalName
      || nextGoalType !== prevGoalTypeRaw
      || cashflowChanged
      || shareTargetsChanged;

    if (!hasChanged) {
      setGoalSaved('');
      return;
    }

    setGoals(updated);
    saveInvestmentGoals(updated);
    setGoalSaved('saved');
  };

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
      messages: goalMessages
    }),
    [dividendSummary, goals, goalMessages]
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
      const numericValue = Number(value);
      if (!Number.isFinite(numericValue)) return '0';
      return numericValue.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: Math.abs(numericValue % 1) > 0 ? 2 : 0
      });
    };
    return shareTargets.map(target => {
      const stockId = typeof target?.stockId === 'string' ? target.stockId.trim().toUpperCase() : '';
      const targetLots = +target?.targetQuantity;
      if (!stockId || !Number.isFinite(targetLots) || targetLots <= 0) {
        return null;
      }
      const inventoryItem = inventoryMap.get(stockId);
      const currentSharesRaw = +inventoryItem?.total_quantity;
      const currentShares = Number.isFinite(currentSharesRaw) ? currentSharesRaw : 0;
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

  const combinedGoalRows = useMemo(
    () => [...goalRows, ...shareGoalRows],
    [goalRows, shareGoalRows]
  );

  const combinedGoalEmptyState = goalRows.length === 0 && shareGoalRows.length === 0
    ? goalEmptyState
    : '';

  const goalSavedMessage = goalSaved === 'empty'
    ? msg.goalSavedEmpty
    : goalSaved === 'saved'
      ? msg.goalSaved
      : '';
  const goalTitle = goals.goalName?.trim() ? goals.goalName.trim() : msg.investmentGoals;
  const goalShareTargets = Array.isArray(goalForm.shareTargets) ? goalForm.shareTargets : [];
  const goalCashflowGoals = Array.isArray(goalForm.cashflowGoals)
    ? goalForm.cashflowGoals.map((goal, index) => {
        const goalTypeRaw = typeof goal?.goalType === 'string' ? goal.goalType.toLowerCase() : '';
        const goalType = ['annual', 'monthly', 'minimum'].includes(goalTypeRaw) ? goalTypeRaw : 'annual';
        const currencyRaw = typeof goal?.currency === 'string' ? goal.currency.toUpperCase() : '';
        const currency = ['TWD', 'USD'].includes(currencyRaw) ? currencyRaw : 'TWD';
        const targetValue = typeof goal?.target === 'string'
          ? goal.target
          : goal?.target
            ? String(goal.target)
            : '';
        const id = typeof goal?.id === 'string' && goal.id.trim() ? goal.id.trim() : `cashflow-${index}`;
        return {
          id,
          goalType,
          currency,
          target: targetValue
        };
      })
    : [];

  const cashflowGoalTypeOptions = [
    { value: 'annual', label: msg.annualGoal },
    { value: 'monthly', label: msg.monthlyGoal },
    { value: 'minimum', label: msg.minimumGoal }
  ];

  const cashflowGoalCurrencyOptions = [
    { value: 'TWD', label: msg.goalCurrencyTwd },
    { value: 'USD', label: msg.goalCurrencyUsd }
  ];

  const getCashflowTargetConfig = goalType => {
    if (goalType === 'monthly') {
      return {
        label: msg.goalTargetMonthly,
        placeholder: msg.goalInputPlaceholderMonthly,
        step: '100'
      };
    }
    if (goalType === 'minimum') {
      return {
        label: msg.goalTargetMinimum,
        placeholder: msg.goalInputPlaceholderMonthly,
        step: '100'
      };
    }
    return {
      label: msg.goalTargetAnnual,
      placeholder: msg.goalInputPlaceholderTotal,
      step: '1000'
    };
  };

  const cashflowGoalFormSection = {
    id: 'cashflow-goals',
    render: () => (
      <div className={styles.cashflowGoalSection}>
        <div className={styles.cashflowGoalHeader}>{msg.goalCashflowSectionTitle}</div>
        {goalCashflowGoals.length ? (
          <div className={styles.cashflowGoalList}>
            {goalCashflowGoals.map(goal => {
              const baseId = `cashflow-goal-${goal.id}`;
              const targetConfig = getCashflowTargetConfig(goal.goalType);
              return (
                <div key={goal.id} className={styles.cashflowGoalRow}>
                  <div className={`${styles.inputGroup} ${styles.cashflowGoalInput}`}>
                    <label htmlFor={`${baseId}-type`}>{msg.goalTypeLabel}</label>
                    <select
                      id={`${baseId}-type`}
                      value={goal.goalType}
                      onChange={handleCashflowGoalTypeChange(goal.id)}
                    >
                      {cashflowGoalTypeOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className={`${styles.inputGroup} ${styles.cashflowGoalInput}`}>
                    <label htmlFor={`${baseId}-currency`}>{msg.goalCurrencyLabel}</label>
                    <select
                      id={`${baseId}-currency`}
                      value={goal.currency}
                      onChange={handleCashflowGoalCurrencyChange(goal.id)}
                    >
                      {cashflowGoalCurrencyOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className={`${styles.inputGroup} ${styles.cashflowGoalInput}`}>
                    <label htmlFor={`${baseId}-target`}>{targetConfig.label}</label>
                    <input
                      id={`${baseId}-target`}
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step={targetConfig.step}
                      value={goal.target}
                      onChange={handleCashflowGoalTargetChange(goal.id)}
                      placeholder={targetConfig.placeholder}
                    />
                  </div>
                  <div className={styles.cashflowGoalActions}>
                    <button type="button" onClick={() => handleCashflowGoalRemove(goal.id)}>
                      {msg.goalCashflowRemove}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className={styles.cashflowGoalEmpty}>{msg.goalCashflowEmpty}</p>
        )}
        <div className={styles.cashflowGoalActionsRow}>
          <button type="button" className={styles.cashflowGoalAddButton} onClick={handleCashflowGoalAdd}>
            {msg.goalCashflowAdd}
          </button>
        </div>
      </div>
    )
  };

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
  const goalFormSections = [cashflowGoalFormSection, shareGoalFormSection];

  const handleGoalFormToggle = () => {
    setIsGoalFormVisible(prev => !prev);
  };

  const handleGoalNameChange = event => {
    const value = event.target.value;
    setGoalForm(prev => ({ ...prev, name: value }));
  };

  const handleAdd = async () => {
    const date = form?.date;
    const entries = Array.isArray(form?.entries) ? form.entries : [];
    if (!date) {
      alert(msg.inputRequired);
      return;
    }

    const hasPartialEntry = entries.some(entry => {
      const hasAnyField = entry?.stock_id || entry?.quantity || entry?.price;
      const isComplete = entry?.stock_id && entry?.quantity && entry?.price;
      return hasAnyField && !isComplete;
    });
    if (hasPartialEntry) {
      alert(msg.inputRequired);
      return;
    }

    const normalizedEntries = entries
      .map(entry => ({
        stock_id: entry?.stock_id || '',
        stock_name: entry?.stock_name || '',
        quantity: Number(entry?.quantity),
        price: Number(entry?.price)
      }))
      .filter(entry => (
        entry.stock_id &&
        Number.isFinite(entry.quantity) && entry.quantity > 0 &&
        Number.isFinite(entry.price) && entry.price > 0
      ));

    if (normalizedEntries.length === 0) {
      alert(msg.inputRequired);
      return;
    }

    const newEntries = normalizedEntries.map(entry => ({
      id: generateTransactionId(),
      stock_id: entry.stock_id,
      stock_name: entry.stock_name,
      date,
      quantity: entry.quantity,
      price: entry.price,
      type: 'buy'
    }));

    const updatedHistory = [...transactionHistory, ...newEntries];
    setTransactionHistory(updatedHistory);
    setForm(createInitialFormState());
    setShowModal(false);
    runAutoSave(updatedHistory);

    if (workspaceId && newEntries.length > 0) {
      try {
        await addRemoteTransactions(newEntries);
      } catch (error) {
        console.error('Failed to sync added transactions', error);
      }
    }
  };

  const handleEditSave = async idx => {
    const original = transactionHistory[idx];
    if (!editForm.quantity || !editForm.date || (original.type === 'buy' && !editForm.price)) {
      alert(msg.invalidNumbers);
      return;
    }
    const updated = [...transactionHistory];
    updated[idx] = {
      ...updated[idx],
      date: editForm.date,
      quantity: +editForm.quantity
    };
    if (original.type === 'buy') {
      updated[idx].price = +editForm.price;
    }
    setTransactionHistory(updated);
    setEditingIdx(null);
    runAutoSave(updated);

    if (workspaceId && updated[idx]?.id) {
      try {
        await updateRemoteTransaction(updated[idx].id, updated[idx]);
      } catch (error) {
        console.error('Failed to sync updated transaction', error);
      }
    }
  };

  const handleDelete = async idx => {
    if (!window.confirm(msg.confirmDeleteRecord)) {
      return;
    }
    const target = transactionHistory[idx];
    const updated = transactionHistory.filter((_, i) => i !== idx);
    setTransactionHistory(updated);
    runAutoSave(updated);

    if (workspaceId && target?.id) {
      try {
        await deleteRemoteTransactions([target.id]);
      } catch (error) {
        console.error('Failed to sync deleted transaction', error);
      }
    }
  };

  const handleSell = async (stock_id, qty) => {
    const stock = inventoryList.find(s => s.stock_id === stock_id);
    if (!stock || qty > stock.total_quantity) {
      alert(msg.sellExceeds);
      return;
    }
    const newEntry = {
      id: generateTransactionId(),
      stock_id,
      stock_name: stock.stock_name,
      date: getToday(),
      quantity: +qty,
      type: 'sell'
    };
    const updatedHistory = [...transactionHistory, newEntry];
    setTransactionHistory(updatedHistory);
    setSellModal({ show: false, stock: null });
    runAutoSave(updatedHistory);

    if (workspaceId) {
      try {
        await addRemoteTransactions([newEntry]);
      } catch (error) {
        console.error('Failed to sync sell transaction', error);
      }
    }
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
            setForm(createInitialFormState());
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
              selectedSource={selectedDataSource}
              onSelectChange={handleDataSourceChange}
              autoSaveEnabled={autoSaveEnabled}
              onToggleAutoSave={handleAutoSaveToggle}
              autoSaveState={autoSaveState}
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
        <div className={styles.syncControls}>
          {user ? (
            <>
              <div className={styles.syncUserRow}>
                <span className={styles.syncUserInfo}>
                  {msg.syncUserPrefix}
                  <span className={styles.syncUserName}>{syncAccountLabel || msg.syncSignedIn}</span>
                </span>
                <button type="button" className={styles.syncSignOutButton} onClick={handleSignOut}>
                  {msg.syncSignOut}
                </button>
              </div>
              <div
                className={`${styles.syncStatusMessage} ${styles[`syncStatus-${syncStatus}`]}`}
                aria-live="polite"
              >
                {syncStatusMessage}
              </div>
            </>
          ) : (
            <button
              type="button"
              className={`${styles.button} ${styles.syncSignInButton}`}
              onClick={handleSignIn}
              disabled={authInitializing}
            >
              {authInitializing ? msg.syncSigningIn : msg.syncSignIn}
            </button>
          )}
          {(authError || syncError) && (
            <div className={styles.syncError} role="status">
              {msg.syncError}
              {(authError || syncError)?.message ? ` (${(authError || syncError).message})` : ''}
            </div>
          )}
        </div>
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
                {msg.stockCache}: {cacheInfo.cacheStatus}
                {cacheInfo.timestamp ? ` (${new Date(cacheInfo.timestamp).toLocaleString()})` : ''}
              </div>
            )}
            {dividendCacheInfo && (
              <div className={styles.cacheInfo}>
                {msg.dividendCache}: {dividendCacheInfo.cacheStatus}
                {dividendCacheInfo.timestamp ? ` (${new Date(dividendCacheInfo.timestamp).toLocaleString()})` : ''}
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
                          <td>
                            {item.total_quantity}
                            {(() => {
                              const countryCode = typeof item.country === 'string' ? item.country.trim().toUpperCase() : '';
                              const isUsEtf = countryCode === 'US' || countryCode === 'USA';
                              if (isUsEtf) return null;
                              const lots = (item.total_quantity / 1000).toFixed(3).replace(/\.0+$/, '');
                              return ` (${lots} ${lang === 'en' ? 'lots' : '張'})`;
                            })()}
                          </td>
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
