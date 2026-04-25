import { memo, useState, useMemo, useRef, useEffect, useCallback, useDeferredValue } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import FilterDropdown from './FilterDropdown';
import TooltipText from './TooltipText';
import { HOST_URL } from '../../config';
import { useLanguage } from '../i18n';
import usePreserveScroll from '../hooks/usePreserveScroll';

const NUM_COL_WIDTH = 90;
const DEFAULT_VISIBLE_COUNT = 20;
const SHOW_MORE_BATCH = 50;
const DEFAULT_ROW_ESTIMATE = 64;
const VIRTUAL_OVERSCAN = 10;
const VIRTUAL_MAX_HEIGHT = '70vh';

const currencyLabelFor = (currency) => (currency === 'USD' ? 'US$' : 'NT$');
const currencyUnitZhFor = (currency) => (currency === 'USD' ? '美元' : '元');

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
  // Collapsed view: show 3 months around currentMonth
  const visibleMonthIndices = useMemo(() => {
    if (expandMonths) return Array.from({ length: 12 }, (_, i) => i);
    const indices = [];
    for (let offset = -2; offset <= 0; offset++) {
      indices.push(((currentMonth + offset) + 12) % 12);
    }
    return indices.sort((a, b) => a - b);
  }, [expandMonths, currentMonth]);

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
  }, [deferredStocks, sortConfig, showDividendYield, latestPrice, getYieldSumForStock, getTotalForStock, getAnnualYieldForStock, getMonthValue]);

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
      <div className="table-responsive" ref={tableContainerRef} style={stocks.length === 0 ? { display: 'none' } : tableScrollStyle}>
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

  const totalsContent = activeCurrencies
    .map(currency => {
      const total = totalPerStock[stock.stock_id]?.[currency] || 0;
      const yieldAccumulated = yieldSum[stock.stock_id]?.[currency] || 0;
      const annual = estAnnualYield[stock.stock_id]?.[currency] || 0;
      if (showDividendYield) {
        if (yieldAccumulated <= 0) return null;
        return (
          <div key={`${stock.stock_id}-total-${currency}`}>
            {currencyLabelFor(currency)} {yieldAccumulated.toFixed(1)}%
          </div>
        );
      }
      if (total <= 0 && annual <= 0) return null;
      const tooltipText = lang === 'zh'
        ? `目前已累積殖利率: ${yieldAccumulated.toFixed(1)}%`
        : `Accumulated yield so far: ${yieldAccumulated.toFixed(1)}%`;
      const currencyAnnualMax = maxAnnualYield[currency] || 0;
      const shouldShowCrown =
        annual > 0 &&
        (currencyAnnualMax > 0
          ? Math.abs(annual - currencyAnnualMax) < 1e-6
          : true);
      const annualContent = annual > 0 ? (
        <TooltipText tooltip={tooltipText}>
          {annual.toFixed(1)}%
          {shouldShowCrown && (
            <span className="crown-icon" role="img" aria-label={lang === 'en' ? 'Highest annual yield' : '最高年度殖利率'}>👑</span>
          )}
        </TooltipText>
      ) : null;
      return (
        <div
          key={`${stock.stock_id}-total-${currency}`}
          className="total-cell-row"
        >
          <span>{`${currencyLabelFor(currency)}${total.toFixed(3)}`}</span>
          {annualContent && <span>/ {annualContent}</span>}
        </div>
      );
    })
    .filter(Boolean);

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
      <td style={{ width: NUM_COL_WIDTH }}>{price ?? ''}</td>
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
          const rawDividend = Number(cell.dividend);
          const rawYield = Number(cell.dividend_yield);
          const hasValidDividend = Boolean(cell.hasValidDividend);
          const hasValidYield = Boolean(cell.hasValidYield);
          const hasPendingDividend = Boolean(cell.hasPendingDividend);
          const hasPendingYield = Boolean(cell.hasPendingYield);
          const pendingText = lang === 'zh' ? '待確認' : 'Pending';
          const isDividendValid = hasValidDividend && Number.isFinite(rawDividend);
          const isYieldValid = hasValidYield && Number.isFinite(rawYield);
          const displayDividend = isDividendValid
            ? rawDividend.toFixed(3)
            : hasPendingDividend
              ? pendingText
              : '';
          const displayYield = isYieldValid
            ? `${rawYield.toFixed(1)}%`
            : (hasPendingYield || hasPendingDividend)
              ? pendingText
              : '';
          const displayPerYield = perYield > 0 ? `${perYield.toFixed(2)}%` : '';
          const displayVal = showPerYield
            ? displayPerYield
            : showDividendYield
              ? displayYield
              : displayDividend;
          const tooltipLines = [];
          if (isDividendValid) {
            tooltipLines.push(
              lang === 'zh'
                ? `每股配息: ${rawDividend.toFixed(3)} ${currencyUnitZhFor(currency)}`
                : `Dividend per share: ${currencyLabelFor(currency)}${rawDividend.toFixed(3)}`
            );
          }
          const tooltipYield = isYieldValid
            ? `${rawYield.toFixed(1)}%`
            : (hasPendingYield || hasPendingDividend)
              ? pendingText
              : '';
          tooltipLines.push(
            `${t('prev_close')}: ${cell.last_close_price ?? '-'}`,
            `${t('current_yield')}: ${tooltipYield}`,
            `${t('avg_month_yield')}: ${perYield.toFixed(2)}%`,
            `${t('payout_frequency')}: ${freqNameMap[freq] || t('irregular')}`,
            `${t('dividend_date')}: ${cell.dividend_date || '-'}`,
            `${t('payment_date')}: ${cell.payment_date || '-'}`
          );
          const extraInfo = getIncomeGoalInfo(
            isDividendValid ? rawDividend : 0,
            price,
            monthlyIncomeGoal,
            freq || 12
          );
          const tooltip = `${tooltipLines.join('\n')}${extraInfo}`;
          const monthMaxArray = maxYieldPerMonth?.[currency];
          const monthMax = Array.isArray(monthMaxArray) ? (monthMaxArray[idx] || 0) : 0;
          const shouldShowDiamond =
            perYield > 0 &&
            monthMax > 0 &&
            Math.abs(perYield - monthMax) < 1e-6;
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
                      <span className="diamond-icon" role="img" aria-label={lang === 'en' ? 'Highest monthly yield' : '當月最高殖利率'}>💎</span>
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
