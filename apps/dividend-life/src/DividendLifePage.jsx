import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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
import TooltipText from './components/TooltipText';

import './App.css';
import appStyles from './App.module.css';
import brandStyles from '@shared/components/BrandPage/BrandPage.module.css';
import NLHelper from './NLHelper';
import { API_HOST } from '../config';
import { fetchWithCache } from './api';
import { getTomorrowDividendAlerts } from './utils/dividendUtils';
import { fetchDividendsByYears, clearDividendsCache, clearEmptyDividendCaches } from './dividendApi';
import { fetchStockList } from './stockApi';
import useEffectOnce from './hooks/useEffectOnce';
import useWatchGroups from './hooks/useWatchGroups';
import useCurrencyView from './hooks/useCurrencyView';
import useCalendarState from './hooks/useCalendarState';
import { readTransactionHistory } from './utils/transactionStorage';
import { summarizeInventory, getPurchasedStockIds } from './utils/inventoryUtils';
import {
  DEFAULT_CURRENCY,
  normalizeCurrency,
  calcIncomeGoalInfo
} from './utils/currencyUtils';

const DEFAULT_MONTHLY_GOAL = 10000;
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

const CURRENT_YEAR = new Date().getFullYear();
const PREVIOUS_YEAR = CURRENT_YEAR - 1;
const NEXT_YEAR = CURRENT_YEAR + 1;
const CURRENT_MONTH = new Date().getMonth(); // 0-11

// If it's December (month 11), include next year in available years
const ALLOWED_YEARS = CURRENT_MONTH === 11
  ? [NEXT_YEAR, CURRENT_YEAR, PREVIOUS_YEAR]
  : [CURRENT_YEAR, PREVIOUS_YEAR];

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
  const [years, setYears] = useState(ALLOWED_YEARS);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [upcomingAlerts, setUpcomingAlerts] = useState([]);
  const [dismissedAlerts, setDismissedAlerts] = useState(() => {
    try {
      const saved = sessionStorage.getItem('dismissedDividendAlerts');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const dismissAlert = (key) => {
    setDismissedAlerts(prev => {
      const next = [...prev, key];
      try { sessionStorage.setItem('dismissedDividendAlerts', JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };
  const fetchSkipRef = useRef(new Map());
  const selectedYearRef = useRef(selectedYear);
  const groupModalTriggerRef = useRef(null);

  // Calendar state
  const {
    showCalendar, setShowCalendar,
    calendarFilter, setCalendarFilter,
    calendarMonth, setCalendarMonth,
  } = useCalendarState();

  useEffect(() => {
    selectedYearRef.current = selectedYear;
  }, [selectedYear]);

  // Toggle between showing dividend or dividend yield
  const [showDividendYield, setShowDividendYield] = useState(false);
  // Toggle showing monthly average yield (perYield)
  const [showPerYield, setShowPerYield] = useState(false);
  // Toggle axis between months and info categories
  const [showInfoAxis, setShowInfoAxis] = useState(false);
  // Monthly income goal input
  const [monthlyIncomeGoal, setMonthlyIncomeGoal] = useState(DEFAULT_MONTHLY_GOAL);

    // Multi-select filters
    const [selectedStockIds, setSelectedStockIds] = useState([]);
    const [extraFilters, setExtraFilters] = useState({ minYield: '', freq: [], upcomingWithin: '', diamond: false, currencies: [] });

  // Display toggles
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
    document.documentElement.lang = lang === 'en' ? 'en' : 'zh-Hant';
  }, [lang]);
  const t = useMemo(() => (key) => translations[lang][key] || key, [lang]);

  useEffect(() => {
    // Clear any empty/stale dividend caches on startup
    clearEmptyDividendCaches();
    setTransactionHistory(readTransactionHistory());
    setTransactionHistoryLoaded(true);
  }, []);

  // Month value existence filters
  const [monthHasValue, setMonthHasValue] = useState(Array(12).fill(false));
  const [freqMap, setFreqMap] = useState({});
  const timeZone = 'Asia/Taipei';
  const currentMonth = Number(new Date().toLocaleString('en-US', { timeZone, month: 'numeric' })) - 1;
  const getIncomeGoalInfo = (dividend, price, goal, freq = 12) =>
    calcIncomeGoalInfo(dividend, price, goal, freq, lang);

  const handleResetFilters = useCallback((keepIds = false) => {
      if (!keepIds) setSelectedStockIds([]);
      setMonthHasValue(Array(12).fill(false));
      setShowAllStocks(false);
      setExtraFilters({ minYield: '', freq: [], upcomingWithin: '', diamond: false, currencies: [] });
      setShowAdvancedFilters(false);
  }, []);

  // Watch groups hook
  const {
    watchGroups,
    selectedGroup,
    showGroupModal, setShowGroupModal,
    editingGroupIndex,
    groupNameInput, setGroupNameInput,
    groupIdsInput, setGroupIdsInput,
    isGroupModified,
    renderGroupName,
    renderGroupOptionLabel,
    renderGroupIds,
    handleGroupChange,
    handleAddGroup,
    handleEditGroup,
    handleSaveGroup,
    handleCancelEditGroup,
    handleDeleteGroup,
  } = useWatchGroups({ lang, setSelectedStockIds, handleResetFilters });

  const closeGroupModal = () => {
    setShowGroupModal(false);
    groupModalTriggerRef.current?.focus();
    groupModalTriggerRef.current = null;
  };

  useEffect(() => {
    if (!showGroupModal) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowGroupModal(false);
        groupModalTriggerRef.current?.focus();
        groupModalTriggerRef.current = null;
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [showGroupModal]);

  const handleDividendScopeChange = (scope) => {
    setDividendScope(scope);
    setShowAllStocks(false);
  };

  const purchasedStockIds = useMemo(() => {
    return getPurchasedStockIds(transactionHistory);
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
      const uniquePurchased = getPurchasedStockIds(history);

      fetch(`${API_HOST}/update_dividend`).finally(() => {
        // Clear all dividend caches before reload
        clearDividendsCache();
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
    // Fetch all ALLOWED_YEARS at once, not just selectedYear
    const yearsKey = ALLOWED_YEARS.join(',');
    const signature = `${dividendScope}|${idsKey}|${yearsKey}`;
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
      // Store all data without year filtering - filteredData useMemo will handle year filtering
      setData(normalizedDividends);

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
      // Keep current year as default even if no data exists yet
      // Only change if current selection is not in the allowed years list
      if (!yearList.includes(numericSelectedYear)) {
        // Prefer current year, fallback to first available year
        const currentYear = new Date().getFullYear();
        if (yearList.includes(currentYear)) {
          setSelectedYear(currentYear);
        } else {
          setSelectedYear(yearList[0]);
        }
      }
    };

    const load = async () => {
      try {
        // Fetch all ALLOWED_YEARS to get cross-year dividend data
        const { data: dividendData, meta } = await fetchDividendsByYears(ALLOWED_YEARS, undefined, {
          stockIds: stockIdsParam,
          forceRefresh: dividendScope === 'purchased',
          fields: REQUIRED_DIVIDEND_FIELDS,
        });
        applyDividendResponse(dividendData, meta);
      } catch {
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
  }, [dividendScope, purchasedStockIds, transactionHistoryLoaded]);

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

  // Split the large useMemo into smaller, targeted memos for better performance
  const filteredData = useMemo(() => {
    const arr = Array.isArray(data) ? data : [];
    const yearNum = Number(selectedYear);
    return arr
      .filter(item => {
        // Use dividend_date (ex-dividend date) as the primary filter
        // This determines which year the dividend "belongs to"
        const divDate = item.dividend_date ? new Date(item.dividend_date) : null;
        const payDate = item.payment_date ? new Date(item.payment_date) : null;

        // If dividend_date exists, use it as the definitive year
        if (divDate && !Number.isNaN(divDate.getTime())) {
          return divDate.getFullYear() === yearNum;
        }
        // Only fall back to payment_date if dividend_date is not available
        if (payDate && !Number.isNaN(payDate.getTime())) {
          return payDate.getFullYear() === yearNum;
        }
        return false;
      })
      .map(item => ({
        ...item,
        currency: normalizeCurrency(item.currency)
      }));
  }, [data, selectedYear]);

  // Build inventory map for calculating actual dividend payouts
  const inventoryMap = useMemo(() => {
    const { inventoryList } = summarizeInventory(transactionHistory);
    const map = {};
    inventoryList.forEach(item => {
      map[item.stock_id] = item.total_quantity || 0;
    });
    return map;
  }, [transactionHistory]);

  const { stocks, stockCurrencyMap } = useMemo(() => {
    const stocksList = [];
    const stockMap = {};
    const stockCurrencySet = {};
    // First add all stocks from filteredData (stocks with dividend data)
    filteredData.forEach(item => {
      const key = `${item.stock_id}|${item.stock_name}`;
      if (!stockMap[key]) {
        stocksList.push({ stock_id: item.stock_id, stock_name: item.stock_name });
        stockMap[key] = true;
      }
      if (!stockCurrencySet[item.stock_id]) {
        stockCurrencySet[item.stock_id] = new Set();
      }
      stockCurrencySet[item.stock_id].add(item.currency || DEFAULT_CURRENCY);
    });
    // Also include all purchased stocks even if they don't have dividend data for this year
    if (dividendScope === 'purchased') {
      const { inventoryList } = summarizeInventory(transactionHistory);
      inventoryList.forEach(item => {
        const stockId = item.stock_id;
        const stockName = item.stock_name || '';
        const key = `${stockId}|${stockName}`;
        // Only add if not already in the list
        if (!stockMap[key] && !Object.keys(stockMap).some(k => k.startsWith(`${stockId}|`))) {
          stocksList.push({ stock_id: stockId, stock_name: stockName });
          stockMap[key] = true;
        }
      });
    }
    const currencyMap = {};
    Object.keys(stockCurrencySet).forEach(id => {
      currencyMap[id] = Array.from(stockCurrencySet[id]);
    });
    return { stocks: stocksList, stockCurrencyMap: currencyMap };
  }, [filteredData, dividendScope, transactionHistory]);

  const stockOptions = useMemo(() => {
    return stocks.map(s => ({
      value: s.stock_id,
      label: `${s.stock_id}`
    }));
  }, [stocks]);

  const dividendTable = useMemo(() => {
    const table = {};
    const yearNum = Number(selectedYear);
    filteredData.forEach(item => {
      // Use dividend_date as primary reference for determining which year the dividend belongs to
      const divDate = item.dividend_date ? new Date(item.dividend_date) : null;
      const payDate = item.payment_date ? new Date(item.payment_date) : null;

      // Determine the reference date (prefer dividend_date)
      let referenceDate = null;
      let referenceDateRaw = null;
      if (divDate && !Number.isNaN(divDate.getTime())) {
        referenceDate = divDate;
        referenceDateRaw = item.dividend_date;
      } else if (payDate && !Number.isNaN(payDate.getTime())) {
        referenceDate = payDate;
        referenceDateRaw = item.payment_date;
      }

      if (!referenceDate) {
        return;
      }
      // Skip items where dividend_date year doesn't match selected year
      // This ensures 2025-12 ex-dividend items don't appear in 2026 table
      if (referenceDate.getFullYear() !== yearNum) {
        return;
      }
      const month = referenceDate.getMonth();
      const currency = item.currency || DEFAULT_CURRENCY;
      if (!table[item.stock_id]) table[item.stock_id] = {};
      if (!table[item.stock_id][month]) table[item.stock_id][month] = {};
      const cell = table[item.stock_id][month][currency] || {
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

      const dividendValue = Number(item.dividend);
      const yieldValue = Number(item.dividend_yield);
      const hasRawDividend = item.dividend !== undefined && item.dividend !== null && `${item.dividend}`.trim() !== '';
      const hasRawYield = item.dividend_yield !== undefined && item.dividend_yield !== null && `${item.dividend_yield}`.trim() !== '';

      if (Number.isFinite(dividendValue)) {
        cell.dividend += dividendValue;
        cell.hasValidDividend = true;
        cell.hasPendingDividend = false;
      } else if (hasRawDividend && !cell.hasValidDividend) {
        cell.hasPendingDividend = true;
      }

      if (Number.isFinite(yieldValue)) {
        cell.dividend_yield += yieldValue;
        cell.hasValidYield = true;
        cell.hasPendingYield = false;
      } else if (hasRawYield && !cell.hasValidYield) {
        cell.hasPendingYield = true;
      }

      if (item.last_close_price !== undefined) {
        cell.last_close_price = item.last_close_price;
      }
      cell.reference_date = referenceDateRaw;
      if (item.dividend_date) {
        cell.dividend_date = item.dividend_date;
      }
      if (item.payment_date) {
        cell.payment_date = item.payment_date;
      }

      table[item.stock_id][month][currency] = cell;
    });

    // Calculate perYield based on freqMap
    Object.keys(table).forEach(id => {
      const months = Object.keys(table[id]).map(Number).sort((a, b) => a - b);
      let prev = null;
      const rawFreq = Number(freqMap[id]);
      const freq = [1, 2, 4, 6, 12, 52].includes(rawFreq) ? rawFreq : 1;
      months.forEach(m => {
        const monthEntry = table[id][m];
        let span;
        if (prev === null) {
          span = freq ? 12 / freq : 1;
        } else {
          span = m - prev;
          if (span <= 0) span += 12;
        }
        Object.values(monthEntry).forEach(cell => {
          const totalYield = Number(cell.dividend_yield);
          const safeTotalYield = Number.isFinite(totalYield) ? totalYield : 0;
          cell.monthsSpan = span;
          cell.perYield = safeTotalYield / span;
        });
        prev = m;
      });
    });

    return table;
  }, [filteredData, freqMap, selectedYear]);

  const availableCurrencies = useMemo(() => {
    const currenciesSet = new Set(filteredData.map(item => item.currency || DEFAULT_CURRENCY));
    if (currenciesSet.size === 0) {
      currenciesSet.add(DEFAULT_CURRENCY);
    }
    const order = { TWD: 0, USD: 1 };
    return Array.from(currenciesSet).sort((a, b) => {
      const aOrder = order[a] ?? 99;
      const bOrder = order[b] ?? 99;
      if (aOrder !== bOrder) {
        return aOrder - bOrder;
      }
      return a.localeCompare(b);
    });
  }, [filteredData]);

  // Currency view hook
  const {
    viewMode,
    hasTwd,
    hasUsd,
    activeCurrencies,
    viewDescriptionContent,
    handleViewModeChange,
  } = useCurrencyView({ availableCurrencies, lang });

  const viewLabelPrefix = lang === 'en' ? 'Showing:' : '顯示：';
  const purchasedScopeLabel = lang === 'en' ? 'Purchased ETFs' : '已購買 ETF';
  const allScopeLabel = lang === 'en' ? 'All ETFs' : '全部 ETF';
  const canSelectPurchased = purchasedStockIds.length > 0;

  const filteredStocks = stocks.filter(stock => {
    if (selectedStockIds.length && !selectedStockIds.includes(stock.stock_id)) return false;

    // Check if this is a purchased stock with no dividend data
    const isPurchasedStock = dividendScope === 'purchased' && purchasedStockIds.includes(stock.stock_id);
    const hasDividendData = Boolean(dividendTable[stock.stock_id]);

    // Check if any month filter is active
    const hasMonthFilter = monthHasValue.some(v => v);

    // Show purchased stocks without dividend data only if no month filter is active
    if (isPurchasedStock && !hasDividendData) {
      return !hasMonthFilter;
    }

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
            const yVal = Number(cell?.dividend_yield);
            if (Number.isFinite(yVal) && yVal > 0) {
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
            const monthMax = maxYieldPerMonth[currency]?.[m] || 0;
            return y > 0 && monthMax > 0 && Math.abs(y - monthMax) < 1e-6;
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
    const shares = inventoryMap[stock.stock_id] || 0;
    // Only process data from dividendTable (which is already year-filtered)
    const stockTable = dividendTable[stock.stock_id];
    if (!stockTable) return; // No dividend data for this stock in selected year
    for (let m = 0; m < 12; m++) {
      const monthEntry = stockTable[m];
      if (!monthEntry) continue;
      currenciesForTotals.forEach(currency => {
        const cell = monthEntry?.[currency];
        if (!cell) return;
        const dividendPerShare = Number(cell.dividend);
        const val = Number.isFinite(dividendPerShare) ? dividendPerShare * shares : 0;
        const yValRaw = Number(cell.dividend_yield);
        const yVal = Number.isFinite(yValRaw) ? yValRaw : 0;
        totalPerStock[stock.stock_id][currency] = (totalPerStock[stock.stock_id][currency] || 0) + val;
        if (yVal > 0) {
          yieldSum[stock.stock_id][currency] = (yieldSum[stock.stock_id][currency] || 0) + yVal;
          yieldCount[stock.stock_id][currency] = (yieldCount[stock.stock_id][currency] || 0) + 1;
        }
        const lastClose = Number(cell.last_close_price);
        const safeLastClose = Number.isFinite(lastClose) ? lastClose : cell.last_close_price ?? null;
        const priceDateRaw = cell.reference_date || cell.dividend_date || cell.payment_date || null;
        const priceDate = priceDateRaw ? new Date(priceDateRaw) : null;
        const existingDate = latestPrice[stock.stock_id].date ? new Date(latestPrice[stock.stock_id].date) : null;
        if (!existingDate || (priceDate && priceDate > existingDate)) {
          latestPrice[stock.stock_id] = { price: safeLastClose, date: priceDateRaw };
        }
        const existingYieldDate = latestYield[stock.stock_id].date ? new Date(latestYield[stock.stock_id].date) : null;
        if (!existingYieldDate || (priceDate && priceDate > existingYieldDate)) {
          latestYield[stock.stock_id] = { yield: yVal, date: priceDateRaw };
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
      const amount = parseFloat(item.dividend);
      const dividend_yield = parseFloat(item.dividend_yield) || 0;
      const currency = item.currency || DEFAULT_CURRENCY;
      const arr = [];
      if (item.dividend_date) {
        arr.push({
          date: item.dividend_date,
          type: 'ex',
          stock_id: item.stock_id,
          stock_name: item.stock_name,
          amount,
          dividend_yield,
          last_close_price: item.last_close_price,
          dividend_date: item.dividend_date,
          payment_date: item.payment_date,
          currency,
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
          last_close_price: item.last_close_price,
          dividend_date: item.dividend_date,
          payment_date: item.payment_date,
          currency,
        });
      }
      return arr;
    });

  const filteredCalendarEvents = calendarEvents.filter(ev =>
    calendarFilter === 'both' || ev.type === calendarFilter
  );


  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      <main id="main-content" className={brandStyles.container}>
        <h1 className="sr-only">Dividend Life — {lang === 'en' ? 'ETF Dividend Calendar & Tracking' : 'ETF 股息日曆與配息追蹤'}</h1>
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
          <div className="dividend-alert" role="status" aria-live="polite" aria-atomic="false">
            {upcomingAlerts.filter(a => !dismissedAlerts.includes(`${a.stock_id}-${a.type}-${a.date}`)).map(a => {
              const key = `${a.stock_id}-${a.type}-${a.date}`;
              const dateLabel = a.date.split('-').slice(1).map(Number).join('/');
              const countdownZh = a.daysUntil === 0 ? '今天' : a.daysUntil === 1 ? '明天' : `還有 ${a.daysUntil} 天`;
              const countdownEn = a.daysUntil === 0 ? 'today' : a.daysUntil === 1 ? 'tomorrow' : `in ${a.daysUntil} days`;
              const text = lang === 'en'
                ? `${a.stock_id} ${a.stock_name} will ${a.type === 'ex' ? 'go ex-dividend' : 'pay dividend'} ${countdownEn} (${dateLabel}). ${a.dividend} per share, estimated ${Math.round(a.total).toLocaleString()}`
                : `${a.stock_id} ${a.stock_name}將於${countdownZh}（${dateLabel}）${a.type === 'ex' ? '除息' : '配息'}，每股 ${a.dividend} 元，預估領取 ${Math.round(a.total).toLocaleString()} 元`;
              return (
                <div key={key} className="dividend-alert__item">
                  <span className="dividend-alert__text">{text}</span>
                  <button
                    type="button"
                    className="dividend-alert__dismiss"
                    onClick={() => dismissAlert(key)}
                    aria-label={lang === 'en' ? `Dismiss alert for ${a.stock_id}` : `關閉 ${a.stock_id} 提醒`}
                  >×</button>
                </div>
              );
            })}
          </div>
          <ul className="nav nav-tabs mb-1 justify-content-center" role="tablist" aria-label={lang === 'en' ? 'Main navigation' : '主導覽'}>
            <li className="nav-item" role="presentation">
              <button
                type="button"
                id="tab-home"
                role="tab"
                aria-selected={tab === 'home'}
                aria-controls="panel-home"
                className={`nav-link${tab === 'home' ? ' active' : ''}`}
                onClick={() => setTab('home')}
              >
                {t('home')}
              </button>
            </li>
            <li className="nav-item" role="presentation">
              <button
                type="button"
                id="tab-mydividend"
                role="tab"
                aria-selected={tab === 'mydividend'}
                aria-controls="panel-mydividend"
                className={`nav-link${tab === 'mydividend' ? ' active' : ''}`}
                onClick={() => setTab('mydividend')}
              >
                {t('mydividend')}
              </button>
            </li>
            <li className="nav-item" role="presentation">
              <button
                type="button"
                id="tab-dividend"
                role="tab"
                aria-selected={tab === 'dividend'}
                aria-controls="panel-dividend"
                className={`nav-link${tab === 'dividend' ? ' active' : ''}`}
                onClick={() => setTab('dividend')}
              >
                {t('dividend_search')}
              </button>
            </li>
            <li className="nav-item" role="presentation">
              <button
                type="button"
                id="tab-inventory"
                role="tab"
                aria-selected={tab === 'inventory'}
                aria-controls="panel-inventory"
                className={`nav-link${tab === 'inventory' ? ' active' : ''}`}
                onClick={() => setTab('inventory')}
              >
                {t('inventory')}
              </button>
            </li>
            <li className="nav-item" role="presentation">
              <button
                type="button"
                id="tab-about"
                role="tab"
                aria-selected={tab === 'about'}
                aria-controls="panel-about"
                className={`nav-link${tab === 'about' ? ' active' : ''}`}
                onClick={() => setTab('about')}
              >
                {t('about')}
              </button>
            </li>
          </ul>
          {tab === 'home' && (
            <div id="panel-home" role="tabpanel" aria-labelledby="tab-home">
              <HomeTab />
            </div>
          )}
          {tab === 'dividend' && (
            <div id="panel-dividend" role="tabpanel" aria-labelledby="tab-dividend" className="dividend-tab">

              {/* ── FILTER BAR ── */}
              <div className="filter-bar">

                {/* Row 1: primary selectors */}
                <div className="filter-bar__row filter-bar__row--primary">
                  <div className="filter-bar__item">
                    <label htmlFor="filter-year" className="filter-bar__label">
                      {lang === 'en' ? 'Year' : '年份'}
                    </label>
                    <select
                      id="filter-year"
                      className="filter-bar__select"
                      value={selectedYear}
                      onChange={e => setSelectedYear(Number(e.target.value))}
                    >
                      {years.map(year => (
                        <option value={year} key={year}>{year}</option>
                      ))}
                    </select>
                  </div>

                  <div className="filter-bar__item filter-bar__item--group">
                    <label htmlFor="filter-group" className="filter-bar__label">
                      {lang === 'en' ? 'Group' : '觀察組合'}
                      <TooltipText tooltip={lang === 'en' ? 'Group stocks together to quickly filter dividend data by portfolio' : '建立自訂股票組合，快速篩選特定組合的股息資料'} style={{ marginLeft: 4 }}>
                        <span className="filter-bar__help-icon" aria-hidden="true">?</span>
                      </TooltipText>
                    </label>
                    <div className="filter-bar__group-row">
                      <select
                        id="filter-group"
                        className="filter-bar__select"
                        value={selectedGroup}
                        onChange={handleGroupChange}
                      >
                        <option value="">{lang === 'en' ? 'Custom' : '自選'}</option>
                        {watchGroups.map(g => (
                          <option key={g.name} value={g.name}>{renderGroupOptionLabel(g)}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="filter-bar__ghost-btn"
                        onClick={() => { groupModalTriggerRef.current = document.activeElement; setShowGroupModal(true); }}
                      >
                        {lang === 'en' ? '+ New' : '+ 建立'}
                      </button>
                    </div>
                  </div>

                  <div className="filter-bar__item filter-bar__item--scope">
                    <span className="filter-bar__label">
                      {lang === 'en' ? 'Scope' : '範圍'}
                    </span>
                    <div className="filter-bar__pill-group" role="group" aria-label={lang === 'en' ? 'Scope' : '範圍'}>
                      <button
                        type="button"
                        className={`filter-bar__pill${dividendScope === 'purchased' ? ' filter-bar__pill--active' : ''}`}
                        onClick={() => handleDividendScopeChange('purchased')}
                        disabled={!canSelectPurchased}
                        aria-pressed={dividendScope === 'purchased'}
                      >
                        {purchasedScopeLabel}
                      </button>
                      <button
                        type="button"
                        className={`filter-bar__pill${dividendScope === 'all' ? ' filter-bar__pill--active' : ''}`}
                        onClick={() => handleDividendScopeChange('all')}
                        aria-pressed={dividendScope === 'all'}
                      >
                        {allScopeLabel}
                      </button>
                    </div>
                  </div>

                  <div className="filter-bar__item filter-bar__item--currency">
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
                  </div>
                </div>

                {/* Row 2: secondary actions */}
                <div className="filter-bar__row filter-bar__row--secondary">
                  <button
                    type="button"
                    className={`filter-bar__action-btn${showCalendar ? ' filter-bar__action-btn--active' : ''}`}
                    onClick={() => setShowCalendar(v => !v)}
                    aria-pressed={showCalendar}
                  >
                    📅 {showCalendar
                      ? (lang === 'en' ? 'Hide Calendar' : '隱藏月曆')
                      : (lang === 'en' ? 'Show Calendar' : '顯示月曆')}
                  </button>

                  <div className="filter-bar__action-wrap">
                    <button
                      type="button"
                      className="filter-bar__action-btn"
                      onClick={() => setShowDisplays(v => !v)}
                      aria-expanded={showDisplays}
                      aria-haspopup="true"
                    >
                      {lang === 'en' ? 'Display ▾' : '顯示選項 ▾'}
                    </button>
                    {showDisplays && (
                      <DisplayDropdown
                        toggleDividendYield={() => setShowDividendYield(v => !v)}
                        showDividendYield={showDividendYield}
                        togglePerYield={() => setShowPerYield(v => !v)}
                        showPerYield={showPerYield}
                        toggleAxis={() => setShowInfoAxis(v => !v)}
                        showInfoAxis={showInfoAxis}
                        onClose={() => setShowDisplays(false)}
                      />
                    )}
                  </div>

                  <div className="filter-bar__action-wrap">
                    <button
                      type="button"
                      className="filter-bar__action-btn"
                      onClick={() => setShowAdvancedFilters(v => !v)}
                      aria-expanded={showAdvancedFilters}
                      aria-haspopup="true"
                    >
                      {lang === 'en' ? '⚙ Filters' : '⚙ 進階篩選'}
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

                  <button
                    type="button"
                    className="filter-bar__reset-btn"
                    onClick={handleResetFilters}
                  >
                    {lang === 'en' ? '↺ Reset' : '↺ 重置'}
                  </button>

                  {dividendCacheInfo && (
                    <span className="filter-bar__cache-info">
                      {dividendCacheInfo.cacheStatus}
                    </span>
                  )}
                </div>
              </div>

              {/* ── CALENDAR PANEL ── */}
              {showCalendar && !loading && !error && (
                <div className="calendar-panel">
                  <div className="calendar-panel__filter" role="group" aria-label={lang === 'en' ? 'Calendar filter' : '月曆篩選'}>
                    {[
                      { key: 'ex',   label: lang === 'en' ? 'Ex-div' : '除息日' },
                      { key: 'pay',  label: lang === 'en' ? 'Payment' : '發放日' },
                      { key: 'both', label: lang === 'en' ? 'Both' : '全部' },
                    ].map(({ key, label }) => (
                      <button
                        key={key}
                        type="button"
                        className={`filter-bar__pill${calendarFilter === key ? ' filter-bar__pill--active' : ''}`}
                        onClick={() => setCalendarFilter(key)}
                        aria-pressed={calendarFilter === key}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <DividendCalendar
                    year={selectedYear}
                    events={filteredCalendarEvents}
                    showTotals={false}
                    receivableAsPerShare
                    availableYears={years}
                    onYearChange={setSelectedYear}
                    month={calendarMonth}
                    onMonthChange={setCalendarMonth}
                  />
                </div>
              )}

              {/* ── INCOME GOAL INPUT (when info axis active) ── */}
              {showInfoAxis && (
                <div className="income-goal-input-row">
                  <label htmlFor="monthly-income-goal" className="filter-bar__label">
                    {lang === 'en' ? 'Monthly income target:' : '預計月報酬：'}
                  </label>
                  <input
                    id="monthly-income-goal"
                    type="number"
                    className="income-goal-input"
                    value={monthlyIncomeGoal}
                    onChange={e => setMonthlyIncomeGoal(Number(e.target.value) || 0)}
                  />
                </div>
              )}

              {/* ── TABLE ── */}
              {loading ? (
                <p className="dividend-tab__status" role="status" aria-live="polite">{lang === 'en' ? 'Loading…' : '載入中…'}</p>
              ) : error ? (
                <p className="dividend-tab__status dividend-tab__status--error" role="alert">
                  {lang === 'en' ? 'Error: ' : '錯誤：'}{error.message}
                </p>
              ) : (
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
                  showPerYield={showPerYield}
                  currentMonth={currentMonth}
                  monthlyIncomeGoal={monthlyIncomeGoal}
                  showAllStocks={showAllStocks}
                  setShowAllStocks={setShowAllStocks}
                  showInfoAxis={showInfoAxis}
                  getIncomeGoalInfo={getIncomeGoalInfo}
                  freqMap={freqMap}
                  activeCurrencies={activeCurrencies}
                />
              )}
            </div>
          )}
        {tab === 'inventory' && (
          <div id="panel-inventory" role="tabpanel" aria-labelledby="tab-inventory">
            <InventoryTab
              allDividendData={data}
              dividendCacheInfo={dividendCacheInfo}
            />
          </div>
        )}
        {tab === 'mydividend' && (
          <div id="panel-mydividend" role="tabpanel" aria-labelledby="tab-mydividend">
            <UserDividendsTab
              allDividendData={data}
              availableYears={years}
            />
          </div>
        )}
        {tab === 'about' && (
          <div id="panel-about" role="tabpanel" aria-labelledby="tab-about">
            <AboutTab />
          </div>
        )}
        {showGroupModal && (
          <div className="modal-overlay" role="presentation">
            <div className="custom-modal" role="dialog" aria-modal="true" aria-labelledby="watch-group-modal-title">
              <h3 id="watch-group-modal-title">{lang === 'en' ? 'Watch Groups' : '觀察組合'}</h3>
              <div className="watch-group-modal__add-row">
                <button type="button" autoFocus onClick={handleAddGroup}>{lang === 'en' ? 'Add Group' : '新增組合'}</button>
              </div>
              {editingGroupIndex !== null && (
                <div className="watch-group-modal__edit-form">
                  <div>
                    <input
                      type="text"
                      aria-label={lang === 'en' ? 'Group Name' : '組合名稱'}
                      placeholder={lang === 'en' ? 'Group Name' : '組合名稱'}
                      value={groupNameInput}
                      onChange={e => setGroupNameInput(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      className="watch-group-modal__ids-input"
                      aria-label={lang === 'en' ? 'ETF IDs, comma separated' : 'ETF ID，以逗號分隔'}
                      placeholder={lang === 'en' ? 'ETF IDs, comma separated' : 'ETF ID，以逗號分隔'}
                      value={groupIdsInput}
                      onChange={e => setGroupIdsInput(e.target.value)}
                    />
                  </div>
                  <div className="watch-group-modal__edit-actions">
                    <button type="button" onClick={handleSaveGroup}>{lang === 'en' ? 'Save' : '儲存'}</button>
                    <button type="button" onClick={handleCancelEditGroup}>{lang === 'en' ? 'Cancel' : '取消'}</button>
                  </div>
                </div>
              )}
              {watchGroups.map((g, idx) => (
                <div key={idx} className="watch-group-modal__item">
                  <div>
                    <strong className={isGroupModified(g) ? 'watch-group-modal__name--modified' : ''}>
                      {renderGroupName(g.name)}
                    </strong>: {renderGroupIds(g)}
                  </div>
                  <div className="watch-group-modal__item-actions">
                    <button type="button" aria-label={lang === 'en' ? `Edit ${g.name}` : `修改 ${g.name}`} onClick={() => handleEditGroup(idx)}>{lang === 'en' ? 'Edit' : '修改'}</button>
                    <button type="button" aria-label={lang === 'en' ? `Delete ${g.name}` : `刪除 ${g.name}`} onClick={() => handleDeleteGroup(idx)}>{lang === 'en' ? 'Delete' : '刪除'}</button>
                  </div>
                </div>
              ))}
              {watchGroups.length === 0 && (
                <p className="watch-group-modal__empty">
                  {lang === 'en' ? 'No groups yet' : '尚無組合'}
                </p>
              )}
              <div className="watch-group-modal__footer">
                <button type="button" onClick={closeGroupModal}>{lang === 'en' ? 'Close' : '關閉'}</button>
              </div>
            </div>
          </div>
        )}
        </section>
        <NLHelper />
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
