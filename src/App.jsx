import { useState, useEffect, useRef, useMemo } from 'react';
import InventoryTab from './InventoryTab';
import UserDividendsTab from './UserDividendsTab';
import AboutTab from './AboutTab';
import DividendCalendar from './DividendCalendar';

import './App.css';
import NLHelper from './NLHelper';
import { API_HOST } from './config';
import { fetchWithCache } from './api';

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const freqNameMap = {
  1: '年配',
  2: '半年配',
  4: '季配',
  6: '雙月配',
  12: '月配'
};

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

function getIncomeGoalInfo(dividend, price, goal) {
  if (!price || dividend <= 0) return '';
  const lotsNeeded = Math.ceil(goal / (dividend * 1000));
  const cost = Math.round(lotsNeeded * 1000 * price).toLocaleString();
  return `\n月報酬${goal.toLocaleString()}需: ${lotsNeeded}張\n成本: ${cost}元`;
}

function useClickOutside(ref, handler) {
  useEffect(() => {
    const listener = (event) => {
      if (!ref.current || ref.current.contains(event.target)) return;
      handler(event);
    };
    document.addEventListener("mousedown", listener);
    return () => document.removeEventListener("mousedown", listener);
  }, [ref, handler]);
}

function FilterDropdown({ options, selected, setSelected, onClose }) {
  const ref = useRef();
  useClickOutside(ref, onClose);

  const [tempSelected, setTempSelected] = useState(selected);
  const [searchText, setSearchText] = useState('');

  const filteredOptions = options.filter(opt =>
    opt.label.toLowerCase().includes(searchText.trim().toLowerCase())
  );

  const handleCheck = (val) => {
    setTempSelected(s =>
      s.includes(val) ? s.filter(x => x !== val) : [...s, val]
    );
  };

  const handleAll = () => {
    const filteredValues = filteredOptions.map(o => o.value);
    const allSelected =
      filteredValues.length > 0 &&
      filteredValues.every(v => tempSelected.includes(v)) &&
      tempSelected.length === filteredValues.length;
    setTempSelected(allSelected ? [] : filteredValues);
  };

  const handleApply = () => {
    setSelected(tempSelected.filter(x => options.some(o => o.value === x)));
    onClose();
  };

  const handleClear = () => {
    setTempSelected([]);
  };

  return (
    <div className="dropdown" ref={ref}>
      <input
        type="text"
        className="dropdown-search"
        value={searchText}
        onChange={e => setSearchText(e.target.value)}
        placeholder="搜尋..."
        autoFocus
      />
      <div style={{ maxHeight: 180, overflowY: 'auto', marginTop: 6 }}>
        <label className="dropdown-item">
          <input
            type="checkbox"
            checked={
              filteredOptions.length > 0 &&
              filteredOptions.every(opt => tempSelected.includes(opt.value))
            }
            onChange={handleAll}
          />
          <span style={{ fontWeight: 'bold', marginLeft: 5 }}>全選</span>
        </label>
        <hr />
        {filteredOptions.length === 0 && (
          <div style={{ color: '#bbb', padding: '8px 0', fontSize: 13 }}>無符合選項</div>
        )}
        {filteredOptions.map(opt => (
          <label key={opt.value} className="dropdown-item">
            <input
              type="checkbox"
              checked={tempSelected.includes(opt.value)}
              onChange={() => handleCheck(opt.value)}
            /> {opt.label}
          </label>
        ))}
      </div>
      <div style={{ marginTop: 8, textAlign: 'right' }}>
        <button className="dropdown-btn" onClick={handleClear}>清除</button>
        <button className="dropdown-btn" style={{ marginLeft: 8 }} onClick={handleApply}>確定</button>
      </div>
    </div>
  );
}

function ActionDropdown({
  toggleCalendar,
  showCalendar,
  toggleDiamond,
  showDiamondOnly,
  toggleDividendYield,
  showDividendYield,
  toggleAxis,
  showInfoAxis,
  onClose
}) {
  const ref = useRef();
  useClickOutside(ref, onClose);

  const handleClick = (action) => {
    action();
    onClose();
  };

  return (
    <div className="action-dropdown" ref={ref}>
      <button onClick={() => handleClick(toggleCalendar)}>
        {showCalendar ? '顯示表格' : '顯示月曆'}
      </button>
      {!showCalendar && (
        <>
          <button onClick={() => handleClick(toggleDiamond)}>
            {showDiamondOnly ? '顯示全部' : '顯示鑽石'}
          </button>
          <button onClick={() => handleClick(toggleDividendYield)}>
            {showDividendYield ? '顯示配息' : '顯示殖利率'}
          </button>
          <button onClick={() => handleClick(toggleAxis)}>
            {showInfoAxis ? '顯示月份' : '顯示資訊'}
          </button>
        </>
      )}
    </div>
  );
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

  // Sorting state
  const [sortConfig, setSortConfig] = useState({ column: 'stock_id', direction: 'asc' });

  // Multi-select filters
  const [selectedStockIds, setSelectedStockIds] = useState([]);
  const [showIdDropdown, setShowIdDropdown] = useState(false);

  // Watch groups
  const [watchGroups, setWatchGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showActions, setShowActions] = useState(false);
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
    setShowIdDropdown(false);
    setShowDiamondOnly(false);
    setSortConfig({ column: 'stock_id', direction: 'asc' });
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const jsonData = await fetchWithCache(`${API_HOST}/get_dividend`);
        setData(jsonData);

        const yearSet = new Set(jsonData.map(item => new Date(item.dividend_date).getFullYear()));
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
      .then(list => {
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
    const fData = data.filter(
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

  const sortedStocks = [...displayStocks].sort((a, b) => {
    const dir = sortConfig.direction === 'asc' ? 1 : -1;
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

  const limitedStocks = showAllStocks ? sortedStocks : sortedStocks.slice(0, 20);

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
      <header className="mb-4 text-center">
        <h1 className="site-title">ETF Dividend Tracker</h1>
        <h2 className="slogan">compound interest is the most powerful force in the universe</h2>
      </header>
      <ul className="nav nav-tabs mb-3 justify-content-center">
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
          <h1>ETF 每月配息總表</h1>
          <div style={{ marginBottom: 16 }}>
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
            <button
              onClick={() => setShowGroupModal(true)}
              style={{ marginLeft: 5 }}
            >
              建立觀察組合
            </button>
            <button onClick={handleResetFilters} style={{ marginLeft: 10 }}>重置所有篩選</button>
            <label style={{ marginLeft: 20 }}>
              預計月報酬：
              <input
                type="number"
                value={monthlyIncomeGoal}
                onChange={e => setMonthlyIncomeGoal(Number(e.target.value) || 0)}
                style={{ width: 80, marginLeft: 4 }}
              />
            </label>
            <div style={{ display: 'inline-block', position: 'relative', marginLeft: 20 }}>
              <button onClick={() => setShowActions(v => !v)}>更多顯示</button>
              {showActions && (
                <ActionDropdown
                  toggleCalendar={() => setShowCalendar(v => !v)}
                  showCalendar={showCalendar}
                  toggleDiamond={() => setShowDiamondOnly(v => !v)}
                  showDiamondOnly={showDiamondOnly}
                  toggleDividendYield={() => setShowDividendYield(v => !v)}
                  showDividendYield={showDividendYield}
                  toggleAxis={() => setShowInfoAxis(v => !v)}
                  showInfoAxis={showInfoAxis}
                  onClose={() => setShowActions(false)}
                />
              )}
            </div>
          </div>
          {!showCalendar && (
            <p style={{fontSize:12, marginBottom:8}}>提示：點下篩選鈕開啟篩選視窗。</p>
          )}
          {loading ? (
            <p>Loading...</p>
          ) : error ? (
            <p>Error: {error.message}</p>
          ) : showCalendar ? (
            <>
              <div style={{ marginBottom: 8 }}>
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
          ) : showInfoAxis ? (
            <div className="table-responsive" style={{ minWidth: 800 }}>
              {showAllStocks && (
                <button onClick={() => setShowAllStocks(false)} style={{ marginBottom: 8 }}>預設</button>
              )}
              <table className="table table-bordered table-striped">
                <thead>
                  <tr>
                    <th>Stock</th>
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
                      const lots = Math.ceil(monthlyIncomeGoal / (dividendTotal * 1000));
                      lotsNeeded = lots;
                      cost = Math.round(lots * 1000 * price).toLocaleString();
                    }
                    const lastYield = latestYield[stock.stock_id]?.yield;
                    return (
                      <tr key={stock.stock_id + stock.stock_name}>
                        <td>
                          <a href={`/stock/${stock.stock_id}`} target="_blank" rel="noreferrer">
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
              {!showAllStocks && sortedStocks.length > 20 && (
                <button className="more-btn" onClick={() => setShowAllStocks(true)} style={{ marginTop: 8 }}>更多+</button>
              )}
            </div>
          ) : (
            <div className="table-responsive" style={{ minWidth: 1300 }}>
              {showAllStocks && (
                <button onClick={() => setShowAllStocks(false)} style={{ marginBottom: 8 }}>預設</button>
              )}
              <table className="table table-bordered table-striped">
              <thead>
                <tr>
                  <th style={{ position: 'relative' }}>
                    <span className="sortable" onClick={() => handleSort('stock_id')}>
                      Stock
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
                  <th>
                    <span className="sortable" onClick={() => handleSort('latest_price')}>
                      最新<br></br>股價
                      <span className="sort-indicator">
                        {sortConfig.column === 'latest_price'
                          ? (sortConfig.direction === 'asc' ? '▲' : '▼')
                          : '↕'}
                      </span>
                    </span>
                  </th>
                  {MONTHS.map((m, idx) => (
                    <th key={m} className={idx === currentMonth ? 'current-month' : ''}>
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
                {limitedStocks.map(stock => {
                  const totalVal = showDividendYield
                    ? (yieldSum[stock.stock_id] > 0
                      ? `${yieldSum[stock.stock_id].toFixed(1)}%`
                      : '')
                    : (totalPerStock[stock.stock_id] > 0
                      ? totalPerStock[stock.stock_id].toFixed(1)
                      : '');
                  const annualVal = estAnnualYield[stock.stock_id] > 0 ? (
                    <span
                      title={`目前已累積殖利率: ${(yieldSum[stock.stock_id] || 0).toFixed(1)}%`}
                    >
                      {estAnnualYield[stock.stock_id].toFixed(1)}%
                      {estAnnualYield[stock.stock_id] === maxAnnualYield && maxAnnualYield > 0 && (
                        <span className="crown-icon" role="img" aria-label="crown">👑</span>
                      )}
                    </span>
                  ) : '';
                  return (
                    <tr key={stock.stock_id + stock.stock_name}>
                      <td>
                        <a href={`/stock/${stock.stock_id}`} target="_blank" rel="noreferrer">
                          {stock.stock_id} {stock.stock_name}
                        </a>
                      </td>
                      <td>{latestPrice[stock.stock_id]?.price ?? ''}</td>
                      {MONTHS.map((m, idx) => {
                        const cell = dividendTable[stock.stock_id] && dividendTable[stock.stock_id][idx];
                        if (!cell) return <td key={idx} className={idx === currentMonth ? 'current-month' : ''}></td>;
                        const freq = freqMap[stock.stock_id];
                        const perYield = cell.perYield || 0;
                        const displayVal = showDividendYield
                          ? `${parseFloat(cell.dividend_yield).toFixed(1)}%`
                          : cell.dividend.toFixed(3);
                        const price = latestPrice[stock.stock_id]?.price;
                        const extraInfo = getIncomeGoalInfo(cell.dividend, price, monthlyIncomeGoal);
                        return (
                          <td key={idx} className={idx === currentMonth ? 'current-month' : ''}>
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
                })}
                </tbody>
              </table>
              {!showAllStocks && sortedStocks.length > 20 && (
                <button className="more-btn" onClick={() => setShowAllStocks(true)} style={{ marginTop: 8 }}>更多+</button>
              )}
            </div>
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
