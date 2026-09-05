import { useState, useEffect, useMemo, useRef, useCallback, lazy, Suspense } from 'react';
import { LanguageContext, translations } from './i18n';
import { ToastProvider } from './Toast';
import { useToast } from './useToast';
import HomeTab from './HomeTab';
import DisplayDropdown from './components/DisplayDropdown';
import DividendCalendar from './components/DividendCalendar';
import StockTable from './components/StockTable';
import Footer from '@shared/components/Footer/Footer.jsx';
import ExperienceNavigation from '@shared/components/ExperienceNavigation/ExperienceNavigation.jsx';
import AdvancedFilterDropdown from './components/AdvancedFilterDropdown';
import CurrencyViewToggle from './components/CurrencyViewToggle';
import TooltipText from './components/TooltipText';
import ErrorBoundary from './components/ErrorBoundary';
import DemoModeBanner from './components/DemoModeBanner';
import { DEMO_TRANSACTIONS } from './utils/demoData';
import useFocusTrap from './hooks/useFocusTrap';

const InventoryTab = lazy(() => import('./InventoryTab'));
const UserDividendsTab = lazy(() => import('./UserDividendsTab'));
const AboutTab = lazy(() => import('./AboutTab'));
const NLHelper = lazy(() => import('./NLHelper'));

import './App.css';
import PageContainer from './components/PageContainer.jsx';
import { API_HOST } from '../config';
import { getTomorrowDividendAlerts } from './utils/dividendUtils';
import { clearEmptyDividendCaches } from './dividendApi';
import useDividendData from './hooks/useDividendData';
import useWatchGroups from './hooks/useWatchGroups';
import useCurrencyView from './hooks/useCurrencyView';
import useCalendarState from './hooks/useCalendarState';
import { readTransactionHistory } from './utils/transactionStorage';
import {
  DEFAULT_CURRENCY,
  calcIncomeGoalInfo
} from './utils/currencyUtils';

const DEFAULT_MONTHLY_GOAL = 10000;

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
  // Tab state — persisted in URL hash for shareability/back-nav
  const VALID_TABS = new Set(['home', 'dividend', 'inventory', 'mydividend', 'about']);
  const getTabFromHash = () => {
    const hash = window.location.hash.slice(1);
    return VALID_TABS.has(hash) ? hash : 'home';
  };
  const [tab, setTabState] = useState(getTabFromHash);
  const setTab = (newTab) => {
    setTabState(newTab);
    history.replaceState(null, '', `#${newTab}`);
  };

  // All your existing states for dividend page...
  const [transactionHistory, setTransactionHistory] = useState([]);
  const [transactionHistoryLoaded, setTransactionHistoryLoaded] = useState(false);

  const [demoMode, setDemoMode] = useState(false);
  const [importFocusRequested, setImportFocusRequested] = useState(false);

  const handleEnterDemo = useCallback(() => {
    setDemoMode(true);
  }, []);

  const handleExitDemo = useCallback(() => {
    setDemoMode(false);
  }, []);

  const handleRequestImport = useCallback(() => {
    setImportFocusRequested(true);
    setTab('inventory');
  }, []);

  const handleImportFocusHandled = useCallback(() => {
    setImportFocusRequested(false);
  }, []);

  // effectiveTransactions feeds the dividend-data pipeline only (useDividendData below) —
  // it's fine there being demo-derived-or-real by design, and was already the page's own
  // (mount-time-snapshot) copy of transactionHistory pre-dating this feature either way.
  const effectiveTransactions = demoMode ? DEMO_TRANSACTIONS : transactionHistory;
  // transactionsOverride passed down to the three tabs is intentionally NOT the same value:
  // it's null outside demo mode, so each tab keeps reading/writing localStorage itself
  // exactly as it did before demo mode existed (this page's own transactionHistory is only
  // ever set once on mount and never updated again as tabs independently mutate storage, so
  // treating it as a permanent live mirror for display purposes would let tabs silently show
  // stale data and, worse, overwrite real localStorage with a stale snapshot on the next
  // edit). Only inject the fabricated DEMO_TRANSACTIONS while demoMode is actually on.
  const demoTransactionsOverride = demoMode ? DEMO_TRANSACTIONS : null;

  const [dividendScope, setDividendScope] = useState('purchased');
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
  const showToast = useToast();
  const groupModalTriggerRef = useRef(null);
  const groupModalRef = useRef(null);

  const {
    data,
    loading,
    dividendCacheInfo,
    years,
    purchasedStockIds,
    stockListPriceMap,
    custodianMap,
  } = useDividendData({ dividendScope, setDividendScope, transactionHistory: effectiveTransactions, transactionHistoryLoaded });

  const [exploreScope, setExploreScope] = useState('all');
  const [hasVisitedExploreTab, setHasVisitedExploreTab] = useState(tab === 'dividend');

  useEffect(() => {
    if (tab === 'dividend') setHasVisitedExploreTab(true);
  }, [tab]);

  const {
    loading: exploreLoading,
    error: exploreError,
    dividendCacheInfo: exploreDividendCacheInfo,
    years: exploreYears,
    selectedYear: exploreSelectedYear,
    setSelectedYear: setExploreSelectedYear,
    filteredData: exploreFilteredData,
    stocks: exploreStocks,
    stockCurrencyMap: exploreStockCurrencyMap,
    stockOptions: exploreStockOptions,
    dividendTable: exploreDividendTable,
    availableCurrencies: exploreAvailableCurrencies,
    freqMap: exploreFreqMap,
    stockListPriceMap: exploreStockListPriceMap,
  } = useDividendData({
    dividendScope: exploreScope,
    setDividendScope: setExploreScope,
    transactionHistory,
    transactionHistoryLoaded,
    enabled: hasVisitedExploreTab,
  });

  // Calendar state
  const {
    showCalendar, setShowCalendar,
    calendarFilter, setCalendarFilter,
    calendarMonth, setCalendarMonth,
  } = useCalendarState();

  const [showDividendYield, setShowDividendYield] = useState(false);
  const [showPerYield, setShowPerYield] = useState(false);
  const [showInfoAxis, setShowInfoAxis] = useState(false);
  const displayMode = showDividendYield ? 'yield' : showPerYield ? 'perYield' : showInfoAxis ? 'info' : 'default';
  const handleDisplayModeChange = (mode) => {
    setShowDividendYield(mode === 'yield');
    setShowPerYield(mode === 'perYield');
    setShowInfoAxis(mode === 'info');
  };
  // Monthly income goal input
  const [monthlyIncomeGoal, setMonthlyIncomeGoal] = useState(DEFAULT_MONTHLY_GOAL);

    // Multi-select filters
    const [selectedStockIds, setSelectedStockIds] = useState([]);
    const [extraFilters, setExtraFilters] = useState({ minYield: '', freq: [], upcomingWithin: '', diamond: false, currencies: [] });

  // Display toggles
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showAllStocks, setShowAllStocks] = useState(false);

  // Theme
  const [theme, setTheme] = useState(() => {
    const stored = localStorage.getItem('theme');
    if (stored === 'light' || stored === 'dark') return stored;
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Follow OS theme changes only when user hasn't manually set a preference
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mq) return;
    const handler = (e) => {
      if (localStorage.getItem('theme')) return; // user has explicit preference
      setTheme(e.matches ? 'dark' : 'light');
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);


  // Language
  const [lang, setLang] = useState(getInitialLanguage);
  useEffect(() => {
    localStorage.setItem('lang', lang);
    document.documentElement.lang = lang === 'en' ? 'en' : 'zh-Hant';
  }, [lang]);
  const t = useMemo(() => (key) => translations[lang][key] || key, [lang]);

  // Dynamic document title
  useEffect(() => {
    document.title = lang === 'en'
      ? 'Dividend Life — ETF Dividend Calendar & Tracking | ETF Life'
      : 'Dividend Life — ETF 股息日曆與配息追蹤 | ETF Life';
  }, [lang]);

  // Sync tab with browser back/forward navigation
  useEffect(() => {
    const onPopState = () => setTabState(getTabFromHash());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
    // getTabFromHash reads window.location.hash at call time; register listener once only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keyboard shortcuts: T=inventory, D=dividend search, H=home
  useEffect(() => {
    const onKeyDown = (e) => {
      // Skip if focus is in an input, textarea, or select
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'T' || e.key === 't') setTab('inventory');
      else if (e.key === 'D' || e.key === 'd') setTab('dividend');
      else if (e.key === 'H' || e.key === 'h') setTab('home');
      // setTab already updates the hash via history.replaceState
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    // Clear any empty/stale dividend caches on startup
    clearEmptyDividendCaches();
    setTransactionHistory(readTransactionHistory());
    setTransactionHistoryLoaded(true);
  }, []);

  // Month value existence filters
  const [monthHasValue, setMonthHasValue] = useState(Array(12).fill(false));
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

  useFocusTrap(groupModalRef, showGroupModal);

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
  }, [showGroupModal, setShowGroupModal]);

  const handleDividendScopeChange = (scope) => {
    setExploreScope(scope);
    setShowAllStocks(false);
  };

  const langRef = useRef(lang);
  useEffect(() => { langRef.current = lang; }, [lang]);
  const showToastRef = useRef(showToast);
  useEffect(() => { showToastRef.current = showToast; }, [showToast]);

  useEffect(() => {
    setUpcomingAlerts(getTomorrowDividendAlerts(data));
  }, [data]);

  // Currency view hook
  const {
    viewMode,
    hasTwd,
    hasUsd,
    activeCurrencies,
    viewDescriptionContent,
    handleViewModeChange,
  } = useCurrencyView({ availableCurrencies: exploreAvailableCurrencies, lang });

  const viewLabelPrefix = lang === 'en' ? 'Showing:' : '顯示：';
  const purchasedScopeLabel = lang === 'en' ? 'Purchased ETFs' : '已購買 ETF';
  const allScopeLabel = lang === 'en' ? 'All ETFs' : '全部 ETF';
  const canSelectPurchased = purchasedStockIds.length > 0;

  const filteredStocks = useMemo(() => exploreStocks.filter(stock => {
    if (selectedStockIds.length && !selectedStockIds.includes(stock.stock_id)) return false;

    // Check if this is a purchased stock with no dividend data
    const isPurchasedStock = exploreScope === 'purchased' && purchasedStockIds.includes(stock.stock_id);
    const hasDividendData = Boolean(exploreDividendTable[stock.stock_id]);

    // Check if any month filter is active
    const hasMonthFilter = monthHasValue.some(v => v);

    // Show purchased stocks without dividend data only if no month filter is active
    if (isPurchasedStock && !hasDividendData) {
      return !hasMonthFilter;
    }

    if (viewMode !== 'BOTH') {
      const stockCurrencies = exploreStockCurrencyMap[stock.stock_id] || [];
      if (!stockCurrencies.includes(viewMode)) return false;
    }

    if (extraFilters.currencies.length) {
      const stockCurrencies = exploreStockCurrencyMap[stock.stock_id] || [];
      if (!extraFilters.currencies.some(currency => stockCurrencies.includes(currency))) return false;
    }

    for (let m = 0; m < 12; ++m) {
      if (!monthHasValue[m]) continue;
      const monthEntry = exploreDividendTable[stock.stock_id]?.[m];
      if (!monthEntry) return false;
      const currenciesToCheck = (extraFilters.currencies.length ? extraFilters.currencies : activeCurrencies);
      const hasMatch = currenciesToCheck.some(currency => Boolean(monthEntry?.[currency]));
      if (!hasMatch) return false;
    }

    if (extraFilters.freq.length || extraFilters.minYield || extraFilters.upcomingWithin) {
      const { freq: freqFilters, minYield, upcomingWithin } = extraFilters;
      if (freqFilters.length && !freqFilters.includes(exploreFreqMap[stock.stock_id])) return false;
      const currenciesToCheck = (extraFilters.currencies.length ? extraFilters.currencies : activeCurrencies);
      if (minYield) {
        let total = 0;
        let count = 0;
        for (let i = 0; i < 12; i++) {
          const monthEntry = exploreDividendTable[stock.stock_id]?.[i];
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
        const freq = [1, 2, 4, 6, 12, 52].includes(exploreFreqMap[stock.stock_id]) ? exploreFreqMap[stock.stock_id] : countForFreq;
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
            const monthEntry = exploreDividendTable[stock.stock_id]?.[i];
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
  }), [exploreStocks, selectedStockIds, exploreScope, purchasedStockIds, exploreDividendTable, monthHasValue, viewMode, exploreStockCurrencyMap, extraFilters, activeCurrencies, exploreFreqMap]);

  const maxYieldPerMonth = useMemo(() => {
    const currenciesForMax = exploreAvailableCurrencies.length > 0 ? exploreAvailableCurrencies : [DEFAULT_CURRENCY];
    const result = currenciesForMax.reduce((acc, currency) => {
      acc[currency] = Array(12).fill(0);
      return acc;
    }, {});
    filteredStocks.forEach(stock => {
      for (let m = 0; m < 12; m++) {
        const monthEntry = exploreDividendTable[stock.stock_id]?.[m];
        if (!monthEntry) continue;
        currenciesForMax.forEach(currency => {
          const cell = monthEntry?.[currency];
          const y = cell?.perYield || 0;
          if (y > (result[currency]?.[m] || 0)) {
            result[currency][m] = y;
          }
        });
      }
    });
    return result;
  }, [filteredStocks, exploreDividendTable, exploreAvailableCurrencies]);

  const displayStocks = useMemo(() => extraFilters.diamond
    ? filteredStocks.filter(stock => {
        for (let m = 0; m < 12; m++) {
          const monthEntry = exploreDividendTable[stock.stock_id]?.[m];
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
    : filteredStocks,
  [extraFilters.diamond, extraFilters.currencies, filteredStocks, exploreDividendTable, activeCurrencies, maxYieldPerMonth]);

  const {
    totalPerStock,
    yieldSum,
    yieldCount,
    latestPrice,
    latestYield,
    estAnnualYield,
    maxAnnualYield,
  } = useMemo(() => {
    const currenciesForTotals = exploreAvailableCurrencies.length > 0 ? exploreAvailableCurrencies : [DEFAULT_CURRENCY];
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
      // Only process data from dividendTable (which is already year-filtered)
      const stockTable = exploreDividendTable[stock.stock_id];
      if (!stockTable) return; // No dividend data for this stock in selected year
      for (let m = 0; m < 12; m++) {
        const monthEntry = stockTable[m];
        if (!monthEntry) continue;
        currenciesForTotals.forEach(currency => {
          const cell = monthEntry?.[currency];
          if (!cell) return;
          const dividendPerShare = Number(cell.dividend);
          const val = Number.isFinite(dividendPerShare) ? dividendPerShare * 1000 : 0;
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

    // Override latestPrice with up-to-date close price from stock list API when available
    displayStocks.forEach(stock => {
      const stockListPrice = exploreStockListPriceMap[stock.stock_id];
      if (stockListPrice != null) {
        latestPrice[stock.stock_id] = { ...latestPrice[stock.stock_id], price: stockListPrice };
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
        const freq = [1, 2, 4, 6, 12, 52].includes(exploreFreqMap[id]) ? exploreFreqMap[id] : count;
        const est = avgYield * freq;
        estAnnualYield[id][currency] = est;
        if (est > (maxAnnualYield[currency] || 0)) {
          maxAnnualYield[currency] = est;
        }
      });
    });

    return { totalPerStock, yieldSum, yieldCount, latestPrice, latestYield, estAnnualYield, maxAnnualYield };
  }, [displayStocks, exploreDividendTable, exploreAvailableCurrencies, exploreStockListPriceMap, exploreFreqMap]);

  // Prepare events for calendar view
  const calendarEvents = useMemo(() => exploreFilteredData
    .filter(item => {
      if (selectedStockIds.length && !selectedStockIds.includes(item.stock_id)) return false;
      const currency = item.currency || DEFAULT_CURRENCY;
      if (extraFilters.currencies.length && !extraFilters.currencies.includes(currency)) return false;
      if (!activeCurrencies.includes(currency)) return false;
      return true;
    })
    .flatMap(item => {
      const amount = parseFloat(item.dividend);
      // parseFloat (not Number) — Number(null) is 0, which would make a
      // genuinely missing yield look "valid" here. Mirrors the
      // proven-correct sibling pattern in UserDividendsTab.jsx.
      const yieldValueRaw = parseFloat(item.dividend_yield);
      const hasRawYield = item.dividend_yield !== undefined && item.dividend_yield !== null && `${item.dividend_yield}`.trim() !== '';
      const hasValidYield = Number.isFinite(yieldValueRaw);
      const hasPendingYield = !hasValidYield && hasRawYield;
      const dividend_yield = hasValidYield ? yieldValueRaw : null;
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
          hasValidYield,
          hasPendingYield,
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
          hasValidYield,
          hasPendingYield,
          last_close_price: item.last_close_price,
          dividend_date: item.dividend_date,
          payment_date: item.payment_date,
          currency,
        });
      }
      return arr;
    }),
  [exploreFilteredData, selectedStockIds, extraFilters.currencies, activeCurrencies]);

  const filteredCalendarEvents = useMemo(() => calendarEvents.filter(ev =>
    calendarFilter === 'both' || ev.type === calendarFilter
  ), [calendarEvents, calendarFilter]);


  return (
    <ToastProvider>
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      <a href="#tab-content" className="skip-link">{lang === 'en' ? 'Skip to content' : '跳至主要內容'}</a>
      <PageContainer
        wide
        heading={(
          <h1 className="sr-only">Dividend Life — {lang === 'en' ? 'ETF Dividend Calendar & Tracking' : 'ETF 股息日曆與配息追蹤'}</h1>
        )}
        navigation={(
          <ExperienceNavigation
            current="dividend-life"
            homeHref={homeHref}
            homeNavigation={homeNavigation}
            theme={theme}
          />
        )}
        footer={(
          <Footer
            theme={theme}
            setTheme={setTheme}
            lang={lang}
            setLang={setLang}
            t={t}
            translations={translations}
          />
        )}
        overlay={<Suspense><NLHelper /></Suspense>}
      >
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
          <div className="dividend-alert" role="status" aria-live="polite" aria-atomic="false">
            {upcomingAlerts.filter(a => !dismissedAlerts.includes(`${a.stock_id}-${a.type}-${a.date}`)).map(a => {
              const key = `${a.stock_id}-${a.type}-${a.date}`;
              const dateLabel = a.date.split('-').slice(1).map(Number).join('/');
              const countdownZh = a.daysUntil === 0 ? '今天' : a.daysUntil === 1 ? '明天' : `還有 ${a.daysUntil} 天`;
              const countdownEn = a.daysUntil === 0 ? 'today' : a.daysUntil === 1 ? 'tomorrow' : `in ${a.daysUntil} days`;
              const keywordColor = a.type === 'ex' ? '#ff8fa3' : '#2f9e44';
              const bank = custodianMap[a.stock_id];
              return (
                <div key={key} className="dividend-alert__item">
                  <span className="dividend-alert__text">
                    {lang === 'en'
                      ? <>{a.stock_id} {a.stock_name} will <span style={{ color: keywordColor }}>{a.type === 'ex' ? 'go ex-dividend' : 'pay dividend'}</span> {countdownEn} ({dateLabel}). {a.dividend} per share, estimated {Math.round(a.total).toLocaleString()}{bank && <span className="dividend-alert__bank"> · Custodian: {bank}</span>}</>
                      : <>{a.stock_id} {a.stock_name}將於{countdownZh}（{dateLabel}）<span style={{ color: keywordColor }}>{a.type === 'ex' ? '除息' : '配息'}</span>，每股 {a.dividend} 元，預估領取 {Math.round(a.total).toLocaleString()} 元{bank && <span className="dividend-alert__bank"> · 保管銀行：{bank}</span>}</>
                    }
                  </span>
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
          <DemoModeBanner isVisible={demoMode} onExit={handleExitDemo} t={t} />
          <div id="tab-content">
          {tab === 'home' && (
            <div id="panel-home" role="tabpanel" aria-labelledby="tab-home">
              <ErrorBoundary lang={lang}><Suspense><HomeTab
                dividendData={data}
                dividendLoading={loading}
                onNavigateToInventory={() => setTab('inventory')}
                onImportClick={handleRequestImport}
                transactionsOverride={demoTransactionsOverride}
                isDemoMode={demoMode}
                onEnterDemo={handleEnterDemo}
                onExitDemo={handleExitDemo}
              /></Suspense></ErrorBoundary>
            </div>
          )}
          {tab === 'dividend' && (
            <div id="panel-dividend" role="tabpanel" aria-labelledby="tab-dividend" className="dividend-tab">
              <ErrorBoundary lang={lang}>
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
                      value={exploreSelectedYear}
                      onChange={e => setExploreSelectedYear(Number(e.target.value))}
                    >
                      {exploreYears.map(year => (
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
                        className={`filter-bar__pill${exploreScope === 'purchased' ? ' filter-bar__pill--active' : ''}`}
                        onClick={() => handleDividendScopeChange('purchased')}
                        disabled={!canSelectPurchased}
                        aria-pressed={exploreScope === 'purchased'}
                      >
                        {purchasedScopeLabel}
                      </button>
                      <button
                        type="button"
                        className={`filter-bar__pill${exploreScope === 'all' ? ' filter-bar__pill--active' : ''}`}
                        onClick={() => handleDividendScopeChange('all')}
                        aria-pressed={exploreScope === 'all'}
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

                  <label className="filter-bar__display-label">
                    {lang === 'en' ? 'Display:' : '顯示：'}
                    <DisplayDropdown
                      displayMode={displayMode}
                      onModeChange={handleDisplayModeChange}
                    />
                  </label>

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
                        availableCurrencies={exploreAvailableCurrencies}
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

                  {exploreDividendCacheInfo && (() => {
                    const ts = exploreDividendCacheInfo.timestamp ? new Date(exploreDividendCacheInfo.timestamp) : null;
                    const minutesAgo = ts ? Math.floor((Date.now() - ts.getTime()) / 60000) : null;
                    const freshness = minutesAgo === null ? null
                      : minutesAgo < 60 ? 'fresh'
                      : minutesAgo < 360 ? 'stale'
                      : 'old';
                    const freshnessIcon = freshness === 'fresh' ? '🟢' : freshness === 'stale' ? '🟡' : '🔴';
                    const timeLabel = minutesAgo === null ? exploreDividendCacheInfo.cacheStatus
                      : minutesAgo < 1 ? (lang === 'en' ? 'just now' : '剛剛更新')
                      : minutesAgo < 60 ? (lang === 'en' ? `${minutesAgo}m ago` : `${minutesAgo} 分鐘前更新`)
                      : (lang === 'en' ? `${Math.floor(minutesAgo / 60)}h ago` : `${Math.floor(minutesAgo / 60)} 小時前更新`);
                    return (
                      <span className={`filter-bar__cache-info filter-bar__cache-info--${freshness || 'unknown'}`} title={ts ? ts.toLocaleString() : undefined}>
                        {freshnessIcon} {timeLabel}
                      </span>
                    );
                  })()}
                </div>
              </div>

              {/* ── CALENDAR PANEL ── */}
              {showCalendar && !exploreLoading && !exploreError && (
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
                    year={exploreSelectedYear}
                    events={filteredCalendarEvents}
                    showTotals={false}
                    receivableAsPerShare
                    availableYears={exploreYears}
                    onYearChange={setExploreSelectedYear}
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
              {exploreLoading ? (
                <div className="table-skeleton" role="status" aria-live="polite" aria-label={lang === 'en' ? 'Loading…' : '載入中…'}>
                  {Array.from({ length: 7 }, (_, i) => (
                    <div key={i} className="table-skeleton__row">
                      <div className="skeleton-line table-skeleton__cell table-skeleton__cell--id" />
                      <div className="skeleton-line table-skeleton__cell" />
                      <div className="skeleton-line table-skeleton__cell" />
                      <div className="skeleton-line table-skeleton__cell" />
                      <div className="skeleton-line table-skeleton__cell table-skeleton__cell--wide" />
                    </div>
                  ))}
                </div>
              ) : exploreError ? (
                <p className="dividend-tab__status dividend-tab__status--error" role="alert">
                  {lang === 'en' ? 'Error: ' : '錯誤：'}{exploreError.message}
                </p>
              ) : (
                <StockTable
                  stocks={displayStocks}
                  dividendTable={exploreDividendTable}
                  totalPerStock={totalPerStock}
                  yieldSum={yieldSum}
                  yieldCount={yieldCount}
                  latestPrice={latestPrice}
                  latestYield={latestYield}
                  estAnnualYield={estAnnualYield}
                  maxAnnualYield={maxAnnualYield}
                  maxYieldPerMonth={maxYieldPerMonth}
                  stockOptions={exploreStockOptions}
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
                  freqMap={exploreFreqMap}
                  activeCurrencies={activeCurrencies}
                />
              )}
              </ErrorBoundary>
            </div>
          )}
        {tab === 'inventory' && (
          <div id="panel-inventory" role="tabpanel" aria-labelledby="tab-inventory">
            <ErrorBoundary lang={lang}>
              <Suspense>
                <InventoryTab
                  allDividendData={data}
                  dividendCacheInfo={dividendCacheInfo}
                  stockListPriceMap={stockListPriceMap}
                  transactionsOverride={demoTransactionsOverride}
                  isDemoMode={demoMode}
                  focusImportControl={importFocusRequested}
                  onImportFocusHandled={handleImportFocusHandled}
                />
              </Suspense>
            </ErrorBoundary>
          </div>
        )}
        {tab === 'mydividend' && (
          <div id="panel-mydividend" role="tabpanel" aria-labelledby="tab-mydividend">
            <ErrorBoundary lang={lang}>
              <Suspense>
                <UserDividendsTab
                  allDividendData={data}
                  availableYears={years}
                  transactionsOverride={demoTransactionsOverride}
                  onAddFirstClick={() => setTab('inventory')}
                  onImportClick={handleRequestImport}
                />
              </Suspense>
            </ErrorBoundary>
          </div>
        )}
        {tab === 'about' && (
          <div id="panel-about" role="tabpanel" aria-labelledby="tab-about">
            <Suspense><AboutTab /></Suspense>
          </div>
        )}
          </div>{/* #tab-content */}
        {showGroupModal && (
          <div className="modal-overlay" role="presentation">
            <div className="custom-modal" role="dialog" aria-modal="true" aria-labelledby="watch-group-modal-title" ref={groupModalRef}>
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
      </PageContainer>
    </LanguageContext.Provider>
    </ToastProvider>
  );
}

export default DividendLifePage;
