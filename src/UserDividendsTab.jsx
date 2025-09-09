import { useState, useEffect } from 'react';
import DividendCalendar from './components/DividendCalendar';
import { readTransactionHistory } from './transactionStorage';

const MONTHS = [
    '1月', '2月', '3月', '4月', '5月', '6月',
    '7月', '8月', '9月', '10月', '11月', '12月'
];
const MONTH_COL_WIDTH = 80;
function getTransactionHistory() {
    return readTransactionHistory().map(item => ({
        stock_id: item.stock_id,
        date: item.date || item.purchased_date,
        quantity: item.quantity,
        type: item.type || 'buy'
    }));
}

export default function UserDividendsTab({ allDividendData, selectedYear }) {
    const [history, setHistory] = useState([]);
    const [showCalendar, setShowCalendar] = useState(true);
    const timeZone = 'Asia/Taipei';
    const currentMonth = Number(new Date().toLocaleString('en-US', { timeZone, month: 'numeric' })) - 1;
    const [sortConfig, setSortConfig] = useState({ column: 'stock_id', direction: 'asc' });
    useEffect(() => {
        setHistory(getTransactionHistory());
    }, []);

    function getHolding(stock_id, date) {
        return history.reduce((sum, item) => {
            if (item.stock_id === stock_id && new Date(item.date) <= new Date(date)) {
                return sum + (item.type === 'sell' ? -Number(item.quantity) : Number(item.quantity));
            }
            return sum;
        }, 0);
    }

    // 1. 取得持有股票清單（以年末持股為準）
    const stockIdSet = new Set(history.map(h => h.stock_id));
    const holdingIds = Array.from(stockIdSet).filter(id => getHolding(id, `${selectedYear}-12-31`) > 0);
    const holdingIdSet = new Set(holdingIds);

    // 建立股票代號到名稱的對應
    const stockMap = {};
    holdingIds.forEach(id => {
        const info = (allDividendData || []).find(d => d.stock_id === id);
        stockMap[id] = info?.stock_name || '';
    });
    const myStocks = holdingIds.map(id => ({ stock_id: id, stock_name: stockMap[id] }));

    // 2. 只取有配息紀錄的資料
    const dividendData = (allDividendData || []).filter(item => {
        const d = item.dividend_date;
        return d && new Date(d).getFullYear() === Number(selectedYear) &&
            holdingIdSet.has(item.stock_id) && getHolding(item.stock_id, d) > 0;
    });

    // Events for calendar view
    const calendarEvents = dividendData.flatMap(item => {
        const qty = getHolding(item.stock_id, item.dividend_date);
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

    // 3. 建 monthlyDividendTable: stock_id => {month: cell}
    const dividendTable = {};
    myStocks.forEach(stock => {
        dividendTable[stock.stock_id] = {};
    });
    dividendData.forEach(item => {
        const thisDate = item.dividend_date;
        if (!thisDate) return;
        const month = new Date(thisDate).getMonth();
        const stock_id = item.stock_id;
        const dividend = parseFloat(item.dividend);
        const quantity = getHolding(stock_id, thisDate);
        dividendTable[stock_id][month] = {
            dividend,
            quantity,
            dividend_date: item.dividend_date,
            payment_date: item.payment_date,
            last_close_price: item.last_close_price,
            dividend_yield: item.dividend_yield
        };
    });

    // 4. 月合計與年度合計
    const totalPerMonth = Array(12).fill(0);
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
                totalPerMonth[m] += amt;
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
    const grandTotal = totalPerMonth.reduce((sum, val) => sum + val, 0);

    // Calculate average dividend per month up to the latest dividend month
    let monthsForAverage = 0;
    for (let m = 11; m >= 0; m--) {
        if (totalPerMonth[m] > 0) {
            monthsForAverage = m + 1;
            break;
        }
    }
    const avgPerMonth = monthsForAverage > 0 ? grandTotal / monthsForAverage : 0;

    const handleSort = (column) => {
        setSortConfig(prev => {
            if (prev.column === column) {
                return { column, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
            }
            return { column, direction: 'asc' };
        });
    };

    const sortedStocks = [...myStocks].sort((a, b) => {
        const dir = sortConfig.direction === 'asc' ? 1 : -1;
        if (sortConfig.column === 'stock_id') {
            return a.stock_id.localeCompare(b.stock_id) * dir;
        }
        if (sortConfig.column === 'total') {
            const aTotal = totalPerStock[a.stock_id] || 0;
            const bTotal = totalPerStock[b.stock_id] || 0;
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

    return (
        <div className="App" style={{ margin: '0 auto' }}>
            <div style={{ display: "flex", alignItems: "center", margin: "10px 0 0 0", gap: "8px"}}>
                <h3>{selectedYear} 配息總覽</h3>
            </div>
            <div style={{ margin: '10px 0' }}>
                <button onClick={() => setShowCalendar(v => !v)}>
                    {showCalendar ? '隱藏月曆' : '顯示月曆'}
                </button>
            </div>

            {showCalendar && <DividendCalendar year={selectedYear} events={calendarEvents} />}

            <div className="table-responsive">
            <table className="table table-bordered table-striped">
                <thead>
                    <tr>
                        <th className="stock-col">
                            <span className="sortable" onClick={() => handleSort('stock_id')}>
                                股票代碼/名稱
                                {sortConfig.column === 'stock_id' && (
                                    <span className="sort-indicator">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>
                                )}
                            </span>
                        </th>
                        <th>
                            <span className="sortable" onClick={() => handleSort('total')}>
                                總計
                                {sortConfig.column === 'total' && (
                                    <span className="sort-indicator">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>
                                )}
                            </span>
                        </th>
                        {MONTHS.map((m, idx) => (
                            <th key={idx} className={idx === currentMonth ? 'current-month' : ''} style={{ width: MONTH_COL_WIDTH }}>
                                <span className="sortable" onClick={() => handleSort(`month${idx}`)}>
                                    {m}
                                    {sortConfig.column === `month${idx}` && (
                                        <span className="sort-indicator">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>
                                    )}
                                </span>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {sortedStocks.length === 0 ? (
                        <tr>
                            <td colSpan={14}>尚無庫存，請先新增交易紀錄</td>
                        </tr>
                    ) : (
                        sortedStocks.map(stock => (
                            <tr key={stock.stock_id + stock.stock_name}>
                                <td className="stock-col">
                                    <a href={`https://etflife.org/stock/${stock.stock_id}`} target="_blank" rel="noreferrer">
                                        {stock.stock_id} {stock.stock_name}
                                    </a>
                                </td>
                                <td>{totalPerStock[stock.stock_id] > 0 ? (() => {
                                    const avgYield = monthsCount[stock.stock_id] > 0 ? totalYield[stock.stock_id] / monthsCount[stock.stock_id] : 0;
                                    const estAnnual = avgYield * 12;
                                    return (
                                        <span
                                            title={`最新收盤價: ${latestClosePrice[stock.stock_id]?.price || '-'}\n加總殖利率: ${totalYield[stock.stock_id].toFixed(1)}%\n預估年化殖利率: ${estAnnual.toFixed(1)}%`}
                                            style={{ borderBottom: '1px dotted #777', cursor: 'help' }}
                                        >
                                            {Math.round(totalPerStock[stock.stock_id]).toLocaleString()}
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
                                                title={`持有數量: ${cell.quantity} 股 (${(cell.quantity / 1000).toFixed(3).replace(/\.?0+$/, '')} 張)\n每股配息: ${cell.dividend} 元\n除息前一天收盤價: ${cell.last_close_price}\n當次殖利率: ${cell.dividend_yield}\n配息日期: ${cell.dividend_date || '-'}\n發放日期: ${cell.payment_date || '-'}`}
                                                style={{ borderBottom: '1px dotted #777', cursor: 'help' }}
                                            >
                                                {total > 0 ? Math.round(total).toLocaleString() : ''}
                                            </span>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))
                    )}
                    <tr style={{ background: '#ffe066', fontWeight: 'bold' }}>
                        <td>月合計</td>
                        <td>
                            {grandTotal > 0 ? (
                                <span
                                    title={`每月平均領取: ${Math.round(avgPerMonth).toLocaleString()}`}
                                    style={{ borderBottom: '1px dotted #777', cursor: 'help' }}
                                >
                                    {Math.round(grandTotal).toLocaleString()}
                                </span>
                            ) : ''}
                        </td>
                        {totalPerMonth.map((total, idx) => (
                            <td key={idx} className={idx === currentMonth ? 'current-month' : ''} style={{ width: MONTH_COL_WIDTH }}>{total > 0 ? Math.round(total).toLocaleString() : ''}</td>
                        ))}
                    </tr>
                </tbody>
            </table>
            </div>
            <p style={{ fontSize: 12, marginTop: 8, color: '#666' }}>
                提示：滑鼠移到數字可看持股、每股配息及日期、價格與殖利率細節。
            </p>
        </div>
    );
}
