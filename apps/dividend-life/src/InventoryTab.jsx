import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Cookies from 'js-cookie';
import CreatableSelect from 'react-select/creatable';
import { HOST_URL } from '../config';
import { fetchStockList } from './stockApi';
import useEffectOnce from './hooks/useEffectOnce';
import {
  migrateTransactionHistory,
  saveTransactionHistory,
  getTransactionHistoryUpdatedAt
} from './utils/transactionStorage';
import { exportTransactionsToDrive, importTransactionsFromDrive, isDriveAuthenticated } from './googleDrive';
import { transactionsToCsv, transactionsFromCsv } from './utils/csvUtils';
import AddTransactionModal from './components/AddTransactionModal';
import QuickPurchaseModal from './components/QuickPurchaseModal';
import SellModal from './components/SellModal';
import TransactionHistoryTable from './components/TransactionHistoryTable';
import DataDropdown from './components/DataDropdown';
import styles from './InventoryTab.module.css';
import { useLanguage } from './i18n';
import InvestmentGoalCard from './components/InvestmentGoalCard';
import { summarizeInventory, getPurchasedStockIds } from './utils/inventoryUtils';
import { SHARES_PER_LOT } from './utils/currencyUtils';
import { loadInvestmentGoals, saveInvestmentGoals } from './utils/investmentGoalsStorage';
import {
  calculateDividendSummary,
  buildDividendGoalViewModel
} from './utils/dividendGoalUtils';
import selectStyles from './selectStyles';
import TooltipText from './components/TooltipText';
import inventoryTabText from './inventoryTabText';
import {
  loadDividendExclusions,
  persistDividendExclusions,
  normalizeStockId
} from './utils/dividendExclusions';


const BACKUP_COOKIE_KEY = 'inventory_last_backup';
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

export default function InventoryTab({ allDividendData = [], dividendCacheInfo: incomingDividendCacheInfo = null }) {
  const [stockList, setStockList] = useState([]);
  const [transactionHistory, setTransactionHistory] = useState(() => migrateTransactionHistory());
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(createInitialFormState);
  const [showInventory, setShowInventory] = useState(true);
  const [editingIdx, setEditingIdx] = useState(null);
  const [editForm, setEditForm] = useState({ date: '', quantity: '', price: '' });
  const [sellModal, setSellModal] = useState({ show: false, stock: null });
  const [showQuickModal, setShowQuickModal] = useState(false);
  const [quickForm, setQuickForm] = useState([]);
  const fileInputRef = useRef(null);
  const driveSaveRequestRef = useRef(0);
  const [cacheInfo, setCacheInfo] = useState(null);
  const [showDataMenu, setShowDataMenu] = useState(false);
  const [selectedDataSource, setSelectedDataSource] = useState(
    () => {
      const saved = localStorage.getItem('inventory_data_source');
      return saved === 'googleDrive' ? 'googleDrive' : 'csv';
    }
  );
  const [driveConnected, setDriveConnected] = useState(false);
  const [driveStatus, setDriveStatus] = useState({ status: 'idle' });
  const [transactionHistoryUpdatedAt, setTransactionHistoryUpdatedAt] = useState(
    () => getTransactionHistoryUpdatedAt() ?? 0
  );
  const [latestPrices, setLatestPrices] = useState({});
  const { lang } = useLanguage();
  const [dividendExclusions, setDividendExclusions] = useState(() => loadDividendExclusions());
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
  const dividendData = useMemo(() => Array.isArray(allDividendData) ? allDividendData : [], [allDividendData]);
  const dividendCacheInfo = incomingDividendCacheInfo || null;
  const [goalForm, setGoalForm] = useState(() => ({
    name: initialGoals.goalName ? String(initialGoals.goalName) : '',
    cashflowGoals: initialCashflowGoalEntries,
    shareTargets: initialShareTargets
  }));
  const cashflowGoalIdRef = useRef(initialCashflowGoalEntries.length);
  const [goalSaved, setGoalSaved] = useState('');
  const [isGoalFormVisible, setIsGoalFormVisible] = useState(false);
  const [shareTargetDraft, setShareTargetDraft] = useState({ stockId: '', stockName: '', quantity: '' });
  const msg = inventoryTabText[lang];

  const buildQuickFormEntries = useCallback(() => {
    const seen = new Set();
    const result = [];
    const today = new Date();
    const threeMonthsAgo = new Date(today);
    threeMonthsAgo.setMonth(today.getMonth() - 3);

    for (let index = transactionHistory.length - 1; index >= 0; index -= 1) {
      const entry = transactionHistory[index];
      if (!entry || entry.type !== 'buy') continue;

      const rawDate = typeof entry.date === 'string' ? entry.date : '';
      if (!rawDate) continue;
      const parsedDate = new Date(rawDate);
      if (Number.isNaN(parsedDate.getTime())) continue;
      if (parsedDate < threeMonthsAgo) continue;

      const stockId = typeof entry.stock_id === 'string' ? entry.stock_id.trim() : '';
      if (!stockId || seen.has(stockId)) continue;

      seen.add(stockId);
      const stockInfo = stockList.find(item => item.stock_id === stockId);
      const stockName = entry.stock_name || stockInfo?.stock_name || '';
      const countryRaw = stockInfo?.country || entry?.country || '';
      const country = typeof countryRaw === 'string' ? countryRaw.toUpperCase() : '';
      const quantityValue = Number(entry?.quantity);
      const quantity = Number.isFinite(quantityValue) && quantityValue > 0 ? String(quantityValue) : '';
      const latestPriceRaw = latestPrices?.[stockId];
      const latestPriceValue =
        typeof latestPriceRaw === 'number' ? latestPriceRaw : Number(latestPriceRaw);
      const hasLatestPrice = Number.isFinite(latestPriceValue) && latestPriceValue > 0;
      const entryPriceValue = Number(entry?.price);
      const price = hasLatestPrice
        ? String(latestPriceValue)
        : Number.isFinite(entryPriceValue) && entryPriceValue > 0
          ? String(entryPriceValue)
          : '';

      result.push({
        stock_id: stockId,
        stock_name: stockName,
        country,
        enabled: true,
        date: getToday(),
        quantity,
        price
      });
    }

    return result;
  }, [stockList, transactionHistory, latestPrices]);

  const handleOpenQuickModal = () => {
    setQuickForm(buildQuickFormEntries());
    setShowQuickModal(true);
  };

  const handleQuickModalClose = () => {
    setShowQuickModal(false);
  };

  const handleDividendInclusionToggle = useCallback((stockId) => {
    const normalized = normalizeStockId(stockId);
    if (!normalized) return;
    setDividendExclusions(prev => {
      const next = { ...prev };
      if (next[normalized]) {
        delete next[normalized];
      } else {
        next[normalized] = true;
      }
      return next;
    });
  }, []);

  const handleQuickSubmit = () => {
    const validEntries = (Array.isArray(quickForm) ? quickForm : []).filter(entry => entry?.enabled);
    if (validEntries.length === 0) {
      alert(msg.inputRequired);
      return;
    }

    const normalizedEntries = validEntries
      .map(entry => ({
        stock_id: entry?.stock_id || '',
        stock_name: entry?.stock_name || '',
        date: entry?.date || '',
        quantity: Number(entry?.quantity),
        price: Number(entry?.price)
      }))
      .filter(entry => (
        entry.stock_id &&
        entry.date &&
        Number.isFinite(entry.quantity) && entry.quantity > 0 &&
        Number.isFinite(entry.price) && entry.price > 0
      ));

    if (normalizedEntries.length === 0 || normalizedEntries.length !== validEntries.length) {
      alert(msg.inputRequired);
      return;
    }

    const updatedHistory = [
      ...transactionHistory,
      ...normalizedEntries.map(entry => ({
        stock_id: entry.stock_id,
        stock_name: entry.stock_name,
        date: entry.date,
        quantity: entry.quantity,
        price: entry.price,
        type: 'buy'
      }))
    ];
    setTransactionHistory(updatedHistory);
    setShowQuickModal(false);
    setQuickForm([]);
    if (selectedDataSource === 'googleDrive' && driveConnected) syncToDrive(updatedHistory);
  };

  const mapTransactionsWithStockNames = useCallback(
    list =>
      (Array.isArray(list) ? list : []).map(item => {
        const stock = stockList.find(s => s.stock_id === item.stock_id);
        return {
          ...item,
          stock_name: item.stock_name || (stock ? stock.stock_name : '')
        };
      }),
    [stockList]
  );


  const syncToDrive = useCallback(
    async (list) => {
      const data = Array.isArray(list) ? list : transactionHistory;
      const requestId = Date.now();
      driveSaveRequestRef.current = requestId;
      setDriveStatus({ status: 'syncing' });
      try {
        await exportTransactionsToDrive(data);
        if (driveSaveRequestRef.current === requestId) {
          setDriveStatus({ status: 'synced', timestamp: Date.now() });
        }
      } catch (error) {
        console.error('Drive auto-save failed', error);
        if (driveSaveRequestRef.current === requestId) {
          setDriveStatus({ status: 'error', timestamp: Date.now() });
        }
      }
    },
    [transactionHistory]
  );

  const fetchFromDriveIfNewer = useCallback(
    async ({ silent = false, force = false } = {}) => {
      const localUpdatedAt = getTransactionHistoryUpdatedAt() ?? 0;
      try {
        const result = await importTransactionsFromDrive({ includeMetadata: true, silent });

        if (result === null) {
          // silent mode: null means auth failed silently (no popup), treat as not connected
          if (silent) return false;
          // non-silent: auth succeeded but no backup file on Drive yet → already connected, ready to save
          setDriveConnected(true);
          setDriveStatus({ status: 'synced', timestamp: Date.now() });
          return true;
        }

        const list = Array.isArray(result) ? result : result?.list;
        const remoteModified = !Array.isArray(result) && Number.isFinite(result?.modifiedTime) ? result.modifiedTime : null;
        setDriveConnected(true);
        // force=true: user explicitly connected, always import. Otherwise only import if Drive is newer.
        if (Array.isArray(list) && list.length > 0 && (force || !remoteModified || remoteModified > localUpdatedAt)) {
          const enriched = mapTransactionsWithStockNames(list);
          setTransactionHistory(enriched);
          saveTransactionHistory(enriched);
          const ts = remoteModified || Date.now();
          setTransactionHistoryUpdatedAt(ts);
          setDriveStatus({ status: 'synced', timestamp: ts });
        } else {
          setDriveStatus({ status: 'synced', timestamp: remoteModified || Date.now() });
        }
        return true;
      } catch (error) {
        console.error('Drive fetch failed', error);
        if (silent) return false;
        setDriveConnected(false);
        setDriveStatus({ status: 'error', timestamp: Date.now() });
        return false;
      }
    },
    [mapTransactionsWithStockNames]
  );

  const connectAndSyncDrive = useCallback(
    async () => {
      setDriveStatus({ status: 'connecting' });
      const ok = await fetchFromDriveIfNewer({ silent: false, force: true });
      if (!ok) {
        setDriveConnected(false);
      }
    },
    [fetchFromDriveIfNewer]
  );

  const handleDataSourceChange = useCallback(
    value => {
      setSelectedDataSource(value);
      localStorage.setItem('inventory_data_source', value);
      if (value === 'googleDrive') {
        setDriveStatus({ status: 'connecting' });
        fetchFromDriveIfNewer({ silent: false, force: true }).then(ok => {
          if (!ok) setDriveConnected(false);
        });
      } else {
        setDriveConnected(false);
        setDriveStatus({ status: 'idle' });
      }
    },
    [fetchFromDriveIfNewer]
  );

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

  // On mount: if Google Drive was previously selected, try silent auth + sync
  useEffect(() => {
    if (selectedDataSource !== 'googleDrive') return;
    let cancelled = false;
    setDriveStatus({ status: 'connecting' });
    fetchFromDriveIfNewer({ silent: true }).then(ok => {
      if (cancelled) return; // React StrictMode unmounts+remounts: ignore stale result
      if (!ok) {
        // Silent auth failed (no popup shown) — user needs to click Connect
        setDriveConnected(false);
        setDriveStatus({ status: 'idle' });
      }
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    const priceMap = {};
    dividendData.forEach(item => {
      const price = parseFloat(item?.last_close_price);
      if (!item?.stock_id || Number.isNaN(price)) return;
      const dateValue = item?.dividend_date ? new Date(item.dividend_date) : null;
      const previous = priceMap[item.stock_id];
      if (!previous || (dateValue && (!previous.date || dateValue > previous.date))) {
        priceMap[item.stock_id] = { price, date: dateValue };
      }
    });
    const prices = {};
    Object.keys(priceMap).forEach(id => {
      prices[id] = priceMap[id].price;
    });
    setLatestPrices(prices);
  }, [dividendData]);

  useEffect(() => {
    saveTransactionHistory(transactionHistory);
    setTransactionHistoryUpdatedAt(Date.now());
  }, [transactionHistory]);

  useEffect(() => {
    if (!goalSaved) return undefined;
    const timer = setTimeout(() => setGoalSaved(''), 2500);
    return () => clearTimeout(timer);
  }, [goalSaved]);
  
  useEffect(() => {
    if (typeof window === 'undefined') return;
    persistDividendExclusions(dividendExclusions);
  }, [dividendExclusions]);

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
      transactionHistory,
      excludedStockIds: dividendExclusions
    }),
    [inventoryList, dividendData, transactionHistory, dividendExclusions]
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

  const handleAdd = () => {
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

    const updatedHistory = [
      ...transactionHistory,
      ...normalizedEntries.map(entry => ({
        stock_id: entry.stock_id,
        stock_name: entry.stock_name,
        date,
        quantity: entry.quantity,
        price: entry.price,
        type: 'buy'
      }))
    ];
    setTransactionHistory(updatedHistory);
    setForm(createInitialFormState());
    setShowModal(false);
    if (selectedDataSource === 'googleDrive' && driveConnected) syncToDrive(updatedHistory);
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
      quantity: +editForm.quantity
    };
    if (original.type === 'buy') {
      updated[idx].price = +editForm.price;
    }
    setTransactionHistory(updated);
    setEditingIdx(null);
    if (selectedDataSource === 'googleDrive' && driveConnected) syncToDrive(updated);
  };

  const handleDelete = idx => {
    if (window.confirm(msg.confirmDeleteRecord)) {
      const updated = transactionHistory.filter((_, i) => i !== idx);
      setTransactionHistory(updated);
      if (selectedDataSource === 'googleDrive' && driveConnected) syncToDrive(updated);
    }
  };

  const handleSell = (stock_id, qty) => {
    const stock = inventoryList.find(s => s.stock_id === stock_id);
    if (!stock || qty > stock.total_quantity) {
      alert(msg.sellExceeds);
      return;
    }
    const updatedHistory = [
      ...transactionHistory,
      { stock_id, stock_name: stock.stock_name, date: getToday(), quantity: +qty, type: 'sell' }
    ];
    setTransactionHistory(updatedHistory);
    setSellModal({ show: false, stock: null });
    if (selectedDataSource === 'googleDrive' && driveConnected) syncToDrive(updatedHistory);
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
        <button
          className={styles.button}
          onClick={handleOpenQuickModal}
        >
          {msg.quickAdd}
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
              selectedSource={selectedDataSource}
              onSelectChange={handleDataSourceChange}
              driveConnected={driveConnected}
              driveStatus={driveStatus}
              onConnectDrive={connectAndSyncDrive}
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
      <QuickPurchaseModal
        show={showQuickModal}
        onClose={handleQuickModalClose}
        rows={quickForm}
        setRows={setQuickForm}
        onSubmit={handleQuickSubmit}
        messages={msg}
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
                    <th>{msg.active}</th>
                  </tr>
                </thead>
                <tbody>
                  {inventoryList.length === 0
                    ? <tr><td colSpan={5}>{msg.noInventory}</td></tr>
                    : inventoryList.map((item, idx) => {
                        const normalizedStockId = normalizeStockId(item.stock_id);
                        const isExcludedFromDividendStats = Boolean(
                          normalizedStockId && dividendExclusions[normalizedStockId]
                        );
                        return (
                          <tr key={idx}>
                          <td className="stock-col">
                            <a href={`${HOST_URL}/stock/${item.stock_id}`} target="_blank" rel="noreferrer">
                              <TooltipText tooltip={item.stock_name}>
                                <span>
                                  {item.stock_id}
                                </span>
                              </TooltipText>
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
                            {isExcludedFromDividendStats && (
                              <span className={styles.excludedBadge}>
                                {msg.dividendStatsExcludedBadge}
                              </span>
                            )}
                          </td>
                          <td>
                            <button className={styles.sellButton} onClick={() => setSellModal({ show: true, stock: item })}>{msg.sell}</button>
                          </td>
                          <td>
                            <button
                              className={isExcludedFromDividendStats ? styles.buttonExclude : styles.button}
                              type="button"
                              disabled={!normalizedStockId}
                              onClick={() => handleDividendInclusionToggle(item.stock_id)}
                            >
                              {isExcludedFromDividendStats ? 'N' : 'Y'}
                            </button>
                          </td>
                          </tr>
                        );
                      })}
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
