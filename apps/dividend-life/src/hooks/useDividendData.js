import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { fetchDividendsByYears } from '../dividendApi';
import { fetchStockList } from '../stockApi';
import { summarizeInventory, getPurchasedStockIds } from '../utils/inventoryUtils';
import { DEFAULT_CURRENCY, normalizeCurrency } from '../utils/currencyUtils';
import { DIVIDEND_YEARS, CURRENT_YEAR } from '../utils/dividendGoalUtils';
import useEffectOnce from './useEffectOnce';

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

export default function useDividendData({
  dividendScope,
  setDividendScope,
  transactionHistory,
  transactionHistoryLoaded,
  enabled = true,
}) {
  const [data, setData] = useState([]);
  const [years, setYears] = useState(DIVIDEND_YEARS);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dividendCacheInfo, setDividendCacheInfo] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [freqMap, setFreqMap] = useState({});
  const [stockListPriceMap, setStockListPriceMap] = useState({});
  const [custodianMap, setCustodianMap] = useState({});

  const fetchSkipRef = useRef(new Map());
  const lastFetchedAt = useRef(0);
  const selectedYearRef = useRef(selectedYear);

  useEffect(() => {
    selectedYearRef.current = selectedYear;
  }, [selectedYear]);

  const purchasedStockIds = useMemo(() => {
    return getPurchasedStockIds(transactionHistory);
  }, [transactionHistory]);

  useEffect(() => {
    if (!transactionHistoryLoaded) return;
    if (dividendScope !== 'purchased') return;
    if (purchasedStockIds.length > 0) return;
    if (transactionHistory.length === 0) return;
    setDividendScope('all');
  }, [dividendScope, purchasedStockIds.length, transactionHistoryLoaded, transactionHistory.length, setDividendScope]);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    if (!transactionHistoryLoaded) {
      return;
    }

    const hasPurchasedIds = purchasedStockIds.length > 0;
    const usePurchasedScope = dividendScope === 'purchased' && hasPurchasedIds;
    const stockIdsParam = usePurchasedScope ? purchasedStockIds : 'all';
    const idsKey = usePurchasedScope
      ? purchasedStockIds.join(',')
      : 'all';
    // Fetch all DIVIDEND_YEARS at once, not just selectedYear
    const yearsKey = DIVIDEND_YEARS.join(',');
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
      const yearList = Array.from(new Set([...DIVIDEND_YEARS, ...availableYearSet])).sort((a, b) => b - a);
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
        // Fetch all DIVIDEND_YEARS to get cross-year dividend data
        const { data: dividendData, meta } = await fetchDividendsByYears(DIVIDEND_YEARS, undefined, {
          stockIds: stockIdsParam,
          forceRefresh: dividendScope === 'purchased',
          fields: REQUIRED_DIVIDEND_FIELDS,
        });
        applyDividendResponse(dividendData, meta);
      } catch (fetchError) {
        if (cancelled) return;
        applyDividendResponse([], null);
        setError(fetchError);
      } finally {
        if (!cancelled) {
          setLoading(false);
          lastFetchedAt.current = Date.now();
        }
        skipMap.set(signature, false);
      }
    };

    load();

    return () => {
      cancelled = true;
      skipMap.set(signature, false);
    };
  }, [enabled, dividendScope, purchasedStockIds, transactionHistoryLoaded, refreshTrigger]);

  const loadStockList = useCallback(() => {
    const freqMapRaw = { '年配': 1, '半年配': 2, '季配': 4, '雙月配': 6, '月配': 12, '週配': 52 };
    return fetchStockList()
      .then(({ list }) => {
        const map = {};
        const priceMap = {};
        const custMap = {};
        list.forEach(s => {
          map[s.stock_id] = freqMapRaw[s.dividend_frequency] || null;
          if (s.latest_close_price != null) {
            priceMap[s.stock_id] = s.latest_close_price;
          }
          if (s.custodian) {
            custMap[s.stock_id] = s.custodian;
          }
        });
        setFreqMap(map);
        setStockListPriceMap(priceMap);
        setCustodianMap(custMap);
      });
  }, []);

  useEffect(() => {
    const STALE_THRESHOLD = 30 * 60 * 1000; // 30 minutes
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        const age = Date.now() - lastFetchedAt.current;
        if (age > STALE_THRESHOLD) {
          setRefreshTrigger(n => n + 1);
          loadStockList().catch(() => {});
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [loadStockList]);

  useEffectOnce(() => {
    let cancelled = false;

    loadStockList().catch(() => {
      if (!cancelled) setFreqMap({});
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
        entries: [],
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

      cell.entries.push({
        dividend: Number.isFinite(dividendValue) ? dividendValue : null,
        dividend_yield: Number.isFinite(yieldValue) ? yieldValue : null,
        dividend_date: item.dividend_date || null,
        payment_date: item.payment_date || null,
        last_close_price: item.last_close_price ?? null,
      });

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

  return {
    data,
    loading,
    error,
    dividendCacheInfo,
    years,
    selectedYear,
    setSelectedYear,
    purchasedStockIds,
    filteredData,
    stocks,
    stockCurrencyMap,
    stockOptions,
    dividendTable,
    availableCurrencies,
    freqMap,
    stockListPriceMap,
    custodianMap,
  };
}
