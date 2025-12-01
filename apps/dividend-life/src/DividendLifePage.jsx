import { useState, useEffect, useMemo, useRef } from 'react';
import { LanguageContext, translations } from './i18n';
import InventoryTab from './InventoryTab';
import UserDividendsTab from './UserDividendsTab';
import AboutTab from './AboutTab';
import HomeTab from './HomeTab';
import DisplayDropdown from './components/DisplayDropdown';
import DividendCalendar from './components/DividendCalendar';
import StockTable from './components/StockTable';
import Footer from '@shared/components/Footer/Footer.jsx';
import ExperienceNavigation from '@shared/components/ExperienceNavigation/ExperienceNavigation.jsx';
import dividendLifeTextDark from '@shared/assets/dividend-life-text.svg';
import dividendLifeTextLight from '@shared/assets/dividend-life-text-light.svg';
import AdvancedFilterDropdown from './components/AdvancedFilterDropdown';
import CurrencyViewToggle from './components/CurrencyViewToggle';

import './App.css';
import appStyles from './App.module.css';
import brandStyles from '@shared/components/BrandPage/BrandPage.module.css';
import dividendLifeLogoDark from '@shared/assets/dividend-life.svg';
import dividendLifeLogoLight from '@shared/assets/dividend-life-light.svg';
import NLHelper from './NLHelper';
import { API_HOST } from '../config';
import { fetchWithCache } from './api';
import { getTomorrowDividendAlerts } from './utils/dividendUtils';
import { fetchDividendsByYears, clearDividendsCache } from './dividendApi';
import { fetchStockList } from './stockApi';
import useEffectOnce from './hooks/useEffectOnce';
import { readTransactionHistory } from './utils/transactionStorage';
import { summarizeInventory } from './utils/inventoryUtils';

const DEFAULT_MONTHLY_GOAL = 10000;
const DEFAULT_CURRENCY = 'TWD';
const REQUIRED_DIVIDEND_FIELDS = [
  'stock_id',
  'stock_name',
  'dividend',
  'dividend_yield',
  'currency',
  'dividend_date',
  'payment_date',
  'last_close_price',
];
const CURRENCY_NAME_ZH = {
  TWD: '台股配息',
  USD: '美股股息'
};
const CURRENCY_NAME_EN = {
  TWD: 'NT$ dividends',
  USD: 'US$ dividends'
};
const CURRENCY_LABEL = {
  TWD: 'NT$',
  USD: 'US$'
};

const normalizeCurrency = (currency) => {
  if (!currency) return DEFAULT_CURRENCY;
  const upper = String(currency).toUpperCase();
  if (upper === 'NTD' || upper === 'NT$') return 'TWD';
  if (upper === 'US$') return 'USD';
  return upper;
};

const CURRENT_YEAR = new Date().getFullYear();
const PREVIOUS_YEAR = CURRENT_YEAR - 1;
const ALLOWED_YEARS = [CURRENT_YEAR, PREVIOUS_YEAR];

const DEFAULT_WATCH_GROUPS = [
  {
    name: '現金流導向（月月配息）',
    ids: ['0056', '00878', '00919', '00731', '00918']
  },
  {
    name: '穩健成長 + 配息',
    ids: ['0056', '00878', '0050']
  },
  {
    name: '簡化操作（季配息）',
    ids: ['0056', '00878', '00919']
  }
];

function parseNumberLike(value) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const normalized = trimmed.replace(/,/g, '');
    const parsed = Number.parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function deriveYieldValue(rawYield, dividendValue, priceValue) {
  const parsedYield = parseNumberLike(rawYield);
  if (parsedYield !== null) {
    return parsedYield;
  }
  if (dividendValue !== null && priceValue !== null && priceValue !== 0) {
    return (dividendValue / priceValue) * 100;
  }
  return null;
}

function calcIncomeGoalInfo(dividend, price, goal, freq = 12, lang = 'zh') {
  if (!price || dividend <= 0 || freq <= 0) return '';
  const annualDividend = dividend * freq;
  const lotsNeeded = Math.ceil((goal * 12) / (annualDividend * 1000));
  const cost = Math.round(lotsNeeded * 1000 * price).toLocaleString();
  return lang === 'en'
    ? `\nTo reach a monthly return of ${goal.toLocaleString()}, you need ${lotsNeeded} lots\nCost: ${cost}`
    : `\n月報酬${goal.toLocaleString()}需: ${lotsNeeded}張\n成本: ${cost}元`;
}

const isChineseLanguage = (lang) => lang && lang.toLowerCase().startsWith('zh');

const getInitialLanguage = () => {
  if (typeof window === 'undefined') return 'zh';

  const stored = window.localStorage?.getItem('lang');
  if (stored) return stored;

  const browserLanguages = window.navigator?.languages?.length
    ? window.navigator.languages
    : [window.navigator?.language];

  return browserLanguages?.some(isChineseLanguage) ? 'zh' : 'en';
};

function DividendLifePage({ homeHref = '/', homeNavigation = 'router' } = {}) {
  // Tab state
  const [tab, setTab] = useState('home');

  // All your existing states for dividend page...
  const [data, setData] = useState([]);
  const [transactionHistory, setTransactionHistory] = useState([]);
  const [transactionHistoryLoaded, setTransactionHistoryLoaded] = useState(false);
  const [dividendScope, setDividendScope] = useState('purchased');
  const [years, setYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [upcomingAlerts, setUpcomingAlerts] = useState([]);
  const fetchSkipRef = useRef(new Map());
  const selectedYearRef = useRef(selectedYear);

  // Toggle calendar visibility
  const [showCalendar, setShowCalendar] = useState(() => {
    const stored = localStorage.getItem('appShowCalendar');
    return stored === null ? true : stored === 'true';
  });
  useEffect(() => {
    localStorage.setItem('appShowCalendar', showCalendar);
  }, [showCalendar]);

  useEffect(() => {
    selectedYearRef.current = selectedYear;
  }, [selectedYear]);

  // Filter which event types to show on calendar
  // Default to displaying both ex-dividend and payment dates
  const [calendarFilter, setCalendarFilter] = useState('both');

  // Toggle between showing dividend or dividend yield
  const [showDividendYield, setShowDividendYield] = useState(false);
  // Toggle axis between months and info categories
  const [showInfoAxis, setShowInfoAxis] = useState(false);
  // Monthly income goal input
  const [monthlyIncomeGoal, setMonthlyIncomeGoal] = useState(DEFAULT_MONTHLY_GOAL);

    // Multi-select filters
    const [selectedStockIds, setSelectedStockIds] = useState([]);
    const [extraFilters, setExtraFilters] = useState({ minYield: '', freq: [], upcomingWithin: '', diamond: false, currencies: [] });

  // Watch groups
  const [watchGroups, setWatchGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showDisplays, setShowDisplays] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showAllStocks, setShowAllStocks] = useState(false);

  // Theme
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');
  const navigationText = theme === 'light' ? dividendLifeTextLight : dividendLifeTextDark;

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);


  // Language
  const [lang, setLang] = useState(getInitialLanguage);
  useEffect(() => {
    localStorage.setItem('lang', lang);
  }, [lang]);
  const t = useMemo(() => (key) => translations[lang][key] || key, [lang]);

  useEffect(() => {
    setTransactionHistory(readTransactionHistory());
    setTransactionHistoryLoaded(true);
  }, []);

  const [editingGroupIndex, setEditingGroupIndex] = useState(null);
  const [groupNameInput, setGroupNameInput] = useState('');
  const [groupIdsInput, setGroupIdsInput] = useState('');

  // Month value existence filters
  const [monthHasValue, setMonthHasValue] = useState(Array(12).fill(false));
  const [freqMap, setFreqMap] = useState({});
  const timeZone = 'Asia/Taipei';
  const currentMonth = Number(new Date().toLocaleString('en-US', { timeZone, month: 'numeric' })) - 1;
  const getIncomeGoalInfo = (dividend, price, goal, freq = 12) =>
    calcIncomeGoalInfo(dividend, price, goal, freq, lang);
  const renderGroupName = (name) => {
    const map = {
      '現金流導向（月月配息）': lang === 'en' ? 'Cash Flow Focus (Monthly Dividends)' : '現金流導向（月月配息）',
      '穩健成長 + 配息': lang === 'en' ? 'Steady Growth + Dividends' : '穩健成長 + 配息',
      '簡化操作（季配息）': lang === 'en' ? 'Simplified Operation (Quarterly Dividends)' : '簡化操作（季配息）'
    };
    return map[name] || name;
  };
  const renderGroupOptionLabel = (group) => {
    if (!group) return '';
    const name = renderGroupName(group.name);
    if (!group.ids || group.ids.length === 0) return name;
    const ids = group.ids.join(', ');
    return lang === 'en' ? `${name} (${ids})` : `${name}（${ids}）`;
  };
  const handleResetFilters = (keepIds = false) => {
      if (!keepIds) setSelectedStockIds([]);
      setMonthHasValue(Array(12).fill(false));
      setShowAllStocks(false);
      setExtraFilters({ minYield: '', freq: [], upcomingWithin: '', diamond: false, currencies: [] });
      setShowAdvancedFilters(false);
  };

  const handleDividendScopeChange = (scope) => {
    setDividendScope(scope);
    setShowAllStocks(false);
  };

  const purchasedStockIds = useMemo(() => {
    const { inventoryList } = summarizeInventory(transactionHistory);
    const ids = inventoryList
      .map(item => {
        const raw = item?.stock_id;
        return typeof raw === 'string' ? raw.trim() : raw ? String(raw).trim() : '';
      })
      .filter(Boolean);
    const unique = Array.from(new Set(ids));
    unique.sort((a, b) => a.localeCompare(b));
    return unique;
  }, [transactionHistory]);

  useEffect(() => {
    if (!transactionHistoryLoaded) return;
    if (dividendScope !== 'purchased') return;
    if (purchasedStockIds.length > 0) return;
    if (transactionHistory.length === 0) return;
    setDividendScope('all');
  }, [dividendScope, purchasedStockIds.length, transactionHistoryLoaded, transactionHistory.length]);

  useEffect(() => {
    const callUpdate = () => {
      const history = readTransactionHistory();
      const { inventoryList } = summarizeInventory(history);
      const purchasedIds = inventoryList
        .map(item => {
          const raw = item?.stock_id;
          return typeof raw === 'string' ? raw.trim() : raw ? String(raw).trim() : '';
        })
        .filter(Boolean);
      const uniquePurchased = Array.from(new Set(purchasedIds)).sort((a, b) => a.localeCompare(b));

      fetch(`${API_HOST}/update_dividend`).finally(() => {
        clearDividendsCache();
         clearDividendsCache(undefined, undefined, { stockIds: 'all' });
         if (uniquePurchased.length) {
           clearDividendsCache(undefined, undefined, { stockIds: uniquePurchased });
         }
        window.location.reload();
      });
    };

    const now = new Date();
    const first = new Date();
    first.setHours(18, 30, 0, 0);
    if (now > first) first.setDate(first.getDate() + 1);
    let intervalId;
    const timeoutId = setTimeout(() => {
      callUpdate();
      intervalId = setInterval(callUpdate, 24 * 60 * 60 * 1000);
    }, first.getTime() - now.getTime());

    return () => {
      clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  const [dividendCacheInfo, setDividendCacheInfo] = useState(null);

  useEffect(() => {
    if (!transactionHistoryLoaded) {
      return;
    }

    const hasPurchasedIds = purchasedStockIds.length > 0;
    const usePurchasedScope = dividendScope === 'purchased' && hasPurchasedIds;
    const stockIdsParam = usePurchasedScope ? purchasedStockIds : 'all';
    const idsKey = usePurchasedScope
      ? purchasedStockIds.join(',')
      : 'all';
    const signature = `${dividendScope}|${idsKey}|${selectedYear}`;
    const skipMap = fetchSkipRef.current;

    if (skipMap.get(signature)) {
      skipMap.set(signature, false);
      return;
    }

    skipMap.set(signature, true);
    let cancelled = false;

    setLoading(true);
    setError(null);

    const applyDividendResponse = (dividendData, meta) => {
      if (cancelled) return;
      const normalizedDividends = Array.isArray(dividendData) ? dividendData : [];
      const selectedYearNumber = Number(selectedYearRef.current);
      const filteredArr = normalizedDividends.filter(item => {
        const rawDate = item?.dividend_date || item?.payment_date;
        if (!rawDate) return false;
        const yearValue = new Date(rawDate).getFullYear();
        return Number.isFinite(yearValue) && yearValue === selectedYearNumber;
      });
      setData(filteredArr);

      if (Array.isArray(meta) && meta.length) {
        const primaryMeta = meta.find(entry => entry.year === CURRENT_YEAR && entry.country === 'TW')
          || meta.find(entry => entry.year === CURRENT_YEAR)
          || meta.find(entry => entry.country === 'TW')
          || meta[0];
        setDividendCacheInfo(primaryMeta
          ? {
              cacheStatus: primaryMeta.cacheStatus || 'unknown',
              timestamp: primaryMeta.timestamp
            }
          : null);
      } else if (meta && typeof meta === 'object') {
        setDividendCacheInfo({
          cacheStatus: meta.cacheStatus || null,
          timestamp: meta.timestamp || null
        });
      } else {
        setDividendCacheInfo(null);
      }

      const availableYearSet = new Set(
        normalizedDividends
          .map(item => {
            const date = item?.dividend_date || item?.payment_date;
            if (!date) return null;
            const year = new Date(date).getFullYear();
            return Number.isFinite(year) ? year : null;
          })
          .filter(year => Number.isFinite(year))
      );
      const yearList = Array.from(new Set([...ALLOWED_YEARS, ...availableYearSet])).sort((a, b) => b - a);
      setYears(yearList);

      const numericSelectedYear = Number(selectedYearRef.current);
      if (availableYearSet.size > 0 && !availableYearSet.has(numericSelectedYear)) {
        const sortedAvailableYears = Array.from(availableYearSet).sort((a, b) => b - a);
        setSelectedYear(sortedAvailableYears[0]);
      } else if (!yearList.includes(numericSelectedYear)) {
        setSelectedYear(yearList[0]);
      }
    };

    const load = async () => {
      try {
        const { data: dividendData, meta } = await fetchDividendsByYears([selectedYear], undefined, {
          stockIds: stockIdsParam,
          forceRefresh: dividendScope === 'purchased',
          fields: REQUIRED_DIVIDEND_FIELDS,
        });
        applyDividendResponse(dividendData, meta);
      } catch (error) {
        if (cancelled) return;
        if (API_HOST) {
          try {
            const response = await fetchWithCache(`${API_HOST}/get_dividend`);
            const payload = response?.data;
            const list = Array.isArray(payload?.data)
              ? payload.data
              : Array.isArray(payload?.items)
                ? payload.items
                : Array.isArray(payload)
                  ? payload
                  : [];
            applyDividendResponse(list, {
              cacheStatus: response?.cacheStatus ?? null,
              timestamp: response?.timestamp ?? null
            });
            setError(null);
            return;
          } catch (fallbackError) {
            applyDividendResponse([], null);
            setError(fallbackError);
            return;
          }
        }
        applyDividendResponse([], null);
        setError(null);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
        skipMap.set(signature, false);
      }
    };

    load();

    return () => {
      cancelled = true;
      skipMap.set(signature, false);
    };
  }, [dividendScope, purchasedStockIds, selectedYear, transactionHistoryLoaded]);

  useEffect(() => {
    setUpcomingAlerts(getTomorrowDividendAlerts(data));
  }, [data]);

  useEffectOnce(() => {
    let cancelled = false;

    fetchStockList()
      .then(({ list }) => {
        if (cancelled) return;
        const map = {};
        const freqMapRaw = { '年配': 1, '半年配': 2, '季配': 4, '雙月配': 6, '月配': 12, '週配': 52 };
        list.forEach(s => {
          map[s.stock_id] = freqMapRaw[s.dividend_frequency] || null;
        });
        setFreqMap(map);
      })
      .catch(() => {
        if (!cancelled) {
          setFreqMap({});
        }
      });

    return () => {
      cancelled = true;
    };
  });

  // Load default watch groups from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('watchGroups');
    if (stored) {
      try {
        setWatchGroups(JSON.parse(stored));
      } catch {
        setWatchGroups([]);
      }
    } else {
      setWatchGroups(DEFAULT_WATCH_GROUPS);
      localStorage.setItem('watchGroups', JSON.stringify(DEFAULT_WATCH_GROUPS));
    }
  }, []);

  const saveGroups = (groups) => {
    setWatchGroups(groups);
    localStorage.setItem('watchGroups', JSON.stringify(groups));
  };

  const isGroupModified = (group) => {
    const def = DEFAULT_WATCH_GROUPS.find(g => g.name === group.name);
    if (!def) return true;
    const sortedDef = [...def.ids].sort();
    const sortedIds = [...group.ids].sort();
    if (sortedDef.length !== sortedIds.length) return true;
    return sortedIds.some((id, idx) => id !== sortedDef[idx]);
  };

  const renderGroupIds = (group) => {
    const def = DEFAULT_WATCH_GROUPS.find(g => g.name === group.name);
    const defSet = def ? new Set(def.ids) : new Set();
    return group.ids.map((id, i) => (
      <span key={id} style={!def || !defSet.has(id) ? { color: 'red' } : {}}>
        {i > 0 && ', '}
        {id}
      </span>
    ));
  };

  const handleGroupChange = (e) => {
    const name = e.target.value;
    handleResetFilters(true);
    setSelectedGroup(name);
    const group = watchGroups.find(g => g.name === name);
    if (group) {
      setSelectedStockIds(group.ids);
    } else {
      setSelectedStockIds([]);
    }
  };

  const handleAddGroup = () => {
    setEditingGroupIndex(-1);
    setGroupNameInput('');
    setGroupIdsInput('');
  };

  const handleEditGroup = (idx) => {
    const group = watchGroups[idx];
    setEditingGroupIndex(idx);
    setGroupNameInput(group.name);
    setGroupIdsInput(group.ids.join(','));
  };

  const handleSaveGroup = () => {
    const idsArr = groupIdsInput.split(/[,\s]+/).filter(Boolean);
    if (editingGroupIndex === -1) {
      saveGroups([...watchGroups, { name: groupNameInput, ids: idsArr }]);
    } else {
      const group = watchGroups[editingGroupIndex];
      const newGroups = [...watchGroups];
      newGroups[editingGroupIndex] = { name: groupNameInput, ids: idsArr };
      saveGroups(newGroups);
      if (selectedGroup === group.name) {
        setSelectedGroup(groupNameInput);
        setSelectedStockIds(idsArr);
      }
    }
    setEditingGroupIndex(null);
    setGroupNameInput('');
    setGroupIdsInput('');
  };

  const handleCancelEditGroup = () => {
    setEditingGroupIndex(null);
    setGroupNameInput('');
    setGroupIdsInput('');
  };

  const handleDeleteGroup = (idx) => {
    if (!window.confirm(lang === 'en' ? 'Delete this group?' : '確定刪除?')) return;
    const group = watchGroups[idx];
    const newGroups = watchGroups.filter((_, i) => i !== idx);
    saveGroups(newGroups);
    if (selectedGroup === group.name) {
      setSelectedGroup('');
      setSelectedStockIds([]);
    }
  };

  const {
    filteredData,
    stocks,
    stockOptions,
    dividendTable,
    availableCurrencies,
    stockCurrencyMap
  } = useMemo(() => {
    const arr = Array.isArray(data) ? data : [];
    const filtered = arr
      .filter(item => {
        const reference = item.dividend_date || item.payment_date;
        if (!reference) return false;
        const refDate = new Date(reference);
        if (Number.isNaN(refDate.getTime())) return false;
        return refDate.getFullYear() === Number(selectedYear);
      })
      .map(item => ({
        ...item,
        currency: normalizeCurrency(item.currency)
      }));

    const stocks = [];
    const stockMap = {};
    const stockCurrencySet = {};
    filtered.forEach(item => {
      const key = `${item.stock_id}|${item.stock_name}`;
      if (!stockMap[key]) {
        stocks.push({ stock_id: item.stock_id, stock_name: item.stock_name });
        stockMap[key] = true;
      }
      if (!stockCurrencySet[item.stock_id]) {
        stockCurrencySet[item.stock_id] = new Set();
      }
      stockCurrencySet[item.stock_id].add(item.currency || DEFAULT_CURRENCY);
    });

    const stockOptions = stocks.map(s => ({
      value: s.stock_id,
      label: `${s.stock_id}`
    }));

    const dividendTable = {};
    filtered.forEach(item => {
      const referenceDateRaw = item.dividend_date || item.payment_date;
      const referenceDate = referenceDateRaw ? new Date(referenceDateRaw) : null;
      if (!referenceDate || Number.isNaN(referenceDate.getTime())) {
        return;
      }
      const month = referenceDate.getMonth();
      const currency = item.currency || DEFAULT_CURRENCY;
      if (!dividendTable[item.stock_id]) dividendTable[item.stock_id] = {};
      if (!dividendTable[item.stock_id][month]) dividendTable[item.stock_id][month] = {};
      const cell = dividendTable[item.stock_id][month][currency] || {
        dividend: 0,
        dividend_yield: 0,
        hasPendingDividend: false,
        hasPendingYield: false,
        hasValidDividend: false,
        hasValidYield: false,
      };

      if (!Number.isFinite(cell.dividend)) {
        cell.dividend = 0;
      }
      if (!Number.isFinite(cell.dividend_yield)) {
        cell.dividend_yield = 0;
      }

      const dividendValue = parseNumberLike(item.dividend);
      const priceValue = parseNumberLike(item.last_close_price);
      const yieldValue = deriveYieldValue(item.dividend_yield, dividendValue, priceValue);
      const hasRawDividend = item.dividend !== undefined && item.dividend !== null && `${item.dividend}`.trim() !== '';
      const hasRawYield = item.dividend_yield !== undefined && item.dividend_yield !== null && `${item.dividend_yield}`.trim() !== '';

      if (dividendValue !== null) {
        cell.dividend += dividendValue;
        cell.hasValidDividend = true;
        cell.hasPendingDividend = false;
      } else if (hasRawDividend && !cell.hasValidDividend) {
        cell.hasPendingDividend = true;
      }

      if (yieldValue !== null) {
        cell.dividend_yield += yieldValue;
        cell.hasValidYield = true;
        cell.hasPendingYield = false;
      } else if (hasRawYield && !cell.hasValidYield) {
        cell.hasPendingYield = true;
      }

      if (item.last_close_price !== undefined) {
        cell.last_close_price = item.last_close_price;
      } else if (priceValue !== null) {
        cell.last_close_price = priceValue;
      }
      cell.reference_date = referenceDateRaw;
      if (item.dividend_date) {
        cell.dividend_date = item.dividend_date;
      }
      if (item.payment_date) {
        cell.payment_date = item.payment_date;
      }

      dividendTable[item.stock_id][month][currency] = cell;
    });

    Object.keys(dividendTable).forEach(id => {
      const months = Object.keys(dividendTable[id]).map(Number).sort((a, b) => a - b);
      let prev = null;
      const rawFreq = Number(freqMap[id]);
      const freq = [1, 2, 4, 6, 12, 52].includes(rawFreq) ? rawFreq : 1;
      months.forEach(m => {
        const monthEntry = dividendTable[id][m];
        let span;
        if (prev === null) {
          span = freq ? 12 / freq : 1;
        } else {
          span = m - prev;
          if (span <= 0) span += 12;
        }
        Object.values(monthEntry).forEach(cell => {
          const totalYield = parseNumberLike(cell.dividend_yield);
          const safeTotalYield = totalYield !== null ? totalYield : 0;
          cell.monthsSpan = span;
          cell.perYield = safeTotalYield / span;
        });
        prev = m;
      });
    });

    const availableCurrenciesSet = new Set(filtered.map(item => item.currency || DEFAULT_CURRENCY));
    if (availableCurrenciesSet.size === 0) {
      availableCurrenciesSet.add(DEFAULT_CURRENCY);
    }
    const order = { TWD: 0, USD: 1 };
    const availableCurrencies = Array.from(availableCurrenciesSet).sort((a, b) => {
      const aOrder = order[a] ?? 99;
      const bOrder = order[b] ?? 99;
      if (aOrder !== bOrder) {
        return aOrder - bOrder;
      }
      return a.localeCompare(b);
    });

    const stockCurrencyMap = {};
    Object.keys(stockCurrencySet).forEach(id => {
      stockCurrencyMap[id] = Array.from(stockCurrencySet[id]);
    });

    return { filteredData: filtered, stocks, stockOptions, dividendTable, availableCurrencies, stockCurrencyMap };
  }, [data, selectedYear, freqMap]);

  const hasTwd = availableCurrencies.includes('TWD');
  const hasUsd = availableCurrencies.includes('USD');
  const fallbackView = hasTwd && hasUsd ? 'BOTH' : hasTwd ? 'TWD' : hasUsd ? 'USD' : 'TWD';
  const [viewMode, setViewMode] = useState(fallbackView);
  const [hasUserSetViewMode, setHasUserSetViewMode] = useState(false);
  useEffect(() => {
    if (!hasUserSetViewMode) {
      if (viewMode !== fallbackView) {
        setViewMode(fallbackView);
      }
      return;
    }
    if ((viewMode === 'TWD' && !hasTwd) || (viewMode === 'USD' && !hasUsd) || (viewMode === 'BOTH' && !(hasTwd && hasUsd))) {
      setViewMode(fallbackView);
    }
  }, [fallbackView, hasTwd, hasUsd, hasUserSetViewMode, viewMode]);

  const handleViewModeChange = (mode) => {
    setHasUserSetViewMode(true);
    setViewMode(mode);
  };

  const activeCurrencies = useMemo(() => {
    if (viewMode === 'BOTH') {
      return availableCurrencies.length > 0 ? availableCurrencies : [DEFAULT_CURRENCY];
    }
    if (availableCurrencies.includes(viewMode)) {
      return [viewMode];
    }
    return availableCurrencies.length > 0 ? [availableCurrencies[0]] : [DEFAULT_CURRENCY];
  }, [availableCurrencies, viewMode]);

  const viewDescriptionContent = useMemo(() => {
    if (activeCurrencies.length === 1) {
      const currency = activeCurrencies[0];
      return lang === 'en'
        ? CURRENCY_NAME_EN[currency] || `${currency} dividends`
        : CURRENCY_NAME_ZH[currency] || `${currency} 股息`;
    }
    const names = activeCurrencies.map(currency => (
      lang === 'en'
        ? (currency === 'USD' ? 'US$ dividends' : 'NT$ dividends')
        : (currency === 'USD' ? '美股股息' : '台股配息')
    ));
    return lang === 'en'
      ? names.join(' & ')
      : names.join('、');
  }, [activeCurrencies, lang]);

  const viewLabelPrefix = lang === 'en' ? 'Showing:' : '顯示：';
  const purchasedScopeLabel = lang === 'en' ? 'Purchased ETFs' : '已購買 ETF';
  const allScopeLabel = lang === 'en' ? 'All ETFs' : '全部 ETF';
  const canSelectPurchased = purchasedStockIds.length > 0;

  const filteredStocks = stocks.filter(stock => {
    if (selectedStockIds.length && !selectedStockIds.includes(stock.stock_id)) return false;

    if (viewMode !== 'BOTH') {
      const stockCurrencies = stockCurrencyMap[stock.stock_id] || [];
      if (!stockCurrencies.includes(viewMode)) return false;
    }

    if (extraFilters.currencies.length) {
      const stockCurrencies = stockCurrencyMap[stock.stock_id] || [];
      if (!extraFilters.currencies.some(currency => stockCurrencies.includes(currency))) return false;
    }

    for (let m = 0; m < 12; ++m) {
      if (!monthHasValue[m]) continue;
      const monthEntry = dividendTable[stock.stock_id]?.[m];
      if (!monthEntry) return false;
      const currenciesToCheck = (extraFilters.currencies.length ? extraFilters.currencies : activeCurrencies);
      const hasMatch = currenciesToCheck.some(currency => Boolean(monthEntry?.[currency]));
      if (!hasMatch) return false;
    }

    if (extraFilters.freq.length || extraFilters.minYield || extraFilters.upcomingWithin) {
      const { freq: freqFilters, minYield, upcomingWithin } = extraFilters;
      if (freqFilters.length && !freqFilters.includes(freqMap[stock.stock_id])) return false;
      const currenciesToCheck = (extraFilters.currencies.length ? extraFilters.currencies : activeCurrencies);
      if (minYield) {
        let total = 0;
        let count = 0;
        for (let i = 0; i < 12; i++) {
          const monthEntry = dividendTable[stock.stock_id]?.[i];
          if (!monthEntry) continue;
          currenciesToCheck.forEach(currency => {
            const cell = monthEntry?.[currency];
            const yVal = parseNumberLike(cell?.dividend_yield);
            if (yVal !== null && yVal > 0) {
              total += yVal;
              count += 1;
            }
          });
        }
        const countForFreq = count;
        const freq = [1, 2, 4, 6, 12, 52].includes(freqMap[stock.stock_id]) ? freqMap[stock.stock_id] : countForFreq;
        const avg = count > 0 ? total / count : 0;
        if (avg * freq < Number(minYield)) return false;
      }
      if (upcomingWithin) {
        const days = Number(upcomingWithin);
        if (Number.isFinite(days) && days > 0) {
          const now = new Date();
          const future = new Date();
          future.setDate(now.getDate() + days);
          let hasUpcoming = false;
          for (let i = 0; i < 12; i++) {
            const monthEntry = dividendTable[stock.stock_id]?.[i];
            if (!monthEntry) continue;
            if (currenciesToCheck.some(currency => {
              const cell = monthEntry?.[currency];
              if (!cell) return false;
              const ex = cell.dividend_date ? new Date(cell.dividend_date) : null;
              const pay = cell.payment_date ? new Date(cell.payment_date) : null;
              return (ex && ex >= now && ex <= future) || (pay && pay >= now && pay <= future);
            })) {
              hasUpcoming = true;
              break;
            }
          }
          if (!hasUpcoming) return false;
        }
      }
    }
    return true;
  });

  const currenciesForMax = availableCurrencies.length > 0 ? availableCurrencies : [DEFAULT_CURRENCY];
  const maxYieldPerMonth = currenciesForMax.reduce((acc, currency) => {
    acc[currency] = Array(12).fill(0);
    return acc;
  }, {});
  filteredStocks.forEach(stock => {
    for (let m = 0; m < 12; m++) {
      const monthEntry = dividendTable[stock.stock_id]?.[m];
      if (!monthEntry) continue;
      currenciesForMax.forEach(currency => {
        const cell = monthEntry?.[currency];
        const y = cell?.perYield || 0;
        if (y > (maxYieldPerMonth[currency]?.[m] || 0)) {
          maxYieldPerMonth[currency][m] = y;
        }
      });
    }
  });

  const displayStocks = extraFilters.diamond
    ? filteredStocks.filter(stock => {
        for (let m = 0; m < 12; m++) {
          const monthEntry = dividendTable[stock.stock_id]?.[m];
          if (!monthEntry) continue;
          const currenciesToCheck = (extraFilters.currencies.length ? extraFilters.currencies : activeCurrencies);
          const hasDiamond = currenciesToCheck.some(currency => {
            const cell = monthEntry?.[currency];
            if (!cell) return false;
            const y = cell.perYield || 0;
            return y === (maxYieldPerMonth[currency]?.[m] || 0) && y > 0;
          });
          if (hasDiamond) return true;
        }
        return false;
      })
    : filteredStocks;

  const currenciesForTotals = availableCurrencies.length > 0 ? availableCurrencies : [DEFAULT_CURRENCY];
  const totalPerStock = {};
  const yieldSum = {};
  const yieldCount = {};
  const latestPrice = {};
  const latestYield = {};
  displayStocks.forEach(stock => {
    totalPerStock[stock.stock_id] = {};
    yieldSum[stock.stock_id] = {};
    yieldCount[stock.stock_id] = {};
    latestPrice[stock.stock_id] = { price: null, date: null };
    latestYield[stock.stock_id] = { yield: null, date: null };
    for (let m = 0; m < 12; m++) {
      const monthEntry = dividendTable[stock.stock_id]?.[m];
      if (!monthEntry) continue;
      currenciesForTotals.forEach(currency => {
        const cell = monthEntry?.[currency];
        if (!cell) return;
        const dividendTotal = Number(cell.dividend);
        const val = Number.isFinite(dividendTotal) ? dividendTotal : 0;
        const yValRaw = parseNumberLike(cell.dividend_yield);
        const yVal = yValRaw !== null ? yValRaw : 0;
        totalPerStock[stock.stock_id][currency] = (totalPerStock[stock.stock_id][currency] || 0) + val;
        if (yVal > 0) {
          yieldSum[stock.stock_id][currency] = (yieldSum[stock.stock_id][currency] || 0) + yVal;
          yieldCount[stock.stock_id][currency] = (yieldCount[stock.stock_id][currency] || 0) + 1;
        }
        const lastCloseParsed = parseNumberLike(cell.last_close_price);
        const safeLastClose = lastCloseParsed !== null ? lastCloseParsed : cell.last_close_price ?? null;
        const cellDateRaw = cell.reference_date || cell.dividend_date || cell.payment_date || null;
        const cellDate = cellDateRaw ? new Date(cellDateRaw) : null;
        const existingDate = latestPrice[stock.stock_id].date ? new Date(latestPrice[stock.stock_id].date) : null;
        if (!existingDate || (cellDate && cellDate > existingDate)) {
          latestPrice[stock.stock_id] = { price: safeLastClose, date: cellDateRaw };
        }
        const existingYieldDate = latestYield[stock.stock_id].date ? new Date(latestYield[stock.stock_id].date) : null;
        if (!existingYieldDate || (cellDate && cellDate > existingYieldDate)) {
          latestYield[stock.stock_id] = { yield: yVal, date: cellDateRaw };
        }
      });
    }
  });

  const estAnnualYield = {};
  const maxAnnualYield = currenciesForTotals.reduce((acc, currency) => {
    acc[currency] = 0;
    return acc;
  }, {});
  Object.keys(yieldSum).forEach(id => {
    estAnnualYield[id] = {};
    currenciesForTotals.forEach(currency => {
      const sum = yieldSum[id][currency] || 0;
      const count = yieldCount[id][currency] || 0;
      if (count === 0) return;
      const avgYield = sum / count;
      const freq = [1, 2, 4, 6, 12, 52].includes(freqMap[id]) ? freqMap[id] : count;
      const est = avgYield * freq;
      estAnnualYield[id][currency] = est;
      if (est > (maxAnnualYield[currency] || 0)) {
        maxAnnualYield[currency] = est;
      }
    });
  });

  // Prepare events for calendar view
  const calendarEvents = filteredData
    .filter(item => {
      if (selectedStockIds.length && !selectedStockIds.includes(item.stock_id)) return false;
      const currency = item.currency || DEFAULT_CURRENCY;
      if (extraFilters.currencies.length && !extraFilters.currencies.includes(currency)) return false;
      if (!activeCurrencies.includes(currency)) return false;
      return true;
    })
    .flatMap(item => {
      const dividendAmount = parseNumberLike(item.dividend);
      const priceValue = parseNumberLike(item.last_close_price);
      const dividend_yield_value = deriveYieldValue(item.dividend_yield, dividendAmount, priceValue);
      const amount = dividendAmount !== null ? dividendAmount : 0;
      const dividend_yield = dividend_yield_value !== null ? dividend_yield_value : 0;
      const currency = item.currency || DEFAULT_CURRENCY;
      const lastClosePrice = item.last_close_price ?? (priceValue !== null ? priceValue : null);
      const dividendDisplay = dividendAmount !== null ? dividendAmount : item.dividend;
      const arr = [];
      if (item.dividend_date) {
        arr.push({
          date: item.dividend_date,
          type: 'ex',
          stock_id: item.stock_id,
          stock_name: item.stock_name,
          amount,
          dividend_yield,
          last_close_price: lastClosePrice,
          dividend_date: item.dividend_date,
          payment_date: item.payment_date,
          currency,
          dividend: dividendDisplay,
        });
      }
      if (item.payment_date) {
        arr.push({
          date: item.payment_date,
          type: 'pay',
          stock_id: item.stock_id,
          stock_name: item.stock_name,
          amount,
          dividend_yield,
          last_close_price: lastClosePrice,
          dividend_date: item.dividend_date,
          payment_date: item.payment_date,
          currency,
          dividend: dividendDisplay,
        });
      }
      return arr;
    });

  const filteredCalendarEvents = calendarEvents.filter(ev =>
    calendarFilter === 'both' || ev.type === calendarFilter
  );


  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      <main className={brandStyles.container}>
        <div className={brandStyles.navigation}>
          <ExperienceNavigation
            current="dividend-life"
            homeHref={homeHref}
            homeNavigation={homeNavigation}
          />
          <img
            src={navigationText}
            alt=""
            aria-hidden="true"
            loading="lazy"
            className={brandStyles.navigationTextMark}
          />
        </div>
        <section className={`${brandStyles.panel} ${brandStyles.content} ${brandStyles.contentWide}`}>
          {upcomingAlerts.length > 0 && (
            <div className="dividend-alert">
              {upcomingAlerts.map(a => (
                <div key={`${a.stock_id}-${a.type}`}>
                  {lang === 'en'
                    ? `${a.stock_id} ${a.stock_name} will ${a.type === 'ex' ? 'go ex-dividend' : 'pay dividend'} tomorrow. ${a.dividend} per share, estimated ${Math.round(a.total).toLocaleString()}`
                    : `${a.stock_id} ${a.stock_name} 明天即將${a.type === 'ex' ? '除息' : '配息'} 每股 ${a.dividend} 元，預估領取 ${Math.round(a.total).toLocaleString()} 元`}
                </div>
              ))}
            </div>
          )}
          <ul className="nav nav-tabs mb-1 justify-content-center">
            <li className="nav-item">
              <button
                className={`nav-link${tab === 'home' ? ' active' : ''}`}
                onClick={() => setTab('home')}
              >
                {t('home')}
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link${tab === 'mydividend' ? ' active' : ''}`}
                onClick={() => setTab('mydividend')}
              >
                {t('mydividend')}
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link${tab === 'dividend' ? ' active' : ''}`}
                onClick={() => setTab('dividend')}
              >
                {t('dividend_search')}
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link${tab === 'inventory' ? ' active' : ''}`}
                onClick={() => setTab('inventory')}
              >
                {t('inventory')}
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link${tab === 'about' ? ' active' : ''}`}
                onClick={() => setTab('about')}
              >
                {t('about')}
              </button>
            </li>
          </ul>
          {tab === 'home' && <HomeTab />}
          {tab === 'dividend' && (
            <div className="App">
              <h3>{lang === 'en' ? 'Monthly Dividend Summary' : '每月配息總表'}</h3>
              <div className="dividend-controls">
                <div className="control-pair">
                  <label>{lang === 'en' ? 'Year:' : '年份：'}</label>
                  <select
                    value={selectedYear}
                    onChange={e => setSelectedYear(Number(e.target.value))}
                  >
                    {years.map(year => (
                      <option value={year} key={year}>{year}</option>
                    ))}
                  </select>
                </div>
                <div className="control-pair">
                <label>{lang === 'en' ? 'Watch Group:' : '觀察組合：'}</label>
                <select value={selectedGroup} onChange={handleGroupChange}>
                  <option value="">{lang === 'en' ? 'Custom' : '自選'}</option>
                  {watchGroups.map(g => (
                    <option key={g.name} value={g.name}>{renderGroupOptionLabel(g)}</option>
                  ))}
                </select>
                <button
                  onClick={() => setShowGroupModal(true)}
                  className="group-create-button"
                >
                  {lang === 'en' ? 'Create' : '建立'}
                </button>
              </div>
            </div>
            <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
              <CurrencyViewToggle
                viewMode={viewMode}
                onChange={handleViewModeChange}
                hasTwd={hasTwd}
                hasUsd={hasUsd}
                lang={lang}
                description={viewDescriptionContent}
                labelPrefix={viewLabelPrefix}
                style={{ marginTop: 0 }}
              />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                <button
                  onClick={() => handleDividendScopeChange('purchased')}
                  className={dividendScope === 'purchased' ? 'btn-selected' : 'btn-unselected'}
                  disabled={!canSelectPurchased}
                  style={canSelectPurchased ? undefined : { opacity: 0.6, cursor: 'not-allowed' }}
                >
                  {purchasedScopeLabel}
                </button>
                <button
                  onClick={() => handleDividendScopeChange('all')}
                  className={dividendScope === 'all' ? 'btn-selected' : 'btn-unselected'}
                >
                  {allScopeLabel}
                </button>
              </div>
            </div>
            <button
              onClick={() => setShowCalendar(v => !v)}
              style={{ marginTop: 10 }}
            >
              {showCalendar
                ? (lang === 'en' ? 'Hide Calendar' : '隱藏月曆')
                : (lang === 'en' ? 'Show Calendar' : '顯示月曆')}
            </button>
  
            {loading ? (
              <p>Loading...</p>
            ) : error ? (
              <p>Error: {error.message}</p>
            ) : (
              <>
                {showCalendar && (
                  <>
                    <div style={{ margin: '10px 0' }}>
                      <button
                        onClick={() => setCalendarFilter('ex')}
                        className={calendarFilter === 'ex' ? 'btn-selected' : 'btn-unselected'}
                      >
                        {lang === 'en' ? 'Ex-dividend Date' : '除息日'}
                      </button>
                      <button
                        onClick={() => setCalendarFilter('pay')}
                        className={calendarFilter === 'pay' ? 'btn-selected' : 'btn-unselected'}
                        style={{ marginLeft: 6, marginTop: 6 }}
                      >
                        {lang === 'en' ? 'Payment Date' : '發放日'}
                      </button>
                      <button
                        onClick={() => setCalendarFilter('both')}
                        className={calendarFilter === 'both' ? 'btn-selected' : 'btn-unselected'}
                        style={{ marginLeft: 6, marginTop: 6 }}
                      >
                        {lang === 'en' ? 'Ex/Paid Date' : '除息/發放日'}
                      </button>
                    </div>
                    <DividendCalendar
                      year={selectedYear}
                      events={filteredCalendarEvents}
                      showTotals={false}
                      receivableAsPerShare
                    />
                  </>
                )}
  
                <div className="more-item" style={{ marginTop: 10 }}>
                  <button onClick={() => setShowDisplays(v => !v)} style={{ marginRight: 10 }}>
                    {lang === 'en' ? 'Other Options' : '其他顯示'}
                  </button>
                  {showDisplays && (
                    <DisplayDropdown
                      toggleDividendYield={() => setShowDividendYield(v => !v)}
                      showDividendYield={showDividendYield}
                      toggleAxis={() => setShowInfoAxis(v => !v)}
                      showInfoAxis={showInfoAxis}
                      onClose={() => setShowDisplays(false)}
                    />
                  )}
                {/* </div> */}
  
                {/* <div className={appStyles.tableHeader}> */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 10 }}>
                    <button onClick={handleResetFilters}>
                      {lang === 'en' ? 'Reset All Filters' : '重置所有篩選'}
                    </button>
                    <div style={{ position: 'relative', display: 'inline-block' }}>
                      <button onClick={() => setShowAdvancedFilters(v => !v)}>
                        {lang === 'en' ? 'Advanced Filters' : '進階篩選'}
                      </button>
                      {showAdvancedFilters && (
                        <AdvancedFilterDropdown
                          filters={extraFilters}
                          setFilters={setExtraFilters}
                          onClose={() => setShowAdvancedFilters(false)}
                          availableCurrencies={availableCurrencies}
                        />
                      )}
                    </div>
                    <span style={{ fontSize: 13, color: '#adb5bd' }}>
                      {lang === 'en' ? 'Tip: Use advanced filters to refine the table.' : '提示：使用進階篩選調整顯示內容。'}
                    </span>
                  </div>
                </div>
  
                {dividendCacheInfo && (
                  <div className={appStyles.cacheInfo}>
                    {lang === 'en' ? 'Cache' : '快取'}: {dividendCacheInfo.cacheStatus}
                    {dividendCacheInfo.timestamp ? ` (${new Date(dividendCacheInfo.timestamp).toLocaleString()})` : ''}
                  </div>
                )}
  
                {showInfoAxis && (
                  <div style={{ margin: '10px 0' }}>
                    <label>
                      {lang === 'en' ? 'Estimated Monthly Income:' : '預計月報酬：'}
                      <input
                        type="number"
                        value={monthlyIncomeGoal}
                        onChange={e => setMonthlyIncomeGoal(Number(e.target.value) || 0)}
                        style={{ width: 80, marginLeft: 4 }}
                      />
                    </label>
                  </div>
                )}
  
                <StockTable
                  stocks={displayStocks}
                  dividendTable={dividendTable}
                  totalPerStock={totalPerStock}
                  yieldSum={yieldSum}
                  yieldCount={yieldCount}
                  latestPrice={latestPrice}
                  latestYield={latestYield}
                  estAnnualYield={estAnnualYield}
                  maxAnnualYield={maxAnnualYield}
                  maxYieldPerMonth={maxYieldPerMonth}
                  stockOptions={stockOptions}
                  selectedStockIds={selectedStockIds}
                  setSelectedStockIds={setSelectedStockIds}
                  monthHasValue={monthHasValue}
                  setMonthHasValue={setMonthHasValue}
                  showDividendYield={showDividendYield}
                  currentMonth={currentMonth}
                  monthlyIncomeGoal={monthlyIncomeGoal}
                  showAllStocks={showAllStocks}
                  setShowAllStocks={setShowAllStocks}
                  showInfoAxis={showInfoAxis}
                  getIncomeGoalInfo={getIncomeGoalInfo}
                  freqMap={freqMap}
                  activeCurrencies={activeCurrencies}
                />
              </>
            )}
          </div>
        )}
        {tab === 'inventory' && (
          <InventoryTab
            allDividendData={data}
            dividendCacheInfo={dividendCacheInfo}
          />
        )}
        {tab === 'mydividend' && (
          <UserDividendsTab
            allDividendData={data}
            selectedYear={selectedYear}
          />
        )}
        {tab === 'about' && <AboutTab />}
        <NLHelper />
        {showGroupModal && (
          <div className="modal-overlay">
            <div className="custom-modal">
              <h3>{lang === 'en' ? 'Watch Groups' : '觀察組合'}</h3>
              <div style={{ marginBottom: 10 }}>
                <button onClick={handleAddGroup}>{lang === 'en' ? 'Add Group' : '新增組合'}</button>
              </div>
              {editingGroupIndex !== null && (
                <div style={{ marginBottom: 10 }}>
                  <div>
                    <input
                      type="text"
                      placeholder={lang === 'en' ? 'Group Name' : '組合名稱'}
                      value={groupNameInput}
                      onChange={e => setGroupNameInput(e.target.value)}
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder={lang === 'en' ? 'ETF IDs, comma separated' : 'ETF ID，以逗號分隔'}
                      value={groupIdsInput}
                      onChange={e => setGroupIdsInput(e.target.value)}
                      style={{
                        marginTop: 4,
                        marginBottom: 4
                      }}
                    />
                  </div>
                  <button onClick={handleSaveGroup} style={{ marginLeft: 4 }}>{lang === 'en' ? 'Save' : '儲存'}</button>
                  <button onClick={handleCancelEditGroup} style={{ marginLeft: 4 }}>{lang === 'en' ? 'Cancel' : '取消'}</button>
                </div>
              )}
              {watchGroups.map((g, idx) => (
                <div key={idx} style={{ marginBottom: 8 }}>
                  <div>
                    <strong style={isGroupModified(g) ? { color: 'red' } : {}}>{renderGroupName(g.name)}</strong>: {renderGroupIds(g)}
                  </div>
                  <div style={{ marginTop: 4 }}>
                    <button onClick={() => handleEditGroup(idx)}>{lang === 'en' ? 'Edit' : '修改'}</button>
                    <button onClick={() => handleDeleteGroup(idx)} style={{ marginLeft: 4 }}>{lang === 'en' ? 'Delete' : '刪除'}</button>
                  </div>
                </div>
              ))}
              {watchGroups.length === 0 && <p style={{ fontSize: 14 }}>{lang === 'en' ? 'No groups yet' : '尚無組合'}</p>}
              <div style={{ textAlign: 'right', marginTop: 12 }}>
                <button onClick={() => setShowGroupModal(false)}>{lang === 'en' ? 'Close' : '關閉'}</button>
              </div>
            </div>
          </div>
        )}
        </section>
        <div className={brandStyles.footer}>
          <Footer
            theme={theme}
            setTheme={setTheme}
            lang={lang}
            setLang={setLang}
            t={t}
            translations={translations}
          />
        </div>
      </main>
    </LanguageContext.Provider>
  );
}

export default DividendLifePage;
