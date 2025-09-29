import { useState, useEffect, useRef, useMemo } from 'react';
import DividendCalendar from './components/DividendCalendar';
import { readTransactionHistory } from './utils/transactionStorage';
import { HOST_URL, API_HOST } from './config';
import { useLanguage } from './i18n';
import usePreserveScroll from './hooks/usePreserveScroll';
import { fetchWithCache } from './api';

const MONTH_COL_WIDTH = 80;
function getTransactionHistory() {
    return readTransactionHistory().map(item => ({
        stock_id: item.stock_id,
        date: item.date || item.purchased_date,
        quantity: item.quantity,
        price: item.price,
        stock_name: item.stock_name,
        type: item.type || 'buy'
    }));
}

export default function UserDividendsTab({ allDividendData, selectedYear }) {
    const { lang } = useLanguage();
    const MONTHS = lang === 'en'
        ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        : ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
    const [history, setHistory] = useState([]);
    const [showCalendar, setShowCalendar] = useState(() => {
        const stored = localStorage.getItem('userDividendsShowCalendar');
        return stored === null ? true : stored === 'true';
    });
    // Default to showing both ex-dividend and payment events
    const [calendarFilter, setCalendarFilter] = useState('both');
    const [stockNameMap, setStockNameMap] = useState({});
    const timeZone = 'Asia/Taipei';
    const currentMonth = Number(new Date().toLocaleString('en-US', { timeZone, month: 'numeric' })) - 1;
    const [sortConfig, setSortConfig] = useState({ column: 'stock_id', direction: 'asc' });
    const [monthFilters, setMonthFilters] = useState(() => Array(12).fill(false));
    const tableContainerRef = useRef(null);
    usePreserveScroll(tableContainerRef, 'userDividendsTableScroll');

    const historyByStock = useMemo(() => {
        const map = {};
        history.forEach(item => {
            if (!item?.stock_id) return;
            const date = item.date || item.purchased_date;
            if (!date) return;
            if (!map[item.stock_id]) {
                map[item.stock_id] = [];
            }
            map[item.stock_id].push({ ...item, date });
        });
        Object.keys(map).forEach(stockId => {
            map[stockId].sort((a, b) => {
                const timeA = new Date(a.date).getTime();
                const timeB = new Date(b.date).getTime();
                if (Number.isNaN(timeA) && Number.isNaN(timeB)) return 0;
                if (Number.isNaN(timeA)) return 1;
                if (Number.isNaN(timeB)) return -1;
                return timeA - timeB;
            });
        });
        return map;
    }, [history]);
    useEffect(() => {
        setHistory(getTransactionHistory());
    }, []);

    useEffect(() => {
        localStorage.setItem('userDividendsShowCalendar', showCalendar);
    }, [showCalendar]);

    useEffect(() => {
        fetchWithCache(`${API_HOST}/get_stock_list`)
            .then(({ data }) => {
                const list = Array.isArray(data) ? data : data?.items || [];
                const map = {};
                list.forEach(item => {
                    if (!item?.stock_id) return;
                    map[item.stock_id] = item.stock_name || '';
                });
                setStockNameMap(map);
            })
            .catch(() => setStockNameMap({}));
    }, []);

    function getHolding(stock_id, date) {
        return history.reduce((sum, item) => {
            if (item.stock_id === stock_id && new Date(item.date) <= new Date(date)) {
                return sum + (item.type === 'sell' ? -Number(item.quantity) : Number(item.quantity));
            }
            return sum;
        }, 0);
    }

    // 1. 取得持有股票清單（包含年末持股與當年度已領息後賣出的持股）
    const stockIdSet = new Set(history.map(h => h.stock_id));
    const holdingIds = Array.from(stockIdSet).filter(id => getHolding(id, `${selectedYear}-12-31`) > 0);

    // 2. 只取有配息紀錄的資料（若有除息日則以除息日為主，否則使用發放日）
    const dividendData = (allDividendData || []).filter(item => {
        const refDate = item.dividend_date || item.payment_date;
        if (!refDate) return false;
        const yearMatches = new Date(refDate).getFullYear() === Number(selectedYear);
        if (!yearMatches) return false;
        const checkDate = item.dividend_date || refDate;
        return getHolding(item.stock_id, checkDate) > 0;
    });

    const dividendStockIds = Array.from(new Set(dividendData.map(item => item.stock_id)));
    const allRelevantStockIds = Array.from(new Set([...holdingIds, ...dividendStockIds]));

    // 建立股票代號到名稱的對應（名稱由股息資料提供）
    const stockMap = {};
    allRelevantStockIds.forEach(id => {
        const info = (allDividendData || []).find(d => d.stock_id === id);
        stockMap[id] = stockNameMap[id] || info?.stock_name || '';
    });
    const myStocks = allRelevantStockIds.map(id => ({ stock_id: id, stock_name: stockMap[id] }));

    // Events for calendar view
    const calendarEvents = dividendData.flatMap(item => {
        const holdingDate = item.dividend_date || item.payment_date;
        const qty = getHolding(item.stock_id, holdingDate);
        const dividend = parseFloat(item.dividend);
        const amount = dividend * qty;
        const dividend_yield = parseFloat(item.dividend_yield) || 0;
        const arr = [];
        if (item.dividend_date) {
            arr.push({
                date: item.dividend_date,
                type: 'ex',
                stock_id: item.stock_id,
                stock_name: item.stock_name,
                amount,
                dividend,
                quantity: qty,
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
                dividend,
                quantity: qty,
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

    // 3. 建 monthlyDividendTable: stock_id => {month: cell}
    const dividendTable = {};
    myStocks.forEach(stock => {
        dividendTable[stock.stock_id] = {};
    });

    const getAverageCostBeforeDate = (stockId, dateStr) => {
        if (!dateStr) return 0;
        const entries = historyByStock[stockId];
        if (!entries || entries.length === 0) return 0;
        const targetTime = new Date(dateStr).getTime();
        if (Number.isNaN(targetTime)) return 0;
        let totalQty = 0;
        let totalCost = 0;
        for (const entry of entries) {
            const entryTime = new Date(entry.date).getTime();
            if (Number.isNaN(entryTime)) {
                continue;
            }
            if (entryTime > targetTime) {
                break;
            }
            const qty = Number(entry.quantity);
            if (!Number.isFinite(qty) || qty <= 0) {
                continue;
            }
            if (entry.type === 'sell') {
                if (totalQty <= 0) continue;
                const sellQty = Math.min(qty, totalQty);
                if (sellQty > 0) {
                    const avgCost = totalCost / totalQty;
                    totalQty -= sellQty;
                    totalCost -= avgCost * sellQty;
                }
            } else {
                const price = Number(entry.price);
                if (!Number.isFinite(price)) continue;
                totalQty += qty;
                totalCost += qty * price;
            }
        }
        if (totalQty <= 0) return 0;
        return totalCost / totalQty;
    };

    dividendData.forEach(item => {
        const thisDate = item.dividend_date;
        if (!thisDate) return;
        const month = new Date(thisDate).getMonth();
        const stock_id = item.stock_id;
        const dividend = parseFloat(item.dividend);
        const quantity = getHolding(stock_id, thisDate);
        const avgCost = getAverageCostBeforeDate(stock_id, thisDate);
        const costBasis = avgCost > 0 && quantity > 0 ? avgCost * quantity : 0;
        dividendTable[stock_id][month] = {
            dividend,
            quantity,
            dividend_date: item.dividend_date,
            payment_date: item.payment_date,
            last_close_price: item.last_close_price,
            dividend_yield: item.dividend_yield,
            avg_cost: avgCost,
            cost_basis: costBasis
        };
    });

    // 4. 月合計與年度合計
    const totalPerStock = {};
    const totalYield = {};
    const latestClosePrice = {};
    const monthsCount = {};
    myStocks.forEach(stock => {
        totalPerStock[stock.stock_id] = 0;
        totalYield[stock.stock_id] = 0;
        latestClosePrice[stock.stock_id] = null;
        monthsCount[stock.stock_id] = 0;
        for (let m = 0; m < 12; m++) {
            const cell = dividendTable[stock.stock_id][m];
            if (cell && cell.dividend && cell.quantity) {
                const amt = cell.dividend * cell.quantity;
                totalPerStock[stock.stock_id] += amt;
                totalYield[stock.stock_id] += parseFloat(cell.dividend_yield) || 0;
                // monthsCount should reflect the month of the payout
                monthsCount[stock.stock_id] = m + 1;

                if (!latestClosePrice[stock.stock_id] || new Date(cell.dividend_date) > new Date(latestClosePrice[stock.stock_id].date)) {
                    latestClosePrice[stock.stock_id] = { price: cell.last_close_price, date: cell.dividend_date };
                }
            }
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

    const hasActiveMonthFilters = monthFilters.some(Boolean);

    const getTotalForStock = (stockId) => {
        if (!hasActiveMonthFilters) {
            return totalPerStock[stockId] || 0;
        }
        return MONTHS.reduce((sum, _m, idx) => {
            if (!monthFilters[idx]) {
                return sum;
            }
            const cell = dividendTable[stockId][idx];
            if (cell && cell.dividend && cell.quantity) {
                return sum + cell.dividend * cell.quantity;
            }
            return sum;
        }, 0);
    };

    const getYieldInfo = (stockId) => {
        if (!hasActiveMonthFilters) {
            return {
                sumYield: totalYield[stockId] || 0,
                monthsCount: monthsCount[stockId] || 0,
            };
        }
        let sumYield = 0;
        let lastMonth = 0;
        for (let idx = 0; idx < 12; idx++) {
            if (!monthFilters[idx]) continue;
            const cell = dividendTable[stockId][idx];
            if (cell && cell.dividend && cell.quantity) {
                sumYield += parseFloat(cell.dividend_yield) || 0;
                lastMonth = idx + 1;
            }
        }
        return { sumYield, monthsCount: lastMonth };
    };

    const sortedStocks = [...myStocks].sort((a, b) => {
        const dir = sortConfig.direction === 'asc' ? 1 : -1;
        if (sortConfig.column === 'stock_id') {
            return a.stock_id.localeCompare(b.stock_id) * dir;
        }
        if (sortConfig.column === 'total') {
            const aTotal = getTotalForStock(a.stock_id);
            const bTotal = getTotalForStock(b.stock_id);
            return (aTotal - bTotal) * dir;
        }
        if (sortConfig.column.startsWith('month')) {
            const idx = Number(sortConfig.column.slice(5));
            const aCell = dividendTable[a.stock_id][idx];
            const bCell = dividendTable[b.stock_id][idx];
            const aVal = aCell ? aCell.dividend * aCell.quantity : 0;
            const bVal = bCell ? bCell.dividend * bCell.quantity : 0;
            return (aVal - bVal) * dir;
        }
        return 0;
    });

    const filteredStocks = sortedStocks.filter(stock => {
        if (!hasActiveMonthFilters) {
            return true;
        }
        return monthFilters.some((active, idx) => {
            if (!active) return false;
            const cell = dividendTable[stock.stock_id][idx];
            return Boolean(cell && cell.dividend && cell.quantity);
        });
    });

    const displayCostPerMonth = Array(12).fill(0);
    const displayTotalsPerMonth = Array(12).fill(0);
    filteredStocks.forEach(stock => {
        for (let idx = 0; idx < 12; idx++) {
            const cell = dividendTable[stock.stock_id][idx];
            if (cell && cell.dividend && cell.quantity) {
                const cost = Number(cell.cost_basis) || 0;
                if (cost > 0) {
                    displayCostPerMonth[idx] += cost;
                }
                displayTotalsPerMonth[idx] += cell.dividend * cell.quantity;
            }
        }
    });

    const displayCostGrandTotal = displayCostPerMonth.reduce((sum, val) => sum + val, 0);
    const displayGrandTotal = displayTotalsPerMonth.reduce((sum, val) => sum + val, 0);

    let displayMonthsForAverage = 0;
    for (let m = 11; m >= 0; m--) {
        if (displayTotalsPerMonth[m] > 0) {
            displayMonthsForAverage = m + 1;
            break;
        }
    }
    const displayAvgPerMonth = displayMonthsForAverage > 0 ? displayGrandTotal / displayMonthsForAverage : 0;

    const handleMonthFilterToggle = (idx) => {
        setMonthFilters(prev => {
            const next = [...prev];
            next[idx] = !next[idx];
            return next;
        });
    };

    const handleResetFilters = () => {
        setMonthFilters(Array(12).fill(false));
    };

    return (
        <div className="App" style={{ margin: '0 auto' }}>
            <div style={{ display: "flex", alignItems: "center", margin: "10px 0 0 0", gap: "8px"}}>
                <h3>{selectedYear} {lang === 'en' ? 'Dividend Overview' : '配息總覽'}</h3>
            </div>
            <div style={{ margin: '10px 0' }}>
                <button
                    onClick={() => setShowCalendar(v => !v)}
                >
                    {showCalendar ? (lang === 'en' ? 'Hide Calendar' : '隱藏月曆') : (lang === 'en' ? 'Show Calendar' : '顯示月曆')}
                </button>
            </div>

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
                    <DividendCalendar year={selectedYear} events={filteredCalendarEvents} showTotals />
                </>
            )}

            <div style={{ margin: '10px 0' }}>
                <button onClick={handleResetFilters} disabled={!hasActiveMonthFilters}>
                    {lang === 'en' ? 'Reset Filters' : '重置所有篩選'}
                </button>
            </div>

            <div className="table-responsive" ref={tableContainerRef}>
            <table className="table table-bordered table-striped">
                <thead>
                    <tr>
                        <th className="stock-col">
                            <span className="sortable" onClick={() => handleSort('stock_id')}>
                                {lang === 'en' ? 'Ticker/Name' : '股票代碼/名稱'}
                                {sortConfig.column === 'stock_id' && (
                                    <span className="sort-indicator">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>
                                )}
                            </span>
                        </th>
                        <th>
                            <span className="sortable" onClick={() => handleSort('total')}>
                                {lang === 'en' ? 'Total' : '總計'}
                                {sortConfig.column === 'total' && (
                                    <span className="sort-indicator">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>
                                )}
                            </span>
                        </th>
                        {MONTHS.map((m, idx) => (
                            <th key={idx} className={idx === currentMonth ? 'current-month' : ''} style={{ width: MONTH_COL_WIDTH }}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                                    <span className="sortable" onClick={() => handleSort(`month${idx}`)}>
                                        {m}
                                        {sortConfig.column === `month${idx}` && (
                                            <span className="sort-indicator">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>
                                        )}
                                    </span>
                                    <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <input
                                            type="checkbox"
                                            checked={monthFilters[idx]}
                                            onChange={() => handleMonthFilterToggle(idx)}
                                        />
                                        {lang === 'en' ? 'Dividend' : '配息'}
                                    </label>
                                </div>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {filteredStocks.length === 0 ? (
                        <tr>
                            <td colSpan={14}>
                                {hasActiveMonthFilters
                                    ? (lang === 'en' ? 'No dividends match the selected filters' : '目前篩選條件下沒有配息紀錄')
                                    : (lang === 'en' ? 'No holdings, please add transactions first' : '尚無庫存，請先新增交易紀錄')}
                            </td>
                        </tr>
                    ) : (
                        <>
                            <tr style={{ background: '#d0ebff', fontWeight: 'bold' }}>
                                <td>{lang === 'en' ? 'Monthly Dividend Cost' : '月配息成本'}</td>
                                <td>{displayCostGrandTotal > 0 ? Math.round(displayCostGrandTotal).toLocaleString() : ''}</td>
                                {displayCostPerMonth.map((total, idx) => (
                                    <td key={idx} className={idx === currentMonth ? 'current-month' : ''} style={{ width: MONTH_COL_WIDTH }}>
                                        {total > 0 ? Math.round(total).toLocaleString() : ''}
                                    </td>
                                ))}
                            </tr>
                            <tr style={{ background: '#ffe066', fontWeight: 'bold' }}>
                                <td>{lang === 'en' ? 'Monthly Total' : '月合計'}</td>
                                <td>
                                    {displayGrandTotal > 0 ? (
                                        <span
                                            title={lang === 'en'
                                                ? `Average per month: ${Math.round(displayAvgPerMonth).toLocaleString()}`
                                                : `每月平均領取: ${Math.round(displayAvgPerMonth).toLocaleString()}`}
                                            style={{ borderBottom: '1px dotted #777', cursor: 'help' }}
                                        >
                                            {Math.round(displayGrandTotal).toLocaleString()}
                                        </span>
                                    ) : ''}
                                </td>
                                {displayTotalsPerMonth.map((total, idx) => (
                                    <td key={idx} className={idx === currentMonth ? 'current-month' : ''} style={{ width: MONTH_COL_WIDTH }}>{total > 0 ? Math.round(total).toLocaleString() : ''}</td>
                                ))}
                            </tr>
                            {filteredStocks.map(stock => {
                                const stockTotal = getTotalForStock(stock.stock_id);
                                const { sumYield, monthsCount: yieldMonthsCount } = getYieldInfo(stock.stock_id);
                                return (
                                    <tr key={stock.stock_id + stock.stock_name}>
                                        <td className="stock-col">
                                            <a href={`${HOST_URL}/stock/${stock.stock_id}`} target="_blank" rel="noreferrer">
                                                {stock.stock_id} {stock.stock_name}
                                            </a>
                                        </td>
                                        <td>{stockTotal > 0 ? (() => {
                                            const avgYield = yieldMonthsCount > 0 ? sumYield / yieldMonthsCount : 0;
                                            const estAnnual = avgYield * 12;
                                            return (
                                                <span
                                                    title={lang === 'en'
                                                        ? `Latest close: ${latestClosePrice[stock.stock_id]?.price || '-'}\nSum yield: ${sumYield.toFixed(1)}%\nEst. annual yield: ${estAnnual.toFixed(1)}%`
                                                        : `最新收盤價: ${latestClosePrice[stock.stock_id]?.price || '-'}\n加總殖利率: ${sumYield.toFixed(1)}%\n預估年化殖利率: ${estAnnual.toFixed(1)}%`}
                                                    style={{ borderBottom: '1px dotted #777', cursor: 'help' }}
                                                >
                                                    {Math.round(stockTotal).toLocaleString()}
                                                </span>
                                            );
                                        })() : ''}</td>
                                        {MONTHS.map((m, idx) => {
                                            const cell = dividendTable[stock.stock_id][idx];
                                            if (!cell || !cell.dividend || !cell.quantity) return <td key={idx} className={idx === currentMonth ? 'current-month' : ''} style={{ width: MONTH_COL_WIDTH }}></td>;
                                            const total = cell.dividend * cell.quantity;
                                            return (
                                                <td key={idx} className={idx === currentMonth ? 'current-month' : ''} style={{ width: MONTH_COL_WIDTH }}>
                                                    <span
                                                        title={lang === 'en'
                                                            ? `Shares held: ${cell.quantity} (${(cell.quantity / 1000).toFixed(3).replace(/\.?0+$/, '')} lots)\nDividend per share: ${cell.dividend} \nClose before ex-date: ${cell.last_close_price}\nYield this time: ${cell.dividend_yield}\nEx-dividend date: ${cell.dividend_date || '-'}\nPayment date: ${cell.payment_date || '-'}`
                                                            : `持有數量: ${cell.quantity} 股 (${(cell.quantity / 1000).toFixed(3).replace(/\.?0+$/, '')} 張)\n每股配息: ${cell.dividend} 元\n除息前一天收盤價: ${cell.last_close_price}\n當次殖利率: ${cell.dividend_yield}\n配息日期: ${cell.dividend_date || '-'}\n發放日期: ${cell.payment_date || '-'}`}
                                                        style={{ borderBottom: '1px dotted #777', cursor: 'help' }}
                                                    >
                                                        {total > 0 ? Math.round(total).toLocaleString() : ''}
                                                    </span>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                );
                            })}
                        </>
                    )}
                </tbody>
            </table>
            </div>
            <p style={{ fontSize: 12, marginTop: 8, color: '#666' }}>
                {lang === 'en'
                    ? 'Tip: hover numbers to see holdings, per-share dividends, dates, prices and yield details.'
                    : '提示：滑鼠移到數字可看持股、每股配息及日期、價格與殖利率細節。'}
            </p>
        </div>
    );
}
