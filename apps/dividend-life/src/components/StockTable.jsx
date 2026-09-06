import { memo, useState, useMemo, useRef, useEffect, useCallback, useDeferredValue } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import FilterDropdown from './FilterDropdown';
import TooltipText from './TooltipText';
import { HOST_URL } from '../../config';
import { useLanguage } from '../i18n';
import usePreserveScroll from '../hooks/usePreserveScroll';
import { getDividendCellDisplay } from '../utils/dividendCellFormat';

const NUM_COL_WIDTH = 90;
const DEFAULT_VISIBLE_COUNT = 20;
const SHOW_MORE_BATCH = 50;
const DEFAULT_ROW_ESTIMATE = 64;
const VIRTUAL_OVERSCAN = 10;
const VIRTUAL_MAX_HEIGHT = '70vh';

const currencyLabelFor = (currency) => (currency === 'USD' ? 'US$' : 'NT$');
const currencyUnitZhFor = (currency) => (currency === 'USD' ? '美元' : '元');

function buildTotalsContent({
  stock,
  activeCurrencies,
  totalPerStock,
  yieldSum,
  estAnnualYield,
  maxAnnualYield,
  showDividendYield,
  lang,
  t,
  labeled = false,
}) {
  return activeCurrencies
    .map(currency => {
      const total = totalPerStock[stock.stock_id]?.[currency] || 0;
      const yieldAccumulated = yieldSum[stock.stock_id]?.[currency] || 0;
      const annual = estAnnualYield[stock.stock_id]?.[currency] || 0;
      if (showDividendYield) {
        if (yieldAccumulated <= 0) return null;
        return (
          <div key={`${stock.stock_id}-total-${currency}`}>
            {labeled && <span className="total-cell-label">{t('accumulated_yield')}: </span>}
            {currencyLabelFor(currency)} {yieldAccumulated.toFixed(1)}%
          </div>
        );
      }
      if (total <= 0 && annual <= 0) return null;
      const currencyAnnualMax = maxAnnualYield[currency] || 0;
      const shouldShowCrown =
        annual > 0 &&
        (currencyAnnualMax > 0
          ? Math.abs(annual - currencyAnnualMax) < 1e-6
          : true);
      const tooltipText = shouldShowCrown
        ? (lang === 'zh'
            ? `目前已累積殖利率: ${yieldAccumulated.toFixed(1)}%\n${t('high_yield_disclaimer')}`
            : `Accumulated yield so far: ${yieldAccumulated.toFixed(1)}%\n${t('high_yield_disclaimer')}`)
        : (lang === 'zh'
            ? `目前已累積殖利率: ${yieldAccumulated.toFixed(1)}%`
            : `Accumulated yield so far: ${yieldAccumulated.toFixed(1)}%`);
      const annualContent = annual > 0 ? (
        <TooltipText tooltip={tooltipText}>
          {annual.toFixed(1)}%
          {shouldShowCrown && (
            <span className="high-yield-badge">{t('high_yield_badge')}</span>
          )}
        </TooltipText>
      ) : null;
      return (
        <div
          key={`${stock.stock_id}-total-${currency}`}
          className="total-cell-row"
        >
          <span>
            {labeled && <span className="total-cell-label">{t('total_received')}: </span>}
            {`${currencyLabelFor(currency)}${currency === 'USD' ? total.toFixed(2) : Math.round(total)}`}
          </span>
          {annualContent && (
            <span>
              / {labeled && <span className="total-cell-label">{t('full_year_estimated_yield')}: </span>}
              {annualContent}
            </span>
          )}
        </div>
      );
    })
    .filter(Boolean);
}

export default function StockTable({
  stocks,
  dividendTable,
  totalPerStock,
  yieldSum,
  yieldCount,
  latestPrice,
  latestYield,
  estAnnualYield,
  maxAnnualYield,
  maxYieldPerMonth,
  stockOptions,
  selectedStockIds,
  setSelectedStockIds,
  monthHasValue,
  setMonthHasValue,
  showDividendYield,
  showPerYield,
  currentMonth,
  monthlyIncomeGoal,
  showAllStocks,
  setShowAllStocks,
  showInfoAxis,
  getIncomeGoalInfo,
  freqMap,
  activeCurrencies
}) {
  const [sortConfig, setSortConfig] = useState({ column: 'stock_id', direction: 'asc' });
  const [showIdDropdown, setShowIdDropdown] = useState(false);
  const [idDropdownPosition, setIdDropdownPosition] = useState(null);
  const [visibleCount, setVisibleCount] = useState(DEFAULT_VISIBLE_COUNT);
  const [expandMonths, setExpandMonths] = useState(false);
  const [showRecentMonths, setShowRecentMonths] = useState(false);
  const [isCardViewport, setIsCardViewport] = useState(
    () => typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(max-width: 720px)').matches
      : false
  );

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;
    const mq = window.matchMedia('(max-width: 720px)');
    const handleChange = (event) => setIsCardViewport(event.matches);
    mq.addEventListener('change', handleChange);
    return () => mq.removeEventListener('change', handleChange);
  }, []);
  const tableContainerRef = useRef(null);
  const idFilterButtonRef = useRef(null);
  const { lang, t } = useLanguage();
  const MONTHS = useMemo(
    () =>
      lang === 'zh'
        ? ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
        : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    [lang]
  );
  const freqNameMap = useMemo(
    () =>
      lang === 'zh'
        ? { 1: '年配', 2: '半年配', 4: '季配', 6: '雙月配', 12: '月配', 52: '週配' }
        : { 1: 'Annual', 2: 'Semi-annual', 4: 'Quarterly', 6: 'Bimonthly', 12: 'Monthly', 52: 'Weekly' },
    [lang]
  );
  // Default: current month only. "Show recent 3 months" adds the prior 2.
  // "Expand all months" (unchanged, pre-existing feature) shows the full year.
  const visibleMonthIndices = useMemo(() => {
    if (expandMonths) return Array.from({ length: 12 }, (_, i) => i);
    if (showRecentMonths) {
      const indices = [];
      for (let offset = -2; offset <= 0; offset++) {
        indices.push(((currentMonth + offset) + 12) % 12);
      }
      return indices.sort((a, b) => a - b);
    }
    return [currentMonth];
  }, [expandMonths, showRecentMonths, currentMonth]);

  usePreserveScroll(tableContainerRef, 'stockTableScrollLeft', [showInfoAxis]);

  const handleSort = (column) => {
    setSortConfig(prev => {
      if (prev.column === column) {
        return { column, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { column, direction: 'asc' };
    });
  };

  const getTotalForStock = useCallback((stockId) => {
    return activeCurrencies.reduce((sum, currency) => {
      return sum + (totalPerStock[stockId]?.[currency] || 0);
    }, 0);
  }, [activeCurrencies, totalPerStock]);

  const getYieldSumForStock = useCallback((stockId) => {
    return activeCurrencies.reduce((sum, currency) => {
      return sum + (yieldSum[stockId]?.[currency] || 0);
    }, 0);
  }, [activeCurrencies, yieldSum]);

  const getAnnualYieldForStock = useCallback((stockId) => {
    return activeCurrencies.reduce((sum, currency) => {
      return sum + (estAnnualYield[stockId]?.[currency] || 0);
    }, 0);
  }, [activeCurrencies, estAnnualYield]);

  const getMonthValue = useCallback((stockId, idx, currencyKey = null) => {
    if (currencyKey) {
      const cell = dividendTable[stockId]?.[idx]?.[currencyKey];
      if (!cell) return 0;
      if (showPerYield) {
        return parseFloat(cell.perYield) || 0;
      }
      if (showDividendYield) {
        return parseFloat(cell.dividend_yield) || 0;
      }
      return Number(cell.dividend) || 0;
    }
    return activeCurrencies.reduce((sum, currency) => {
      const cell = dividendTable[stockId]?.[idx]?.[currency];
      if (!cell) return sum;
      if (showPerYield) {
        return sum + (parseFloat(cell.perYield) || 0);
      }
      if (showDividendYield) {
        return sum + (parseFloat(cell.dividend_yield) || 0);
      }
      return sum + (Number(cell.dividend) || 0);
    }, 0);
  }, [activeCurrencies, dividendTable, showDividendYield, showPerYield]);

  // Always the per-month-normalized perYield, independent of the current
  // display mode -- used by the mobile card to show this payment's
  // annualized yield alongside whatever the main value is showing, and by
  // the annualized-yield sort option. With no currencyKey, sums across
  // activeCurrencies (mirrors getMonthValue's no-currencyKey behavior).
  const getMonthPerYield = useCallback((stockId, idx, currencyKey = null) => {
    if (currencyKey) {
      const cell = dividendTable[stockId]?.[idx]?.[currencyKey];
      return cell ? (parseFloat(cell.perYield) || 0) : 0;
    }
    return activeCurrencies.reduce((sum, currency) => {
      const cell = dividendTable[stockId]?.[idx]?.[currency];
      return sum + (cell ? (parseFloat(cell.perYield) || 0) : 0);
    }, 0);
  }, [activeCurrencies, dividendTable]);

  const deferredStocks = useDeferredValue(stocks);

  const sortedStocks = useMemo(() => {
    const source = Array.isArray(deferredStocks) ? deferredStocks : [];
    const dir = sortConfig.direction === 'asc' ? 1 : -1;
    return [...source].sort((a, b) => {
      switch (sortConfig.column) {
        case 'stock_id':
          return a.stock_id.localeCompare(b.stock_id) * dir;
        case 'stock_name':
          return a.stock_name.localeCompare(b.stock_name) * dir;
        case 'latest_price': {
          const aPrice = parseFloat(latestPrice[a.stock_id]?.price) || 0;
          const bPrice = parseFloat(latestPrice[b.stock_id]?.price) || 0;
          return (aPrice - bPrice) * dir;
        }
        case 'total': {
          const aTotal = showDividendYield ? getYieldSumForStock(a.stock_id) : getTotalForStock(a.stock_id);
          const bTotal = showDividendYield ? getYieldSumForStock(b.stock_id) : getTotalForStock(b.stock_id);
          return (aTotal - bTotal) * dir;
        }
        case 'annual_yield': {
          const aYield = getAnnualYieldForStock(a.stock_id);
          const bYield = getAnnualYieldForStock(b.stock_id);
          return (aYield - bYield) * dir;
        }
        case 'annualized_yield': {
          const aYield = getMonthPerYield(a.stock_id, currentMonth) * 12;
          const bYield = getMonthPerYield(b.stock_id, currentMonth) * 12;
          return (aYield - bYield) * dir;
        }
        default: {
          if (sortConfig.column?.startsWith('month')) {
            const [monthPart, currencyPart] = sortConfig.column.split(':');
            const idx = Number(monthPart.slice(5));
            const currency = currencyPart || null;
            const aVal = getMonthValue(a.stock_id, idx, currency);
            const bVal = getMonthValue(b.stock_id, idx, currency);
            return (aVal - bVal) * dir;
          }
          return 0;
        }
      }
    });
  }, [deferredStocks, sortConfig, showDividendYield, latestPrice, getYieldSumForStock, getTotalForStock, getAnnualYieldForStock, getMonthValue, getMonthPerYield, currentMonth]);

  const totalStocksCount = sortedStocks.length;
  const visibleLimit = showAllStocks
    ? totalStocksCount
    : Math.min(visibleCount, totalStocksCount || 0) || 0;
  const limitedStocks = useMemo(() => {
    if (!visibleLimit) return [];
    return sortedStocks.slice(0, visibleLimit);
  }, [sortedStocks, visibleLimit]);
  const hasExtraRows = totalStocksCount > DEFAULT_VISIBLE_COUNT;
  const shouldVirtualizeMain = showAllStocks && !showInfoAxis;

  const monthCellCache = useMemo(() => {
    const cache = new Map();
    const monthsLength = MONTHS.length;
    limitedStocks.forEach(stock => {
      const stockTable = dividendTable?.[stock.stock_id] || [];
      const monthEntries = Array.from({ length: monthsLength }, (_, monthIndex) => {
        const monthData = stockTable?.[monthIndex];
        return activeCurrencies.map(currency => monthData?.[currency] ?? null);
      });
      cache.set(stock.stock_id, monthEntries);
    });
    return cache;
  }, [limitedStocks, dividendTable, activeCurrencies, MONTHS]);

  const handleShowMoreClick = useCallback(() => {
    if (!hasExtraRows) return;
    if (showAllStocks) {
      setShowAllStocks(false);
      setVisibleCount(DEFAULT_VISIBLE_COUNT);
      return;
    }
    const nextCount = Math.min(visibleCount + SHOW_MORE_BATCH, totalStocksCount);
    if (nextCount >= totalStocksCount) {
      setShowAllStocks(true);
    }
    setVisibleCount(nextCount);
  }, [hasExtraRows, showAllStocks, visibleCount, totalStocksCount, setShowAllStocks]);

  const showMoreLabel = showAllStocks ? `${t('hide')}-` : `${t('more')}+`;

  const rowVirtualizer = useVirtualizer({
    count: limitedStocks.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => DEFAULT_ROW_ESTIMATE,
    overscan: VIRTUAL_OVERSCAN
  });

  const virtualRows = shouldVirtualizeMain ? rowVirtualizer.getVirtualItems() : [];
  const virtualPaddingTop = shouldVirtualizeMain && virtualRows.length ? virtualRows[0].start : 0;
  const virtualPaddingBottom = shouldVirtualizeMain && virtualRows.length
    ? rowVirtualizer.getTotalSize() - virtualRows[virtualRows.length - 1].end
    : 0;
  const mainColumnCount = 2 + (MONTHS.length * activeCurrencies.length) + 1;
  const tableScrollStyle = shouldVirtualizeMain
    ? { maxHeight: VIRTUAL_MAX_HEIGHT, overflowY: 'auto' }
    : undefined;

  const renderVirtualPaddingRow = (height, position) => {
    if (!height) return null;
    return (
      <tr aria-hidden key={`virtual-padding-${position}`}>
        <td
          colSpan={mainColumnCount}
          style={{
            height: `${height}px`,
            padding: 0,
            border: 'none'
          }}
        />
      </tr>
    );
  };

  const updateIdDropdownPosition = useCallback(() => {
    if (!showIdDropdown) return;
    if (!idFilterButtonRef.current) return;
    if (typeof window === 'undefined') return;

    const rect = idFilterButtonRef.current.getBoundingClientRect();
    const scrollX = window.scrollX ?? window.pageXOffset ?? 0;
    const scrollY = window.scrollY ?? window.pageYOffset ?? 0;
    const dropdownWidth = 260;
    const viewportRight = scrollX + window.innerWidth;
    const horizontalPadding = 16;

    let left = rect.left + scrollX;
    if (left + dropdownWidth > viewportRight - horizontalPadding) {
      left = Math.max(scrollX + horizontalPadding, viewportRight - dropdownWidth - horizontalPadding);
    }

    const verticalOffset = 8;
    const top = rect.bottom + scrollY + verticalOffset;

    setIdDropdownPosition({ top, left });
  }, [showIdDropdown]);

  useEffect(() => {
    if (!showIdDropdown) return;
    if (typeof window === 'undefined') return;

    const handleReposition = () => updateIdDropdownPosition();

    updateIdDropdownPosition();

    window.addEventListener('scroll', handleReposition, true);
    window.addEventListener('resize', handleReposition);
    const containerEl = tableContainerRef.current;
    containerEl?.addEventListener('scroll', handleReposition);

    return () => {
      window.removeEventListener('scroll', handleReposition, true);
      window.removeEventListener('resize', handleReposition);
      containerEl?.removeEventListener('scroll', handleReposition);
    };
  }, [showIdDropdown, updateIdDropdownPosition]);

  useEffect(() => {
    if (!showIdDropdown) {
      setIdDropdownPosition(null);
    }
  }, [showIdDropdown]);

  const displayModeLabel = useMemo(() => {
    if (showPerYield) {
      return lang === 'zh' ? '月平均殖利率' : 'Monthly Avg Yield';
    }
    if (showDividendYield) {
      return lang === 'zh' ? '殖利率' : 'Yield';
    }
    return lang === 'zh' ? '配息' : 'Dividends';
  }, [showPerYield, showDividendYield, lang]);

  if (showInfoAxis) {
    return (
      <>
        <div className="display-mode-indicator">
          {lang === 'zh' ? '顯示模式' : 'Display Mode'}: <strong>{lang === 'zh' ? '資訊' : 'Info'}</strong>
        </div>
        <div className="table-responsive" ref={tableContainerRef}>
          <table className="table table-bordered table-striped" aria-label={lang === 'en' ? 'ETF info' : 'ETF 資訊'}>
          <thead>
            <tr>
              <th scope="col" className="stock-col">{t('stock_code_name')}</th>
              <th scope="col">{t('latest_price')}</th>
              <th scope="col">{t('dividend_total')}</th>
              <th scope="col">{t('current_yield')}</th>
              <th scope="col">{t('average_yield')}</th>
              <th scope="col">{lang === 'zh' ? `月報酬${monthlyIncomeGoal.toLocaleString()}需張數` : `Lots for ${monthlyIncomeGoal.toLocaleString()} monthly income`}</th>
              <th scope="col">{lang === 'zh' ? `月報酬${monthlyIncomeGoal.toLocaleString()}需成本` : `Cost for ${monthlyIncomeGoal.toLocaleString()} monthly income`}</th>
            </tr>
          </thead>
          <tbody>
            {limitedStocks.map(stock => {
              const price = latestPrice[stock.stock_id]?.price;
              const dividendTotal = getTotalForStock(stock.stock_id);
              const totalYieldSum = activeCurrencies.reduce((sum, currency) => sum + (yieldSum[stock.stock_id]?.[currency] || 0), 0);
              const totalYieldCount = activeCurrencies.reduce((sum, currency) => sum + (yieldCount[stock.stock_id]?.[currency] || 0), 0);
              const avgYield = totalYieldCount > 0 ? (totalYieldSum / totalYieldCount) : 0;
              let lotsNeeded = '';
              let cost = '';
              if (price && dividendTotal > 0) {
                const lots = Math.ceil((monthlyIncomeGoal * 12) / (dividendTotal * 1000));
                lotsNeeded = lots;
                cost = Math.round(lots * 1000 * price).toLocaleString();
              }
              const lastYield = latestYield[stock.stock_id]?.yield;
              return (
                <tr key={stock.stock_id + stock.stock_name}>
                  <td className="stock-col">
                    <a href={`${HOST_URL}/stock/${stock.stock_id}`} target="_blank" rel="noreferrer"
                      aria-label={`${stock.stock_id} ${stock.stock_name} (${lang === 'en' ? 'opens in new tab' : '開啟新分頁'})`}>
                      <TooltipText tooltip={stock.stock_name}>
                          {stock.stock_id}
                      </TooltipText>
                    </a>
                  </td>
                  <td>{price ?? ''}</td>
                  <td>{dividendTotal > 0 ? dividendTotal.toFixed(3) : ''}</td>
                  <td>{lastYield > 0 ? `${lastYield.toFixed(1)}%` : ''}</td>
                  <td>{avgYield > 0 ? `${avgYield.toFixed(1)}%` : ''}</td>
                  <td>{lotsNeeded}</td>
                  <td>{cost && (lang === 'en' ? `NT$${cost}` : `${cost}元`)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
        {hasExtraRows && (
          <div className="table-more-btn-wrapper">
            <button
              type="button"
              className="more-btn"
              onClick={handleShowMoreClick}
            >
              {showMoreLabel}
            </button>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <div className="display-mode-indicator">
        {lang === 'zh' ? '顯示模式' : 'Display Mode'}: <strong>{displayModeLabel}</strong>
        {!expandMonths && (
          <button
            type="button"
            className="month-expand-btn"
            onClick={() => setShowRecentMonths(v => !v)}
            aria-pressed={showRecentMonths}
            aria-label={showRecentMonths
              ? (lang === 'zh' ? '收合為本月' : 'Collapse to current month')
              : (lang === 'zh' ? '顯示近3月比較' : 'Show recent 3 months')}
          >
            {showRecentMonths
              ? (lang === 'zh' ? '收合為本月 ▲' : 'Collapse ▲')
              : (lang === 'zh' ? '顯示近3月比較 ▼' : 'Show recent 3 months ▼')}
          </button>
        )}
        <button
          type="button"
          className="month-expand-btn"
          onClick={() => setExpandMonths(v => !v)}
          aria-pressed={expandMonths}
          aria-label={expandMonths
            ? (lang === 'zh' ? '收合月份欄' : 'Collapse months')
            : (lang === 'zh' ? '展開全部月份' : 'Expand all months')}
        >
          {expandMonths
            ? (lang === 'zh' ? '收合月份 ▲' : 'Collapse ▲')
            : (lang === 'zh' ? '展開全部月份 ▼' : 'Expand all months ▼')}
        </button>
      </div>
      {stocks.length === 0 ? (
        <div className="stock-table-empty">
          <div className="stock-table-empty__icon" aria-hidden="true">📊</div>
          <p className="stock-table-empty__msg">
            {lang === 'zh' ? '沒有符合條件的股票' : 'No matching stocks'}
          </p>
          <p className="stock-table-empty__hint">
            {lang === 'zh' ? '請調整篩選條件或重置篩選' : 'Try adjusting or resetting your filters'}
          </p>
        </div>
      ) : null}
      <div className="table-responsive stock-table-scroll" ref={tableContainerRef} style={stocks.length === 0 ? { display: 'none' } : tableScrollStyle}>
        <table className="table table-bordered table-striped stock-table" aria-label={lang === 'en' ? 'ETF dividend calendar' : 'ETF 股息月曆'}>
        <thead>
          <tr>
            <th scope="col" className="stock-col" rowSpan={activeCurrencies.length > 1 ? 2 : 1}
              aria-sort={sortConfig.column === 'stock_id' ? (sortConfig.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
            >
              <button type="button" className={`sortable${sortConfig.column === 'stock_id' ? ' sortable--active' : ''}`} onClick={() => handleSort('stock_id')}>
                {t('stock_code_name')}
                <span className="sort-indicator" aria-hidden="true">
                  {sortConfig.column === 'stock_id'
                    ? (sortConfig.direction === 'asc' ? '▲' : '▼')
                    : '↕'}
                </span>
              </button>
              <button
                type="button"
                className="filter-btn"
                onClick={() => setShowIdDropdown(true)}
                title={t('filter_by_id')}
                aria-label={t('filter_by_id')}
                aria-expanded={showIdDropdown}
                aria-haspopup="true"
                ref={idFilterButtonRef}
              >
                🔎
              </button>
              {showIdDropdown && idDropdownPosition && (
                <FilterDropdown
                  options={stockOptions}
                  selected={selectedStockIds}
                  setSelected={setSelectedStockIds}
                  onClose={() => setShowIdDropdown(false)}
                  position={idDropdownPosition}
                />
              )}
            </th>
            <th scope="col" style={{ width: NUM_COL_WIDTH }} rowSpan={activeCurrencies.length > 1 ? 2 : 1}
              aria-sort={sortConfig.column === 'latest_price' ? (sortConfig.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
            >
              <button type="button" className={`sortable${sortConfig.column === 'latest_price' ? ' sortable--active' : ''}`} onClick={() => handleSort('latest_price')}>
                {lang === 'zh' ? <>最新<br></br>股價</> : <>Latest<br></br>Price</>}
                <span className="sort-indicator" aria-hidden="true">
                  {sortConfig.column === 'latest_price'
                    ? (sortConfig.direction === 'asc' ? '▲' : '▼')
                    : '↕'}
                </span>
              </button>
            </th>
            {MONTHS.map((m, idx) => {
              if (!visibleMonthIndices.includes(idx)) return null;
              const monthSortKey = `month${idx}`;
              const showMonthSort = activeCurrencies.length === 1;
              const isMonthActive = sortConfig.column === monthSortKey;
              return (
                <th
                  key={m}
                  scope={activeCurrencies.length > 1 ? 'colgroup' : 'col'}
                  className={idx === currentMonth ? 'current-month' : ''}
                  colSpan={activeCurrencies.length}
                  style={{ minWidth: NUM_COL_WIDTH * activeCurrencies.length }}
                  aria-sort={showMonthSort ? (isMonthActive ? (sortConfig.direction === 'asc' ? 'ascending' : 'descending') : 'none') : undefined}
                >
                  <div className="month-th-inner">
                    {showMonthSort ? (
                      <button type="button" className={`sortable${isMonthActive ? ' sortable--active' : ''}`} onClick={() => handleSort(monthSortKey)}>
                        {m}
                        <span className="sort-indicator" aria-hidden="true">
                          {isMonthActive
                            ? (sortConfig.direction === 'asc' ? '▲' : '▼')
                            : '↕'}
                        </span>
                      </button>
                    ) : (
                      <span>{m}</span>
                    )}
                    <label className="month-filter-label">
                      <input
                        type="checkbox"
                        checked={monthHasValue[idx]}
                        aria-label={`${m} ${t('payout')}`}
                        onChange={e => {
                          const arr = [...monthHasValue];
                          arr[idx] = e.target.checked;
                          setMonthHasValue(arr);
                        }}
                      />&nbsp;{t('payout')}
                    </label>
                  </div>
                </th>
              );
            })}
            <th
              scope="col"
              rowSpan={activeCurrencies.length > 1 ? 2 : 1}
              style={{ minWidth: NUM_COL_WIDTH * 2 }}
              aria-sort={
                sortConfig.column === 'total' || sortConfig.column === 'annual_yield'
                  ? (sortConfig.direction === 'asc' ? 'ascending' : 'descending')
                  : 'none'
              }
            >
              <button type="button" className={`sortable${sortConfig.column === 'total' ? ' sortable--active' : ''}`} onClick={() => handleSort('total')}>
                {showDividendYield ? t('total_yield') : t('per_lot_dividend')}
                <span className="sort-indicator" aria-hidden="true">
                  {sortConfig.column === 'total'
                    ? (sortConfig.direction === 'asc' ? '▲' : '▼')
                    : '↕'}
                </span>
              </button>
              {' / '}
              <button type="button" className={`sortable${sortConfig.column === 'annual_yield' ? ' sortable--active' : ''}`} onClick={() => handleSort('annual_yield')}>
                {t('estimated_yield')}
                <span className="sort-indicator" aria-hidden="true">
                  {sortConfig.column === 'annual_yield'
                    ? (sortConfig.direction === 'asc' ? '▲' : '▼')
                    : '↕'}
                </span>
              </button>
            </th>
          </tr>
          {activeCurrencies.length > 1 && (
            <tr>
              {MONTHS.map((m, idx) => (
                !visibleMonthIndices.includes(idx) ? null : activeCurrencies.map(currency => {
                  const currencySortKey = `month${idx}:${currency}`;
                  const isActive = sortConfig.column === currencySortKey;
                  return (
                    <th
                      key={`${m}-${currency}`}
                      scope="col"
                      className={idx === currentMonth ? 'current-month' : ''}
                      style={{ width: NUM_COL_WIDTH }}
                      aria-sort={isActive ? (sortConfig.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
                    >
                      <button
                        type="button"
                        className={`sortable-inline${isActive ? ' sortable--active' : ''}`}
                        onClick={() => handleSort(currencySortKey)}
                      >
                        {currencyLabelFor(currency)}
                        <span className="sort-indicator" aria-hidden="true">
                          {isActive
                            ? (sortConfig.direction === 'asc' ? '▲' : '▼')
                            : '↕'}
                        </span>
                      </button>
                    </th>
                  );
                })
              ))}
            </tr>
          )}
        </thead>
        <tbody>
          {shouldVirtualizeMain ? (
            <>
              {renderVirtualPaddingRow(virtualPaddingTop, 'top')}
              {virtualRows.map(virtualRow => {
                const stock = limitedStocks[virtualRow.index];
                return (
                  <StockRow
                    key={stock.stock_id + stock.stock_name}
                    stock={stock}
                    months={MONTHS}
                    monthCells={monthCellCache.get(stock.stock_id)}
                    visibleMonthIndices={visibleMonthIndices}
                    activeCurrencies={activeCurrencies}
                    currentMonth={currentMonth}
                    showDividendYield={showDividendYield}
                    showPerYield={showPerYield}
                    lang={lang}
                    t={t}
                    freqNameMap={freqNameMap}
                    latestPrice={latestPrice}
                    totalPerStock={totalPerStock}
                    yieldSum={yieldSum}
                    estAnnualYield={estAnnualYield}
                    maxAnnualYield={maxAnnualYield}
                    maxYieldPerMonth={maxYieldPerMonth}
                    getIncomeGoalInfo={getIncomeGoalInfo}
                    monthlyIncomeGoal={monthlyIncomeGoal}
                    freqMap={freqMap}
                    rowRef={rowVirtualizer.measureElement}
                    dataIndex={virtualRow.index}
                  />
                );
              })}
              {renderVirtualPaddingRow(virtualPaddingBottom, 'bottom')}
            </>
          ) : (
            limitedStocks.map(stock => (
              <StockRow
                key={stock.stock_id + stock.stock_name}
                stock={stock}
                months={MONTHS}
                monthCells={monthCellCache.get(stock.stock_id)}
                visibleMonthIndices={visibleMonthIndices}
                activeCurrencies={activeCurrencies}
                currentMonth={currentMonth}
                showDividendYield={showDividendYield}
                showPerYield={showPerYield}
                lang={lang}
                t={t}
                freqNameMap={freqNameMap}
                latestPrice={latestPrice}
                totalPerStock={totalPerStock}
                yieldSum={yieldSum}
                estAnnualYield={estAnnualYield}
                maxAnnualYield={maxAnnualYield}
                maxYieldPerMonth={maxYieldPerMonth}
                getIncomeGoalInfo={getIncomeGoalInfo}
                monthlyIncomeGoal={monthlyIncomeGoal}
                freqMap={freqMap}
              />
            ))
          )}
        </tbody>
        </table>
      </div>
      {stocks.length > 0 && isCardViewport && (
        <div className="stock-card-sort">
          <label htmlFor="stock-card-sort-select">
            {lang === 'zh' ? '排序：' : 'Sort by:'}
          </label>
          <select
            id="stock-card-sort-select"
            value={sortConfig.column}
            onChange={(e) => handleSort(e.target.value)}
          >
            <option value="stock_id">{t('stock_code_name')}</option>
            <option value="latest_price">{lang === 'zh' ? '最新股價' : 'Latest Price'}</option>
            <option value={`month${currentMonth}`}>
              {lang === 'zh' ? `${MONTHS[currentMonth]}配息金額` : `${MONTHS[currentMonth]} Dividend`}
            </option>
            <option value="annual_yield">{t('full_year_estimated_yield')}</option>
            <option value="annualized_yield">
              {lang === 'zh'
                ? `${t('annualized_yield')}（${MONTHS[currentMonth]}）`
                : `${t('annualized_yield')} (${MONTHS[currentMonth]})`}
            </option>
          </select>
          <button
            type="button"
            className="stock-card-sort-direction"
            onClick={() => handleSort(sortConfig.column)}
            aria-label={sortConfig.direction === 'asc'
              ? (lang === 'zh' ? '目前遞增排序，點擊改為遞減' : 'Currently ascending, click for descending')
              : (lang === 'zh' ? '目前遞減排序，點擊改為遞增' : 'Currently descending, click for ascending')}
          >
            {sortConfig.direction === 'asc' ? '▲' : '▼'}
          </button>
        </div>
      )}
      {stocks.length > 0 && isCardViewport && (
        <ul className="stock-table-cards">
          {limitedStocks.map(stock => (
            <StockCard
              key={stock.stock_id + stock.stock_name}
              stock={stock}
              months={MONTHS}
              visibleMonthIndices={visibleMonthIndices}
              currentMonth={currentMonth}
              showPerYield={showPerYield}
              showDividendYield={showDividendYield}
              lang={lang}
              latestPrice={latestPrice}
              getMonthValue={getMonthValue}
              getMonthPerYield={getMonthPerYield}
              activeCurrencies={activeCurrencies}
              totalPerStock={totalPerStock}
              yieldSum={yieldSum}
              estAnnualYield={estAnnualYield}
              maxAnnualYield={maxAnnualYield}
              freqMap={freqMap}
              freqNameMap={freqNameMap}
              t={t}
            />
          ))}
        </ul>
      )}
      {hasExtraRows && (
        <div className="table-more-btn-wrapper">
          <button
            type="button"
            className="more-btn"
            onClick={handleShowMoreClick}
          >
            {showMoreLabel}
          </button>
        </div>
      )}
    </>
  );
}

const StockRow = memo(function StockRow({
  stock,
  months,
  monthCells,
  visibleMonthIndices,
  activeCurrencies,
  currentMonth,
  showDividendYield,
  showPerYield,
  lang,
  t,
  freqNameMap,
  latestPrice,
  totalPerStock,
  yieldSum,
  estAnnualYield,
  maxAnnualYield,
  maxYieldPerMonth,
  getIncomeGoalInfo,
  monthlyIncomeGoal,
  freqMap,
  rowRef,
  dataIndex
}) {
  const price = latestPrice[stock.stock_id]?.price;
  const freq = freqMap[stock.stock_id];
  const safeMonthCells = monthCells ?? [];
  const rowProps =
    typeof dataIndex === 'number'
      ? { 'data-index': dataIndex }
      : {};

  const totalsContent = buildTotalsContent({
    stock, activeCurrencies, totalPerStock, yieldSum, estAnnualYield, maxAnnualYield, showDividendYield, lang, t,
  });

  return (
    <tr ref={rowRef ?? null} {...rowProps}>
      <td className="stock-col">
        <a href={`${HOST_URL}/stock/${stock.stock_id}`} target="_blank" rel="noreferrer"
          aria-label={`${stock.stock_id} ${stock.stock_name} (${lang === 'en' ? 'opens in new tab' : '開啟新分頁'})`}>
          <TooltipText tooltip={stock.stock_name}>
            {stock.stock_id}
          </TooltipText>
        </a>
      </td>
      <td style={{ width: NUM_COL_WIDTH }}>{price ?? '—'}</td>
      {months.map((_, idx) =>
        !visibleMonthIndices.includes(idx) ? null : activeCurrencies.map((currency, currencyIdx) => {
          const monthCurrencyCells = safeMonthCells[idx] || [];
          const cell = monthCurrencyCells[currencyIdx];
          if (!cell) {
            return (
              <td
                key={`${stock.stock_id}-${idx}-${currency}`}
                className={idx === currentMonth ? 'current-month' : ''}
                style={{ width: NUM_COL_WIDTH }}
              ></td>
            );
          }
          const perYield = cell.perYield || 0;
          const monthMaxArray = maxYieldPerMonth?.[currency];
          const monthMax = Array.isArray(monthMaxArray) ? (monthMaxArray[idx] || 0) : 0;
          const shouldShowDiamond =
            perYield > 0 &&
            monthMax > 0 &&
            Math.abs(perYield - monthMax) < 1e-6;
          const {
            isDividendValid,
            dividendText: displayDividend,
            yieldText: displayYield,
          } = getDividendCellDisplay(cell, { lang });
          const rawDividend = Number(cell.dividend);
          const displayPerYield = perYield > 0 ? `${perYield.toFixed(2)}%` : '';
          const displayVal = showPerYield
            ? displayPerYield
            : showDividendYield
              ? displayYield
              : displayDividend;
          const entries = cell.entries || [];
          const isMulti = entries.length > 1;
          const shortDate = (d) => d ? d.slice(5).replace('-', '/') : '-';
          const tooltipLines = [];
          const { closePriceText, yieldText: tooltipYield } = getDividendCellDisplay(cell, { lang, verbose: true });
          if (isMulti) {
            const sorted = [...entries].sort((a, b) => (a.dividend_date || '') < (b.dividend_date || '') ? -1 : 1);
            sorted.forEach((entry, i) => {
              const amt = Number.isFinite(entry.dividend) ? entry.dividend.toFixed(3) : '-';
              tooltipLines.push(
                lang === 'zh'
                  ? `[${i + 1}] ${amt} ${currencyUnitZhFor(currency)} | ${shortDate(entry.dividend_date)} → ${shortDate(entry.payment_date)}`
                  : `[${i + 1}] ${currencyLabelFor(currency)}${amt} | ${shortDate(entry.dividend_date)} → ${shortDate(entry.payment_date)}`
              );
            });
            if (isDividendValid) {
              tooltipLines.push(
                lang === 'zh'
                  ? `合計: ${rawDividend.toFixed(3)} ${currencyUnitZhFor(currency)}`
                  : `Total: ${currencyLabelFor(currency)}${rawDividend.toFixed(3)}`
              );
            }
          } else {
            if (isDividendValid) {
              tooltipLines.push(
                lang === 'zh'
                  ? `每股配息: ${rawDividend.toFixed(3)} ${currencyUnitZhFor(currency)}`
                  : `Dividend per share: ${currencyLabelFor(currency)}${rawDividend.toFixed(3)}`
              );
            }
            tooltipLines.push(`${t('prev_close')}: ${closePriceText}`);
          }
          tooltipLines.push(
            `${t('current_yield')}: ${tooltipYield}`,
            `${t('avg_month_yield')}: ${perYield.toFixed(2)}%`,
            `${t('payout_frequency')}: ${freqNameMap[freq] || t('irregular')}`,
          );
          if (!isMulti) {
            tooltipLines.push(
              `${t('dividend_date')}: ${cell.dividend_date || '-'}`,
              `${t('payment_date')}: ${cell.payment_date || '-'}`
            );
          }
          if (shouldShowDiamond) {
            tooltipLines.push(t('high_yield_disclaimer'));
          }
          const extraInfo = getIncomeGoalInfo(
            isDividendValid ? rawDividend : 0,
            price,
            monthlyIncomeGoal,
            freq || 12
          );
          const tooltip = `${tooltipLines.join('\n')}${extraInfo}`;
          return (
            <td
              key={`${stock.stock_id}-${idx}-${currency}`}
              className={idx === currentMonth ? 'current-month' : ''}
              style={{ width: NUM_COL_WIDTH }}
            >
              <TooltipText tooltip={tooltip}>
                <div className="cell-amount-col">
                  <span>
                    {displayVal}
                    {shouldShowDiamond && (
                      <span className="high-yield-badge">{t('high_yield_badge')}</span>
                    )}
                  </span>
                </div>
              </TooltipText>
            </td>
          );
        })
      )}
      <td>{totalsContent.length > 0 ? totalsContent : ''}</td>
    </tr>
  );
});

const StockCard = memo(function StockCard({
  stock,
  months,
  visibleMonthIndices,
  currentMonth,
  showPerYield,
  showDividendYield,
  lang,
  latestPrice,
  getMonthValue,
  getMonthPerYield,
  activeCurrencies,
  totalPerStock,
  yieldSum,
  estAnnualYield,
  maxAnnualYield,
  freqMap,
  freqNameMap,
  t,
}) {
  const price = latestPrice[stock.stock_id]?.price;
  const totalsContent = buildTotalsContent({
    stock, activeCurrencies, totalPerStock, yieldSum, estAnnualYield, maxAnnualYield, showDividendYield, lang, t,
    labeled: true,
  });
  const formatMonthValue = (val) => {
    if (!(val > 0)) return '—';
    return (showPerYield || showDividendYield) ? `${val.toFixed(2)}%` : val.toFixed(3);
  };
  const freq = freqMap[stock.stock_id];
  const freqLabel = freqNameMap[freq] || t('irregular');

  return (
    <li className="stock-card">
      <div className="stock-card__header">
        <a href={`${HOST_URL}/stock/${stock.stock_id}`} target="_blank" rel="noreferrer"
          aria-label={`${stock.stock_id} ${stock.stock_name} (${lang === 'en' ? 'opens in new tab' : '開啟新分頁'})`}>
          <span className="stock-card__id">{stock.stock_id}</span>
          <span className="stock-card__name">{stock.stock_name}</span>
        </a>
        <div className="stock-card__header-meta">
          <span className="stock-card__freq">{freqLabel}</span>
          <span className="stock-card__price">
            <span className="stock-card__price-label">{t('latest_price_label')}</span>
            {price ?? '—'}
          </span>
        </div>
      </div>
      <div className="stock-card__body">
        {totalsContent.length > 0 ? totalsContent : null}
      </div>
      {visibleMonthIndices.length > 0 && (
        <ul className="stock-card__months">
          {visibleMonthIndices.map(idx => {
            const hasAnyValue = activeCurrencies.some(
              currency => getMonthValue(stock.stock_id, idx, currency) > 0
            );
            return (
              <li
                key={idx}
                className={idx === currentMonth ? 'stock-card__month stock-card__month--current' : 'stock-card__month'}
              >
                <span>
                  {months[idx]}
                  {!hasAnyValue && (
                    <span className="stock-card__month-nodata"> · {t('no_dividend_this_month')}</span>
                  )}
                </span>
                <span className="stock-card__month-values">
                  {activeCurrencies.map(currency => {
                    const annualizedYield = getMonthPerYield(stock.stock_id, idx, currency) * 12;
                    return (
                      <span key={currency}>
                        {currencyLabelFor(currency)}{formatMonthValue(getMonthValue(stock.stock_id, idx, currency))}
                        {!showPerYield && annualizedYield > 0 && (
                          <span className="stock-card__month-yield">
                            {' '}· {t('annualized_yield')} {annualizedYield.toFixed(1)}%
                          </span>
                        )}
                      </span>
                    );
                  })}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
});
