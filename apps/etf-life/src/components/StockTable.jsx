import { useState, useMemo, useRef } from 'react';
// Removed react-window virtualization to avoid invalid table markup
import FilterDropdown from './FilterDropdown';
import AdvancedFilterDropdown from './AdvancedFilterDropdown';
import TooltipText from './TooltipText';
import { HOST_URL } from '../config';
import { useLanguage } from '../i18n';
import usePreserveScroll from '../hooks/usePreserveScroll';

const NUM_COL_WIDTH = 80;

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
  currentMonth,
  monthlyIncomeGoal,
  showAllStocks,
  setShowAllStocks,
  showInfoAxis,
  getIncomeGoalInfo,
  freqMap,
  extraFilters,
  setExtraFilters
}) {
  const [sortConfig, setSortConfig] = useState({ column: 'stock_id', direction: 'asc' });
  const [showIdDropdown, setShowIdDropdown] = useState(false);
  const [showExtraDropdown, setShowExtraDropdown] = useState(false);
  const tableContainerRef = useRef(null);
  const { lang, t } = useLanguage();
  const MONTHS = lang === 'zh'
    ? ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
    : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const freqNameMap = lang === 'zh'
    ? { 1: '年配', 2: '半年配', 4: '季配', 6: '雙月配', 12: '月配' }
    : { 1: 'Annual', 2: 'Semi-annual', 4: 'Quarterly', 6: 'Bimonthly', 12: 'Monthly' };

  usePreserveScroll(tableContainerRef, 'stockTableScrollLeft', [showInfoAxis]);

  const handleSort = (column) => {
    setSortConfig(prev => {
      if (prev.column === column) {
        return { column, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { column, direction: 'asc' };
    });
  };

  const sortedStocks = useMemo(() => {
    const dir = sortConfig.direction === 'asc' ? 1 : -1;
    return [...stocks].sort((a, b) => {
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
          const aTotal = showDividendYield ? (yieldSum[a.stock_id] || 0) : (totalPerStock[a.stock_id] || 0);
          const bTotal = showDividendYield ? (yieldSum[b.stock_id] || 0) : (totalPerStock[b.stock_id] || 0);
          return (aTotal - bTotal) * dir;
        }
        case 'annual_yield': {
          const aYield = estAnnualYield[a.stock_id] || 0;
          const bYield = estAnnualYield[b.stock_id] || 0;
          return (aYield - bYield) * dir;
        }
        default: {
          if (sortConfig.column?.startsWith('month')) {
            const idx = Number(sortConfig.column.slice(5));
            const aVal = showDividendYield
              ? parseFloat(dividendTable[a.stock_id]?.[idx]?.dividend_yield) || 0
              : dividendTable[a.stock_id]?.[idx]?.dividend || 0;
            const bVal = showDividendYield
              ? parseFloat(dividendTable[b.stock_id]?.[idx]?.dividend_yield) || 0
              : dividendTable[b.stock_id]?.[idx]?.dividend || 0;
            return (aVal - bVal) * dir;
          }
          return 0;
        }
      }
    });
  }, [stocks, sortConfig, showDividendYield, dividendTable, latestPrice, totalPerStock, yieldSum, estAnnualYield]);

  const limitedStocks = showAllStocks ? sortedStocks : sortedStocks.slice(0, 20);

  const Row = ({ stock }) => {
    const totalVal = showDividendYield
      ? (yieldSum[stock.stock_id] > 0 ? `${yieldSum[stock.stock_id].toFixed(1)}%` : '')
      : (totalPerStock[stock.stock_id] > 0 ? totalPerStock[stock.stock_id].toFixed(1) : '');
    const annualVal = estAnnualYield[stock.stock_id] > 0 ? (
      <TooltipText tooltip={`${lang === 'zh' ? '目前已累積殖利率' : 'Accumulated yield so far'}: ${(yieldSum[stock.stock_id] || 0).toFixed(1)}%`}>
        {estAnnualYield[stock.stock_id].toFixed(1)}%
        {estAnnualYield[stock.stock_id] === maxAnnualYield && maxAnnualYield > 0 && (
          <span className="crown-icon" role="img" aria-label="crown">👑</span>
        )}
      </TooltipText>
    ) : '';

    return (
      <tr>
        <td className="stock-col">
          <a href={`${HOST_URL}/stock/${stock.stock_id}`} target="_blank" rel="noreferrer">
            {stock.stock_id} {stock.stock_name}
          </a>
        </td>
        <td style={{ width: NUM_COL_WIDTH }}>{latestPrice[stock.stock_id]?.price ?? ''}</td>
        <td style={{ width: NUM_COL_WIDTH }}></td>
        {MONTHS.map((m, idx) => {
          const cell = dividendTable[stock.stock_id] && dividendTable[stock.stock_id][idx];
          if (!cell) return <td key={idx} className={idx === currentMonth ? 'current-month' : ''} style={{ width: NUM_COL_WIDTH }}></td>;
          const freq = freqMap[stock.stock_id];
          const perYield = cell.perYield || 0;
          const rawDividend = Number(cell.dividend);
          const rawYield = Number(cell.dividend_yield);
          const hasValidDividend = Boolean(cell.hasValidDividend);
          const hasValidYield = Boolean(cell.hasValidYield);
          const isDividendValid = hasValidDividend && Number.isFinite(rawDividend);
          const isYieldValid = hasValidYield && Number.isFinite(rawYield);
          const hasPendingDividend = Boolean(cell.hasPendingDividend);
          const hasPendingYield = Boolean(cell.hasPendingYield);
          const pendingText = lang === 'zh' ? '待確認' : 'Pending';
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
          const displayVal = showDividendYield ? displayYield : displayDividend;
          const price = latestPrice[stock.stock_id]?.price;
          const extraInfo = getIncomeGoalInfo(isDividendValid ? rawDividend : 0, price, monthlyIncomeGoal, freq || 12);
          const tooltipYield = isYieldValid
            ? `${rawYield.toFixed(1)}%`
            : (hasPendingYield || hasPendingDividend)
              ? pendingText
              : '';
          const lastClose = cell.last_close_price ?? '-';
          const dividendDate = cell.dividend_date || '-';
          const paymentDate = cell.payment_date || '-';
          return (
            <td key={idx} className={idx === currentMonth ? 'current-month' : ''} style={{ width: NUM_COL_WIDTH }}>
              <TooltipText
                tooltip={`${t('prev_close')}: ${lastClose}\n${t('current_yield')}: ${tooltipYield}\n${t('avg_month_yield')}: ${perYield.toFixed(2)}%\n${t('payout_frequency')}: ${freqNameMap[freq] || t('irregular')}\n${t('dividend_date')}: ${dividendDate}\n${t('payment_date')}: ${paymentDate}${extraInfo}`}
              >
                {displayVal}
                {perYield === maxYieldPerMonth[idx] && maxYieldPerMonth[idx] > 0 && (
                  <span className="diamond-icon" role="img" aria-label="diamond">💎</span>
                )}
              </TooltipText>
            </td>
          );
        })}
        <td>
          {totalVal}
          {totalVal && annualVal && ' / '}
          {annualVal}
        </td>
      </tr>
    );
  };

  if (showInfoAxis) {
    return (
      <>
        <div className="table-responsive" ref={tableContainerRef}>
          <table className="table table-bordered table-striped">
          <thead>
            <tr>
              <th className="stock-col">{t('stock_code_name')}</th>
              <th>{t('latest_price')}</th>
              <th>{t('dividend_total')}</th>
              <th>{t('current_yield')}</th>
              <th>{t('average_yield')}</th>
              <th>{lang === 'zh' ? `月報酬${monthlyIncomeGoal.toLocaleString()}需張數` : `Lots for ${monthlyIncomeGoal.toLocaleString()} monthly income`}</th>
              <th>{lang === 'zh' ? `月報酬${monthlyIncomeGoal.toLocaleString()}需成本` : `Cost for ${monthlyIncomeGoal.toLocaleString()} monthly income`}</th>
            </tr>
          </thead>
          <tbody>
            {limitedStocks.map(stock => {
              const price = latestPrice[stock.stock_id]?.price;
              const dividendTotal = totalPerStock[stock.stock_id] || 0;
              const avgYield = yieldCount[stock.stock_id] > 0
                ? (yieldSum[stock.stock_id] / yieldCount[stock.stock_id])
                : 0;
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
                    <a href={`${HOST_URL}/stock/${stock.stock_id}`} target="_blank" rel="noreferrer">
                      {stock.stock_id} {stock.stock_name}
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
        {sortedStocks.length > 20 && (
          <div className="table-more-btn-wrapper">
            <button
              className="more-btn"
              onClick={() => setShowAllStocks(v => !v)}
            >
              {showAllStocks ? `${t('hide')}-` : `${t('more')}+`}
            </button>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <div className="table-responsive" ref={tableContainerRef}>
        <table className="table table-bordered table-striped" style={{ minWidth: 1380 }}>
        <thead>
          <tr>
            <th className="stock-col">
              <span className="sortable" onClick={() => handleSort('stock_id')}>
                {t('stock_code_name')}
                <span className="sort-indicator">
                  {sortConfig.column === 'stock_id'
                    ? (sortConfig.direction === 'asc' ? '▲' : '▼')
                    : '↕'}
                </span>
              </span>
              <span
                className="filter-btn"
                tabIndex={0}
                onClick={() => setShowIdDropdown(true)}
                title={t('filter_by_id')}
              >
                🔎
              </span>
              {showIdDropdown && (
                <FilterDropdown
                  options={stockOptions}
                  selected={selectedStockIds}
                  setSelected={setSelectedStockIds}
                  onClose={() => setShowIdDropdown(false)}
                />
              )}
            </th>
            <th style={{ width: NUM_COL_WIDTH }}>
              <span className="sortable" onClick={() => handleSort('latest_price')}>
                {lang === 'zh' ? <>最新<br></br>股價</> : <>Latest<br></br>Price</>}
                <span className="sort-indicator">
                  {sortConfig.column === 'latest_price'
                    ? (sortConfig.direction === 'asc' ? '▲' : '▼')
                    : '↕'}
                </span>
              </span>
            </th>
              <th style={{ width: NUM_COL_WIDTH, zIndex: showExtraDropdown ? 9999 : undefined }}>
                {t('filter')}
                <span
                  className="filter-btn"
                  tabIndex={0}
                  onClick={() => setShowExtraDropdown(true)}
                  title={t('advanced_filter')}
                >
                  🔎
                </span>
                {showExtraDropdown && (
                  <AdvancedFilterDropdown
                    filters={extraFilters}
                    setFilters={setExtraFilters}
                    onClose={() => setShowExtraDropdown(false)}
                  />
                )}
              </th>
            {MONTHS.map((m, idx) => (
              <th key={m} className={idx === currentMonth ? 'current-month' : ''} style={{ width: NUM_COL_WIDTH }}>
                <span className="sortable" onClick={() => handleSort(`month${idx}`)}>
                  {m}
                  <span className="sort-indicator">
                    {sortConfig.column === `month${idx}`
                      ? (sortConfig.direction === 'asc' ? '▲' : '▼')
                      : '↕'}
                  </span>
                </span>
                <br />
                <label style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                  <input
                    type="checkbox"
                    checked={monthHasValue[idx]}
                    onChange={e => {
                      const arr = [...monthHasValue];
                      arr[idx] = e.target.checked;
                      setMonthHasValue(arr);
                    }}
                  />&nbsp;{t('payout')}
                </label>
              </th>
            ))}
            <th>
              <span className="sortable" onClick={() => handleSort('total')}>
                {showDividendYield ? t('total_yield') : t('total_dividend')}
                <span className="sort-indicator">
                  {sortConfig.column === 'total'
                    ? (sortConfig.direction === 'asc' ? '▲' : '▼')
                    : '↕'}
                </span>
              </span>
              {'/ '}
              <br></br>
              <span className="sortable" onClick={() => handleSort('annual_yield')}>
                {t('estimated_yield')}
                <span className="sort-indicator">
                  {sortConfig.column === 'annual_yield'
                    ? (sortConfig.direction === 'asc' ? '▲' : '▼')
                    : '↕'}
                </span>
              </span>
            </th>
          </tr>
        </thead>
        <tbody>
          {limitedStocks.map(stock => (
            <Row key={stock.stock_id + stock.stock_name} stock={stock} />
          ))}
        </tbody>
        </table>
      </div>
      {sortedStocks.length > 20 && (
        <div className="table-more-btn-wrapper">
          <button
            className="more-btn"
            onClick={() => setShowAllStocks(v => !v)}
          >
            {showAllStocks ? `${t('hide')}-` : `${t('more')}+`}
          </button>
        </div>
      )}
    </>
  );
}
