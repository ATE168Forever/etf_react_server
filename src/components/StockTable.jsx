import { useState, useMemo } from 'react';
// Removed react-window virtualization to avoid invalid table markup
import FilterDropdown from './FilterDropdown';
import AdvancedFilterDropdown from './AdvancedFilterDropdown';

const MONTHS = [
  '1月', '2月', '3月', '4月', '5月', '6月',
  '7月', '8月', '9月', '10月', '11月', '12月'
];

const NUM_COL_WIDTH = 80;

const freqNameMap = {
  1: '年配',
  2: '半年配',
  4: '季配',
  6: '雙月配',
  12: '月配'
};

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
      <span title={`目前已累積殖利率: ${(yieldSum[stock.stock_id] || 0).toFixed(1)}%`}>
        {estAnnualYield[stock.stock_id].toFixed(1)}%
        {estAnnualYield[stock.stock_id] === maxAnnualYield && maxAnnualYield > 0 && (
          <span className="crown-icon" role="img" aria-label="crown">👑</span>
        )}
      </span>
    ) : '';

    return (
      <tr>
        <td className="stock-col">
          <a href={`https://etflife.org/stock/${stock.stock_id}`} target="_blank" rel="noreferrer">
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
          const displayVal = showDividendYield
            ? `${parseFloat(cell.dividend_yield).toFixed(1)}%`
            : cell.dividend.toFixed(3);
          const price = latestPrice[stock.stock_id]?.price;
          const extraInfo = getIncomeGoalInfo(cell.dividend, price, monthlyIncomeGoal, freq || 12);
          return (
            <td key={idx} className={idx === currentMonth ? 'current-month' : ''} style={{ width: NUM_COL_WIDTH }}>
              <span
                title={`除息前一天收盤價: ${cell.last_close_price}\n當次殖利率: ${cell.dividend_yield}%\n平均月殖利率: ${perYield.toFixed(2)}%\n配息頻率: ${freqNameMap[freq] || '不定期'}\n配息日期: ${cell.dividend_date}\n發放日期: ${cell.payment_date}${extraInfo}`}
              >
                {displayVal}
                {perYield === maxYieldPerMonth[idx] && maxYieldPerMonth[idx] > 0 && (
                  <span className="diamond-icon" role="img" aria-label="diamond">💎</span>
                )}
              </span>
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
      <div className="table-responsive">
        <table className="table table-bordered table-striped">
          <thead>
            <tr>
              <th className="stock-col">股票代碼/名稱</th>
              <th>最新股價</th>
              <th>股息總額</th>
              <th>當次殖利率</th>
              <th>平均殖利率</th>
              <th>月報酬{monthlyIncomeGoal.toLocaleString()}需張數</th>
              <th>月報酬{monthlyIncomeGoal.toLocaleString()}需成本</th>
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
                    <a href={`https://etflife.org/stock/${stock.stock_id}`} target="_blank" rel="noreferrer">
                      {stock.stock_id} {stock.stock_name}
                    </a>
                  </td>
                  <td>{price ?? ''}</td>
                  <td>{dividendTotal > 0 ? dividendTotal.toFixed(3) : ''}</td>
                  <td>{lastYield > 0 ? `${lastYield.toFixed(1)}%` : ''}</td>
                  <td>{avgYield > 0 ? `${avgYield.toFixed(1)}%` : ''}</td>
                  <td>{lotsNeeded}</td>
                  <td>{cost && `${cost}元`}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {sortedStocks.length > 20 && (
          <button
            className="more-btn"
            onClick={() => setShowAllStocks(v => !v)}
            style={{ marginTop: 8, display: 'block', marginLeft: 'auto', marginRight: 'auto' }}
          >
            {showAllStocks ? '隱藏-' : '更多+'}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="table-responsive">
      <table className="table table-bordered table-striped" style={{ minWidth: 1380 }}>
        <thead>
          <tr>
            <th className="stock-col">
              <span className="sortable" onClick={() => handleSort('stock_id')}>
                股票代碼/名稱
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
                title="依代號篩選"
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
                最新<br></br>股價
                <span className="sort-indicator">
                  {sortConfig.column === 'latest_price'
                    ? (sortConfig.direction === 'asc' ? '▲' : '▼')
                    : '↕'}
                </span>
              </span>
            </th>
              <th style={{ width: NUM_COL_WIDTH, zIndex: showExtraDropdown ? 9999 : undefined }}>
                篩選
                <span
                  className="filter-btn"
                  tabIndex={0}
                  onClick={() => setShowExtraDropdown(true)}
                  title="進階篩選"
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
                  />&nbsp;配息
                </label>
              </th>
            ))}
            <th>
              <span className="sortable" onClick={() => handleSort('total')}>
                累積{showDividendYield ? '殖利率' : '股息'}
                <span className="sort-indicator">
                  {sortConfig.column === 'total'
                    ? (sortConfig.direction === 'asc' ? '▲' : '▼')
                    : '↕'}
                </span>
              </span>
              {'/ '}
              <br></br>
              <span className="sortable" onClick={() => handleSort('annual_yield')}>
                預估殖利率
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
      {sortedStocks.length > 20 && (
        <button
          className="more-btn"
          onClick={() => setShowAllStocks(v => !v)}
          style={{ marginTop: 8, display: 'block', marginLeft: 'auto', marginRight: 'auto' }}
        >
          {showAllStocks ? '隱藏-' : '更多+'}
        </button>
      )}
    </div>
  );
}
