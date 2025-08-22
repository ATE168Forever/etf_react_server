import { useState, useEffect, useMemo } from 'react';
import InventoryTab from './InventoryTab';
import UserDividendsTab from './UserDividendsTab';
import AboutTab from './AboutTab';
import ActionDropdown from './components/ActionDropdown';
import DisplayDropdown from './components/DisplayDropdown';
import DividendCalendar from './components/DividendCalendar';
import StockTable from './components/StockTable';

import './App.css';
import NLHelper from './NLHelper';
import { API_HOST } from './config';
import { fetchWithCache } from './api';

const DEFAULT_MONTHLY_GOAL = 10000;

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

function getIncomeGoalInfo(dividend, price, goal, freq = 12) {
  if (!price || dividend <= 0 || freq <= 0) return '';
  const annualDividend = dividend * freq;
  const lotsNeeded = Math.ceil((goal * 12) / (annualDividend * 1000));
  const cost = Math.round(lotsNeeded * 1000 * price).toLocaleString();
  return `\n月報酬${goal.toLocaleString()}需: ${lotsNeeded}張\n成本: ${cost}元`;
}

function App() {
  // Tab state
  const [tab, setTab] = useState('dividend');

  // All your existing states for dividend page...
  const [data, setData] = useState([]);
  const [years, setYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Toggle table/calendar view
  const [showCalendar, setShowCalendar] = useState(false);

  // Filter which event types to show on calendar
  const [calendarFilter, setCalendarFilter] = useState('ex');

  // Filter to show only rows with diamond
  const [showDiamondOnly, setShowDiamondOnly] = useState(false);
  // Toggle between showing dividend or dividend yield
  const [showDividendYield, setShowDividendYield] = useState(false);
  // Toggle axis between months and info categories
  const [showInfoAxis, setShowInfoAxis] = useState(false);
  // Monthly income goal input
  const [monthlyIncomeGoal, setMonthlyIncomeGoal] = useState(DEFAULT_MONTHLY_GOAL);

  // Multi-select filters
  const [selectedStockIds, setSelectedStockIds] = useState([]);

  // Watch groups
  const [watchGroups, setWatchGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [showDisplays, setShowDisplays] = useState(false);
  const [showAllStocks, setShowAllStocks] = useState(false);

  const [editingGroupIndex, setEditingGroupIndex] = useState(null);
  const [groupNameInput, setGroupNameInput] = useState('');
  const [groupIdsInput, setGroupIdsInput] = useState('');

  // Month value existence filters
  const [monthHasValue, setMonthHasValue] = useState(Array(12).fill(false));
  const [freqMap, setFreqMap] = useState({});
  const currentMonth = new Date().getMonth();
  const handleResetFilters = () => {
    setSelectedStockIds([]);
    setMonthHasValue(Array(12).fill(false));
    setShowDiamondOnly(false);
    setShowAllStocks(false);
  };

  useEffect(() => {
    const callUpdate = () => {
      fetch(`${API_HOST}/update_dividend`).finally(() => {
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
    const fetchData = async () => {
      try {
        const { data: jsonData, cacheStatus, timestamp } = await fetchWithCache(`${API_HOST}/get_dividend`);
        const arr = Array.isArray(jsonData) ? jsonData : jsonData?.items;
        if (!Array.isArray(arr)) {
          throw new Error('Invalid data format');
        }
        setData(arr);
        setDividendCacheInfo({ cacheStatus, timestamp });

        const yearSet = new Set(arr.map(item => new Date(item.dividend_date).getFullYear()));
        const yearList = Array.from(yearSet).sort((a, b) => b - a);
        setYears(yearList);
        if (!yearSet.has(selectedYear)) setSelectedYear(yearList[0]);
      } catch (error) {
        setError(error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    fetchWithCache(`${API_HOST}/get_stock_list`)
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : data?.items || [];
        const map = {};
        const freqMapRaw = { '年配': 1, '半年配': 2, '季配': 4, '雙月配': 6, '月配': 12 };
        list.forEach(s => {
          map[s.stock_id] = freqMapRaw[s.dividend_frequency] || null;
        });
        setFreqMap(map);
      })
      .catch(() => setFreqMap({}));
  }, []);

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
    handleResetFilters();
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
    if (!window.confirm('確定刪除?')) return;
    const group = watchGroups[idx];
    const newGroups = watchGroups.filter((_, i) => i !== idx);
    saveGroups(newGroups);
    if (selectedGroup === group.name) {
      setSelectedGroup('');
      setSelectedStockIds([]);
    }
  };

  const { filteredData, stocks, stockOptions, dividendTable } = useMemo(() => {
    const arr = Array.isArray(data) ? data : [];
    const fData = arr.filter(
      item => new Date(item.dividend_date).getFullYear() === Number(selectedYear)
    );
    const stocks = [];
    const stockMap = {};
    fData.forEach(item => {
      const key = `${item.stock_id}|${item.stock_name}`;
      if (!stockMap[key]) {
        stocks.push({ stock_id: item.stock_id, stock_name: item.stock_name });
        stockMap[key] = true;
      }
    });
    const stockOptions = stocks.map(s => ({
      value: s.stock_id,
      label: `${s.stock_id} ${s.stock_name}`
    }));
    const dividendTable = {};
    fData.forEach(item => {
      const month = new Date(item.dividend_date).getMonth();
      if (!dividendTable[item.stock_id]) dividendTable[item.stock_id] = {};
      const cell = dividendTable[item.stock_id][month] || {
        dividend: 0,
        dividend_yield: 0,
      };
      cell.dividend += parseFloat(item.dividend);
      cell.dividend_yield += parseFloat(item.dividend_yield) || 0;
      cell.last_close_price = item.last_close_price;
      cell.dividend_date = item.dividend_date;
      cell.payment_date = item.payment_date;
      dividendTable[item.stock_id][month] = cell;
    });

    // Calculate months span and per-month yield for each dividend entry
    Object.keys(dividendTable).forEach(id => {
      const months = Object.keys(dividendTable[id]).map(Number).sort((a, b) => a - b);
      let prev = null;
      const rawFreq = Number(freqMap[id]);
      const freq = [1, 2, 4, 6, 12].includes(rawFreq) ? rawFreq : 1;
      months.forEach(m => {
        const cell = dividendTable[id][m];
        let span;
        if (prev === null) {
          span = freq ? 12 / freq : 1;
        } else {
          span = m - prev;
          if (span <= 0) span += 12;
        }
        cell.monthsSpan = span;
        cell.perYield = (parseFloat(cell.dividend_yield) || 0) / span;
        prev = m;
      });
    });

    return { filteredData: fData, stocks, stockOptions, dividendTable };
  }, [data, selectedYear, freqMap]);

  const filteredStocks = stocks.filter(stock => {
    if (selectedStockIds.length && !selectedStockIds.includes(stock.stock_id)) return false;
    for (let m = 0; m < 12; ++m) {
      if (monthHasValue[m]) {
        if (!dividendTable[stock.stock_id] || !dividendTable[stock.stock_id][m]) return false;
      }
    }
    return true;
  });
  const maxYieldPerMonth = Array(12).fill(0);
  filteredStocks.forEach(stock => {
    for (let m = 0; m < 12; m++) {
      const cell = dividendTable[stock.stock_id]?.[m];
      const y = cell?.perYield || 0;
      if (y > maxYieldPerMonth[m]) maxYieldPerMonth[m] = y;
    }
  });

  const handleSort = (column) => {
    setSortConfig(prev => {
      if (prev.column === column) {
        return { column, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { column, direction: 'asc' };
    });
  };

  const displayStocks = showDiamondOnly
    ? filteredStocks.filter(stock => {
        for (let m = 0; m < 12; m++) {
          const cell = dividendTable[stock.stock_id]?.[m];
          const y = cell?.perYield || 0;
          if (y === maxYieldPerMonth[m] && y > 0) return true;
        }
        return false;
      })
    : filteredStocks;

  const totalPerStock = {};
  const yieldSum = {};
  const yieldCount = {};
  const latestPrice = {};
  const latestYield = {};
  displayStocks.forEach(stock => {
    totalPerStock[stock.stock_id] = 0;
    yieldSum[stock.stock_id] = 0;
    yieldCount[stock.stock_id] = 0;
    latestPrice[stock.stock_id] = { price: null, date: null };
    latestYield[stock.stock_id] = { yield: null, date: null };
    for (let m = 0; m < 12; m++) {
      const cell = dividendTable[stock.stock_id]?.[m];
      const val = cell?.dividend || 0;
      const yVal = parseFloat(cell?.dividend_yield) || 0;
      // track per-stock totals and yield sums
      if (cell) {
        totalPerStock[stock.stock_id] += val;
        if (yVal > 0) {
          yieldSum[stock.stock_id] += yVal;
          yieldCount[stock.stock_id] += 1;
        }
        if (!latestPrice[stock.stock_id].date || new Date(cell.dividend_date) > new Date(latestPrice[stock.stock_id].date)) {
          latestPrice[stock.stock_id] = { price: cell.last_close_price, date: cell.dividend_date };
          latestYield[stock.stock_id] = { yield: yVal, date: cell.dividend_date };
        } else if (!latestYield[stock.stock_id].date || new Date(cell.dividend_date) > new Date(latestYield[stock.stock_id].date)) {
          latestYield[stock.stock_id] = { yield: yVal, date: cell.dividend_date };
        }
      }
    }
  });

  const estAnnualYield = {};
  Object.keys(yieldSum).forEach(id => {
    const avgYield = yieldCount[id] > 0 ? yieldSum[id] / yieldCount[id] : 0;
    const freq = [1, 2, 4, 6, 12].includes(freqMap[id]) ? freqMap[id] : yieldCount[id];
    estAnnualYield[id] = avgYield * freq;
  });

  const maxAnnualYield = Math.max(...Object.values(estAnnualYield), 0);

  // Prepare events for calendar view
  const calendarEvents = filteredData
    .filter(item =>
      selectedStockIds.length === 0 || selectedStockIds.includes(item.stock_id)
    )
    .flatMap(item => {
      const amount = parseFloat(item.dividend);
      const dividend_yield = parseFloat(item.dividend_yield) || 0;
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
        });
      }
      return arr;
    });

  const filteredCalendarEvents = calendarEvents.filter(ev =>
    calendarFilter === 'both' || ev.type === calendarFilter
  );


  return (
    <div className="container">
      <header className="mb-1 text-center">
        <h1 className="site-title">ETF Dividend Tracker</h1>
        <h2 className="slogan">compound interest is the most powerful force in the universe</h2>
      </header>
      <ul className="nav nav-tabs mb-1 justify-content-center">
        <li className="nav-item">
          <button
            className={`nav-link${tab === 'dividend' ? ' active' : ''}`}
            onClick={() => setTab('dividend')}
          >
            ETF 配息查詢
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link${tab === 'inventory' ? ' active' : ''}`}
            onClick={() => setTab('inventory')}
          >
            庫存管理
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link${tab === 'mydividend' ? ' active' : ''}`}
            onClick={() => setTab('mydividend')}
          >
            我的配息
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link${tab === 'about' ? ' active' : ''}`}
            onClick={() => setTab('about')}
          >
            關於本站
          </button>
        </li>
      </ul>
      {tab === 'dividend' && (
        <div className="App">
          <h3>ETF 每月配息總表</h3>
          <div style={{ marginBottom: 5 }}>
            <label>年份：</label>
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(Number(e.target.value))}
            >
              {years.map(year => (
                <option value={year} key={year}>{year}</option>
              ))}
            </select>
            <label style={{ marginLeft: 20 }}>觀察組合：</label>
            <select value={selectedGroup} onChange={handleGroupChange}>
              <option value="">自選</option>
              {watchGroups.map(g => (
                <option key={g.name} value={g.name}>{g.name}</option>
              ))}
            </select>
            <div style={{ display: 'inline-block', position: 'relative', marginLeft: 20 }}>
              {!showCalendar &&
                <button onClick={() => setShowActions(v => !v)}>更多功能</button>
              }
              {showActions && (
                <ActionDropdown
                  openGroupModal={() => setShowGroupModal(true)}
                  monthlyIncomeGoal={monthlyIncomeGoal}
                  setMonthlyIncomeGoal={val => setMonthlyIncomeGoal(val)}
                  showCalendar={showCalendar}
                  onClose={() => setShowActions(false)}
                />
              )}
          </div>
          <div style={{ display: 'inline-block', position: 'relative', marginLeft: 20 }}>
            <button onClick={() => setShowDisplays(v => !v)}>更多顯示</button>
            {showDisplays && (
              <DisplayDropdown
                  toggleCalendar={() => setShowCalendar(v => !v)}
                  showCalendar={showCalendar}
                  toggleDiamond={() => setShowDiamondOnly(v => !v)}
                  showDiamondOnly={showDiamondOnly}
                  toggleDividendYield={() => setShowDividendYield(v => !v)}
                  showDividendYield={showDividendYield}
                  toggleAxis={() => setShowInfoAxis(v => !v)}
                  showInfoAxis={showInfoAxis}
                  onClose={() => setShowDisplays(false)}
                />
              )}
            </div>
          </div>
          {dividendCacheInfo && (
            <div style={{ textAlign: 'right', fontSize: 12 }}>
              快取: {dividendCacheInfo.cacheStatus}
              {dividendCacheInfo.timestamp ? ` (${new Date(dividendCacheInfo.timestamp).toLocaleString()})` : ''}
            </div>
          )}
          {!showCalendar && (
            <>
              <button onClick={handleResetFilters} style={{ marginRight: 10 }}>重置所有篩選</button>
              <span>提示：點下篩選鈕開啟篩選視窗。</span>
            </>
          )}

          {loading ? (
            <p>Loading...</p>
          ) : error ? (
            <p>Error: {error.message}</p>
          ) : showCalendar ? (
            <>
              <div style={{ marginBottom: 5 }}>
                <button
                  onClick={() => setCalendarFilter('ex')}
                  style={{ fontWeight: calendarFilter === 'ex' ? 'bold' : 'normal' }}
                >
                  除息日
                </button>
                <button
                  onClick={() => setCalendarFilter('pay')}
                  style={{ fontWeight: calendarFilter === 'pay' ? 'bold' : 'normal', marginLeft: 6 }}
                >
                  發放日
                </button>
                <button
                  onClick={() => setCalendarFilter('both')}
                  style={{ fontWeight: calendarFilter === 'both' ? 'bold' : 'normal', marginLeft: 6 }}
                >
                  除息/發放日
                </button>
              </div>
              <DividendCalendar year={selectedYear} events={filteredCalendarEvents} />
            </>
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
              currentMonth={currentMonth}
              monthlyIncomeGoal={monthlyIncomeGoal}
              showAllStocks={showAllStocks}
              setShowAllStocks={setShowAllStocks}
              showInfoAxis={showInfoAxis}
              getIncomeGoalInfo={getIncomeGoalInfo}
              freqMap={freqMap}
            />
          )}
        </div>
      )}
      {tab === 'inventory' && <InventoryTab />}
      {tab === 'mydividend' &&
        <UserDividendsTab
          allDividendData={data}
          selectedYear={selectedYear}
        />
      }
      {tab === 'about' && <AboutTab />}
      <div className="contact-section">
        <h3>Contact</h3>
        <p>Email: <a href="mailto:giantbean2025@gmail.com">giantbean2025@gmail.com</a></p>
      </div>
      <div className="donation-section">
        <h3>Support This Project</h3>
        <p>
          If you like this project, consider
          {' '}
          <a
            href="https://www.buymeacoffee.com/example"
            target="_blank"
            rel="noreferrer"
          >
            donating
          </a>
          .
        </p>
      </div>
      <NLHelper />
      {showGroupModal && (
        <div className="modal-overlay">
          <div className="custom-modal">
            <h3>觀察組合</h3>
            <div style={{ marginBottom: 10 }}>
              <button onClick={handleAddGroup}>新增組合</button>
            </div>
            {editingGroupIndex !== null && (
              <div style={{ marginBottom: 10 }}>
                <div>
                  <input
                    type="text"
                    placeholder="組合名稱"
                    value={groupNameInput}
                    onChange={e => setGroupNameInput(e.target.value)}
                  />
                </div>
                <div>
                  <input
                    type="text"
                    placeholder="ETF ID，以逗號分隔"
                    value={groupIdsInput}
                    onChange={e => setGroupIdsInput(e.target.value)}
                    style={{
                      marginTop: 4,
                      marginBottom: 4
                    }}
                  />
                </div>
                <button onClick={handleSaveGroup} style={{ marginLeft: 4 }}>儲存</button>
                <button onClick={handleCancelEditGroup} style={{ marginLeft: 4 }}>取消</button>
              </div>
            )}
            {watchGroups.map((g, idx) => (
              <div key={idx} style={{ marginBottom: 8 }}>
                <div>
                  <strong style={isGroupModified(g) ? { color: 'red' } : {}}>{g.name}</strong>: {renderGroupIds(g)}
                </div>
                <div style={{ marginTop: 4 }}>
                  <button onClick={() => handleEditGroup(idx)}>修改</button>
                  <button onClick={() => handleDeleteGroup(idx)} style={{ marginLeft: 4 }}>刪除</button>
                </div>
              </div>
            ))}
            {watchGroups.length === 0 && <p style={{ fontSize: 14 }}>尚無組合</p>}
            <div style={{ textAlign: 'right', marginTop: 12 }}>
              <button onClick={() => setShowGroupModal(false)}>關閉</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
