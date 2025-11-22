import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import DividendCalendar from './components/DividendCalendar';
import { readTransactionHistory } from './utils/transactionStorage';
import { HOST_URL } from '../config';
import { useLanguage } from './i18n';
import usePreserveScroll from './hooks/usePreserveScroll';
import TooltipText from './components/TooltipText';
import CurrencyViewToggle from './components/CurrencyViewToggle';
import { fetchStockList } from './stockApi';
import useEffectOnce from './hooks/useEffectOnce';
import {
    loadDividendExclusions,
    DIVIDEND_EXCLUSION_STORAGE_KEY,
    DIVIDEND_EXCLUSION_EVENT,
    normalizeStockId as normalizeStockIdForExclusion
} from './utils/dividendExclusions';

const MONTH_COL_WIDTH = 80;
const DEFAULT_CURRENCY = 'TWD';
const CURRENCY_SYMBOLS = {
    TWD: 'NT$',
    USD: 'US$'
};
const CURRENCY_NAME_ZH = {
    TWD: '台股配息',
    USD: '美股股息'
};
const CURRENCY_NAME_EN = {
    TWD: 'NT$ dividends',
    USD: 'US$ dividends'
};
const DONUT_COLORS = [
    '#FFD166',
    '#7C99FF',
    '#5FD0C1',
    '#F78E69',
    '#A78BFA',
    '#F472B6',
    '#60A5FA',
    '#34D399',
    '#FB7185',
    '#F97316'
];

const polarToCartesian = (centerX, centerY, radius, angleInDegrees) => {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
        x: centerX + radius * Math.cos(angleInRadians),
        y: centerY + radius * Math.sin(angleInRadians)
    };
};

const describeArc = (x, y, radius, startAngle, endAngle) => {
    const start = polarToCartesian(x, y, radius, endAngle);
    const end = polarToCartesian(x, y, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;
    return ['M', start.x, start.y, 'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y].join(' ');
};

function DividendDonut({
    slices,
    currency,
    formatValue,
    t,
    lang,
    selectedIndex,
    onSelect
}) {
    if (!Array.isArray(slices) || slices.length === 0) {
        return <p style={{ marginTop: 12 }}>{t('dividend_donut_empty')}</p>;
    }

    const total = slices.reduce((sum, slice) => sum + (slice.total || 0), 0);
    if (!total) {
        return <p style={{ marginTop: 12 }}>{t('dividend_donut_empty')}</p>;
    }

    const viewSize = 280;
    const center = viewSize / 2;
    const radius = 100;
    const strokeWidth = 34;
    let currentAngle = -90;

    const formatter = new Intl.NumberFormat(lang === 'en' ? 'en-US' : 'zh-TW', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    });

    const detailSlice = selectedIndex !== null ? slices[selectedIndex] : null;
    const detailPercent = detailSlice && total > 0 ? ((detailSlice.total || 0) / total) * 100 : 0;
    const formatLotsValue = (quantity) => {
        if (!quantity) return '0';
        const lots = Number(quantity) / 1000;
        if (!Number.isFinite(lots) || lots <= 0) {
            return '0';
        }
        return lots.toFixed(3).replace(/\.?0+$/, '');
    };

    return (
        <div className="donut-chart-wrapper">
            <div className="donut-chart-body">
                <div className="donut-chart">
                    <svg viewBox={`0 0 ${viewSize} ${viewSize}`}>
                        <circle
                            cx={center}
                            cy={center}
                            r={radius}
                            stroke="var(--color-border)"
                            strokeWidth={strokeWidth}
                            fill="none"
                            opacity="0.2"
                        />
                        {slices.map((slice, idx) => {
                            const value = slice.total || 0;
                            if (value <= 0) {
                                return null;
                            }
                            const percent = value / total;
                            const startAngle = currentAngle;
                            const endAngle = currentAngle + percent * 360;
                            currentAngle = endAngle;
                            const path = describeArc(center, center, radius, startAngle, endAngle);
                            const color = DONUT_COLORS[idx % DONUT_COLORS.length];
                            const isActive = selectedIndex === idx;
                            return (
                                <path
                                    key={slice.id || idx}
                                    d={path}
                                    stroke={color}
                                    strokeWidth={isActive ? strokeWidth + 4 : strokeWidth}
                                    fill="none"
                                    strokeLinecap="round"
                                    className="donut-segment"
                                    role="button"
                                    tabIndex={0}
                                    aria-label={`${slice.label}: ${formatValue(currency, value, { allowZero: true })}`}
                                    onClick={() => onSelect(idx)}
                                    onKeyDown={(event) => {
                                        if (event.key === 'Enter' || event.key === ' ') {
                                            event.preventDefault();
                                            onSelect(idx);
                                        }
                                    }}
                                />
                            );
                        })}
                    </svg>
                    <div className="donut-center">
                        <div className="donut-center-label">{t('dividend_donut_heading')}</div>
                        <div className="donut-center-value">
                            {formatValue(currency, total, { allowZero: true })}
                        </div>
                    </div>
                </div>
                <ul className="donut-legend">
                    {slices.map((slice, idx) => {
                        const value = slice.total || 0;
                        const percent = total > 0 ? (value / total) * 100 : 0;
                        const color = DONUT_COLORS[idx % DONUT_COLORS.length];
                        const isActive = selectedIndex === idx;
                        return (
                            <li key={slice.id || idx} className={`donut-legend-item${isActive ? ' active' : ''}`}>
                                <button
                                    type="button"
                                    className="donut-legend-button"
                                    aria-pressed={isActive}
                                    onClick={() => onSelect(idx)}
                                >
                                    <span className="legend-dot" style={{ background: color }} />
                                    <div className="legend-text">
                                        <div className="legend-title-row">
                                            <div className="legend-label">{slice.title}</div>
                                            <div className="legend-percent">
                                                {formatter.format(percent)}%
                                            </div>
                                            <div className="legend-value">
                                                {formatValue(currency, value, { allowZero: true })}
                                            </div>
                                        </div>
                                    </div>
                                </button>
                            </li>
                        );
                    })}
                </ul>
            </div>
            {detailSlice && (
                <div className="donut-detail">
                    <div className="donut-detail-card">
                        <div className="detail-main">
                            <div className="detail-title">{detailSlice.label}</div>
                            <div className="detail-amount">
                                {lang === 'en'
                                    ? 'Dividend:'
                                    : '股息：'}
                                {formatValue(currency, detailSlice.total, { allowZero: true })}
                            </div>
                            <div className="detail-meta">
                                {lang === 'en'
                                    ? `${formatter.format(detailPercent)}% of total · ${detailSlice.title}`
                                    : `占總額 ${formatter.format(detailPercent)}%`}
                            </div>
                        </div>
                        <div className="detail-main">
                            <div>
                                {lang === 'en'
                                    ? `Lots held: ${formatLotsValue(detailSlice.quantity || 0)}`
                                    : `持有張數：${formatLotsValue(detailSlice.quantity || 0)}`}
                            </div>
                            <div className="detail-amount">
                                {lang === 'en'
                                    ? `Investment: ${formatValue(currency, detailSlice.investment, { allowZero: true }) || '-'}`
                                    : `投資金額：${formatValue(currency, detailSlice.investment, { allowZero: true }) || '-'}`}
                            </div>
                            <div className="detail-meta">
                                {lang === 'en'
                                    ? `Yield: ${formatter.format(detailSlice.total/detailSlice.investment*100)}%`
                                    : `殖利率：${formatter.format(detailSlice.total/detailSlice.investment*100)}%`}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function normalizeCurrency(currency) {
    if (!currency) return DEFAULT_CURRENCY;
    const upper = String(currency).toUpperCase();
    if (upper === 'NTD') return 'TWD';
    if (upper === 'NT$') return 'TWD';
    if (upper === 'US$') return 'USD';
    return upper;
}
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
    const { lang, t } = useLanguage();
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
    const [dividendExclusions, setDividendExclusions] = useState(() => loadDividendExclusions());
    const timeZone = 'Asia/Taipei';
    const currentMonth = Number(new Date().toLocaleString('en-US', { timeZone, month: 'numeric' })) - 1;
    const [sortConfig, setSortConfig] = useState({ column: 'stock_id', direction: 'asc' });
    const [monthFilters, setMonthFilters] = useState(() => Array(12).fill(false));
    const tableContainerRef = useRef(null);
    const tableElementRef = useRef(null);
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

    useEffectOnce(() => {
        let cancelled = false;

        fetchStockList()
            .then(({ list }) => {
                if (cancelled) return;
                const map = {};
                list.forEach(item => {
                    if (!item?.stock_id) return;
                    map[item.stock_id] = item.stock_name || '';
                });
                setStockNameMap(map);
            })
            .catch(() => {
                if (!cancelled) {
                    setStockNameMap({});
                }
            });

        return () => {
            cancelled = true;
        };
    });

    useEffect(() => {
        if (typeof window === 'undefined') return undefined;
        const refresh = () => {
            setDividendExclusions(loadDividendExclusions());
        };
        const handleStorage = (event) => {
            if (event.key && event.key !== DIVIDEND_EXCLUSION_STORAGE_KEY) {
                return;
            }
            refresh();
        };
        window.addEventListener('storage', handleStorage);
        window.addEventListener(DIVIDEND_EXCLUSION_EVENT, refresh);
        return () => {
            window.removeEventListener('storage', handleStorage);
            window.removeEventListener(DIVIDEND_EXCLUSION_EVENT, refresh);
        };
    }, []);

    const getHolding = useCallback((stock_id, date) => {
        return history.reduce((sum, item) => {
            if (item.stock_id === stock_id && new Date(item.date) <= new Date(date)) {
                return sum + (item.type === 'sell' ? -Number(item.quantity) : Number(item.quantity));
            }
            return sum;
        }, 0);
    }, [history]);
    const isStockExcluded = useCallback((stockId) => {
        const normalized = normalizeStockIdForExclusion(stockId);
        if (!normalized) return false;
        return Boolean(dividendExclusions[normalized]);
    }, [dividendExclusions]);

    const formatLots = (quantity) => {
        if (!quantity) return '0';
        const lots = Number(quantity) / 1000;
        if (!Number.isFinite(lots) || lots <= 0) {
            return '0';
        }
        return lots.toFixed(3).replace(/\.?0+$/, '');
    };

    const formatShortDate = (value) => {
        if (!value) return '-';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return value;
        }
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${month}-${day}`;
    };

    // 1. 取得持有股票清單（包含年末持股與當年度已領息後賣出的持股）
    const stockIdSet = new Set(history.map(h => h.stock_id));
    const holdingIds = Array.from(stockIdSet).filter(id => getHolding(id, `${selectedYear}-12-31`) > 0);

    // 2. 只取有配息紀錄的資料（若有除息日則以除息日為主，否則使用發放日）
    const dividendData = useMemo(() => (allDividendData || []).filter(item => {
        if (isStockExcluded(item?.stock_id)) {
            return false;
        }
        const refDate = item.dividend_date || item.payment_date;
        if (!refDate) return false;
        const yearMatches = new Date(refDate).getFullYear() === Number(selectedYear);
        if (!yearMatches) return false;
        const checkDate = item.dividend_date || refDate;
        return getHolding(item.stock_id, checkDate) > 0;
    }), [allDividendData, getHolding, isStockExcluded, selectedYear]);

    const normalizedDividendData = useMemo(() => dividendData.map(item => ({
        ...item,
        currency: normalizeCurrency(item.currency)
    })), [dividendData]);

    const availableCurrencies = useMemo(() => {
        const set = new Set(normalizedDividendData.map(item => item.currency));
        if (set.size === 0) {
            return [DEFAULT_CURRENCY];
        }
        const order = { TWD: 0, USD: 1 };
        return Array.from(set).sort((a, b) => {
            const aOrder = order[a] ?? 99;
            const bOrder = order[b] ?? 99;
            if (aOrder !== bOrder) {
                return aOrder - bOrder;
            }
            return a.localeCompare(b);
        });
    }, [normalizedDividendData]);

    const hasTwd = availableCurrencies.includes('TWD');
    const hasUsd = availableCurrencies.includes('USD');

    const fallbackView = hasTwd && hasUsd
        ? 'BOTH'
        : hasTwd
            ? 'TWD'
            : hasUsd
                ? 'USD'
                : 'TWD';

    const [viewMode, setViewMode] = useState(fallbackView);
    const [hasUserSetViewMode, setHasUserSetViewMode] = useState(false);

    useEffect(() => {
        if (!hasUserSetViewMode) {
            if (viewMode !== fallbackView) {
                setViewMode(fallbackView);
            }
            return;
        }
        if ((viewMode === 'TWD' && !hasTwd) || (viewMode === 'USD' && !hasUsd) || (viewMode === 'BOTH' && !(hasTwd && hasUsd))) {
            setViewMode(fallbackView);
        }
    }, [fallbackView, hasTwd, hasUsd, hasUserSetViewMode, viewMode]);

    const handleViewModeChange = (mode) => {
        setHasUserSetViewMode(true);
        setViewMode(mode);
    };

    const stockCurrencyMap = useMemo(() => {
        const map = {};
        normalizedDividendData.forEach(item => {
            if (!map[item.stock_id]) {
                map[item.stock_id] = item.currency;
            }
        });
        return map;
    }, [normalizedDividendData]);

    const baseCurrency = availableCurrencies[0] || DEFAULT_CURRENCY;

    const dividendStockIds = Array.from(new Set(dividendData.map(item => item.stock_id)));
    const allRelevantStockIds = Array.from(new Set([...holdingIds, ...dividendStockIds]));

    // 建立股票代號到名稱的對應（名稱由股息資料提供）
    const stockMap = {};
    allRelevantStockIds.forEach(id => {
        const info = (allDividendData || []).find(d => d.stock_id === id);
        stockMap[id] = stockNameMap[id] || info?.stock_name || '';
    });
    const myStocks = allRelevantStockIds.map(id => ({ stock_id: id, stock_name: stockMap[id] }));

    const activeCurrencies = useMemo(() => {
        if (viewMode === 'BOTH') {
            return availableCurrencies.length > 0 ? availableCurrencies : [DEFAULT_CURRENCY];
        }
        if (availableCurrencies.includes(viewMode)) {
            return [viewMode];
        }
        return availableCurrencies.length > 0 ? [availableCurrencies[0]] : [DEFAULT_CURRENCY];
    }, [availableCurrencies, viewMode]);

    const activeCurrencyKey = useMemo(() => activeCurrencies.join('|'), [activeCurrencies]);

    useEffect(() => {
        const updateStickyHeaderOffset = () => {
            const container = tableContainerRef.current;
            const table = tableElementRef.current;
            if (!container) {
                return;
            }
            if (!table) {
                container.style.removeProperty('--secondary-header-top');
                return;
            }
            const header = table.querySelector('thead');
            if (!header || header.rows.length < 2) {
                container.style.removeProperty('--secondary-header-top');
                return;
            }
            const firstRow = header.rows[0];
            if (!firstRow) {
                container.style.removeProperty('--secondary-header-top');
                return;
            }
            const height = firstRow.getBoundingClientRect().height;
            container.style.setProperty('--secondary-header-top', `${height}px`);
        };

        updateStickyHeaderOffset();
        window.addEventListener('resize', updateStickyHeaderOffset);
        return () => {
            window.removeEventListener('resize', updateStickyHeaderOffset);
        };
    }, [activeCurrencyKey, lang]);

    const viewDescriptionContent = useMemo(() => {
        if (activeCurrencies.length === 1) {
            const currency = activeCurrencies[0];
            return lang === 'en'
                ? CURRENCY_NAME_EN[currency] || `${currency} dividends`
                : CURRENCY_NAME_ZH[currency] || `${currency} 股息`;
        }
        const names = activeCurrencies.map(currency => (lang === 'en'
            ? (currency === 'USD' ? 'US$ dividends' : 'NT$ dividends')
            : (currency === 'USD' ? '美股股息' : '台股配息')));
        return lang === 'en'
            ? names.join(' & ')
            : names.join('、');
    }, [activeCurrencies, lang]);

    const viewLabelPrefix = lang === 'en' ? 'Showing:' : '顯示：';

    const currencyUnitZh = (currency) => (currency === 'USD' ? '美元' : '元');
    const currencyHeaderLabel = (currency) => (currency === 'USD' ? 'US$' : 'NT$');
    const formatDividendAmount = (value) => {
        const num = Number(value);
        if (!Number.isFinite(num)) {
            return value;
        }
        return num.toFixed(3);
    };

    const formatCurrencyValue = (currency, value, { allowZero = false } = {}) => {
        if (!Number.isFinite(value)) return '';
        if (!allowZero && value === 0) return '';
        const symbol = CURRENCY_SYMBOLS[currency] || `${currency} `;
        const isUsd = currency === 'USD';
        const normalizedValue = isUsd ? value : Math.round(value);
        const formatOptions = isUsd
            ? { minimumFractionDigits: 3, maximumFractionDigits: 3 }
            : undefined;
        return `${symbol}${normalizedValue.toLocaleString(undefined, formatOptions)}`;
    };

    const formatPlainAmount = (value, { allowZero = false, currency } = {}) => {
        if (!Number.isFinite(value)) return '';
        if (!allowZero && value === 0) return '';
        const isUsd = currency === 'USD';
        const normalizedValue = isUsd ? value : Math.round(value);
        const formatOptions = isUsd
            ? { minimumFractionDigits: 3, maximumFractionDigits: 3 }
            : undefined;
        return normalizedValue.toLocaleString(undefined, formatOptions);
    };

    // Events for calendar view
    const calendarEvents = dividendData.flatMap(item => {
        const holdingDate = item.dividend_date || item.payment_date;
        const qty = getHolding(item.stock_id, holdingDate);
        const dividend = parseFloat(item.dividend);
        const amount = dividend * qty;
        const dividend_yield = parseFloat(item.dividend_yield) || 0;
        const normalizedCurrency = normalizeCurrency(item.currency);
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
                currency: normalizedCurrency,
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
                currency: normalizedCurrency,
            });
        }
        return arr;
    });

    const filteredCalendarEvents = calendarEvents.filter(ev => {
        const matchesType = calendarFilter === 'both' || ev.type === calendarFilter;
        if (!matchesType) {
            return false;
        }
        const currency = ev.currency || DEFAULT_CURRENCY;
        return activeCurrencies.includes(currency);
    });

    const getAverageCostBeforeDate = useCallback((stockId, dateStr) => {
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
    }, [historyByStock]);

    const currencyContexts = useMemo(() => {
        const currenciesForContext = availableCurrencies.length > 0 ? availableCurrencies : [DEFAULT_CURRENCY];
        const contextMap = {};
        currenciesForContext.forEach(currency => {
            const stocksForCurrency = myStocks.filter(stock => {
                const mapped = stockCurrencyMap[stock.stock_id];
                if (mapped) {
                    return mapped === currency;
                }
                return currency === baseCurrency;
            });

            const dividendTable = {};
            stocksForCurrency.forEach(stock => {
                dividendTable[stock.stock_id] = {};
            });

            normalizedDividendData.forEach(item => {
                if (item.currency !== currency) return;
                const thisDate = item.dividend_date || item.payment_date;
                if (!thisDate) return;
                const month = new Date(thisDate).getMonth();
                const stockId = item.stock_id;
                if (!dividendTable[stockId]) {
                    dividendTable[stockId] = {};
                }
                const dividend = parseFloat(item.dividend);
                const quantity = getHolding(stockId, thisDate);
                const avgCost = getAverageCostBeforeDate(stockId, thisDate);
                const costBasis = avgCost > 0 && quantity > 0 ? avgCost * quantity : 0;
                dividendTable[stockId][month] = {
                    dividend,
                    quantity,
                    dividend_date: item.dividend_date,
                    payment_date: item.payment_date,
                    last_close_price: item.last_close_price,
                    dividend_yield: item.dividend_yield,
                    avg_cost: avgCost,
                    cost_basis: costBasis,
                    currency: item.currency,
                };
            });

            const totalPerStock = {};
            const totalYield = {};
            const latestClosePrice = {};
            const monthsCount = {};

            stocksForCurrency.forEach(stock => {
                totalPerStock[stock.stock_id] = 0;
                totalYield[stock.stock_id] = 0;
                latestClosePrice[stock.stock_id] = null;
                monthsCount[stock.stock_id] = 0;
                for (let m = 0; m < 12; m++) {
                    const cell = dividendTable[stock.stock_id]?.[m];
                    if (cell && cell.dividend && cell.quantity) {
                        const amt = cell.dividend * cell.quantity;
                        totalPerStock[stock.stock_id] += amt;
                        totalYield[stock.stock_id] += parseFloat(cell.dividend_yield) || 0;
                        monthsCount[stock.stock_id] = m + 1;

                        if (!latestClosePrice[stock.stock_id] || new Date(cell.dividend_date) > new Date(latestClosePrice[stock.stock_id].date)) {
                            latestClosePrice[stock.stock_id] = { price: cell.last_close_price, date: cell.dividend_date };
                        }
                    }
                }
            });

            contextMap[currency] = {
                stocks: stocksForCurrency,
                dividendTable,
                totalPerStock,
                totalYield,
                latestClosePrice,
                monthsCount,
            };
        });
        return contextMap;
    }, [availableCurrencies, myStocks, stockCurrencyMap, baseCurrency, normalizedDividendData, getAverageCostBeforeDate, getHolding]);

    const handleSort = (column) => {
        setSortConfig(prev => {
            if (prev.column === column) {
                return { column, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
            }
            return { column, direction: 'asc' };
        });
    };

    const hasActiveMonthFilters = monthFilters.some(Boolean);

    const combinedStocksMap = {};
    activeCurrencies.forEach(currency => {
        const context = currencyContexts[currency];
        if (!context) return;
        context.stocks.forEach(stock => {
            combinedStocksMap[stock.stock_id] = stock;
        });
    });
    const combinedStocks = Object.values(combinedStocksMap);

    const getTotalForStockByCurrency = (stockId, currency) => {
        const context = currencyContexts[currency];
        if (!context) return 0;
        if (!hasActiveMonthFilters) {
            return context.totalPerStock[stockId] || 0;
        }
        const table = context.dividendTable[stockId] || {};
        return MONTHS.reduce((acc, _m, idx) => {
            if (!monthFilters[idx]) return acc;
            const cell = table[idx];
            if (cell && cell.dividend && cell.quantity) {
                return acc + cell.dividend * cell.quantity;
            }
            return acc;
        }, 0);
    };

    const getTotalForStock = (stockId) => {
        return activeCurrencies.reduce((sum, currency) => sum + getTotalForStockByCurrency(stockId, currency), 0);
    };

    const getYieldInfo = (stockId) => {
        const detail = {};
        let maxMonthsCount = 0;
        activeCurrencies.forEach(currency => {
            const context = currencyContexts[currency];
            if (!context) return;
            if (!hasActiveMonthFilters) {
                const sumYield = context.totalYield[stockId] || 0;
                const monthsCount = context.monthsCount[stockId] || 0;
                detail[currency] = { sumYield, monthsCount };
                if (monthsCount > maxMonthsCount) {
                    maxMonthsCount = monthsCount;
                }
                return;
            }
            let sumYield = 0;
            let lastMonth = 0;
            for (let idx = 0; idx < 12; idx++) {
                if (!monthFilters[idx]) continue;
                const cell = context.dividendTable[stockId]?.[idx];
                if (cell && cell.dividend && cell.quantity) {
                    sumYield += parseFloat(cell.dividend_yield) || 0;
                    lastMonth = idx + 1;
                }
            }
            detail[currency] = { sumYield, monthsCount: lastMonth };
            if (lastMonth > maxMonthsCount) {
                maxMonthsCount = lastMonth;
            }
        });
        const sumYield = Object.values(detail).reduce((sum, info) => sum + (info?.sumYield || 0), 0);
        return { sumYield, monthsCount: maxMonthsCount, detail };
    };

    const sortedStocks = [...combinedStocks].sort((a, b) => {
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
            const aVal = activeCurrencies.reduce((sum, currency) => {
                const cell = currencyContexts[currency]?.dividendTable[a.stock_id]?.[idx];
                if (cell && cell.dividend && cell.quantity) {
                    return sum + cell.dividend * cell.quantity;
                }
                return sum;
            }, 0);
            const bVal = activeCurrencies.reduce((sum, currency) => {
                const cell = currencyContexts[currency]?.dividendTable[b.stock_id]?.[idx];
                if (cell && cell.dividend && cell.quantity) {
                    return sum + cell.dividend * cell.quantity;
                }
                return sum;
            }, 0);
            return (aVal - bVal) * dir;
        }
        return 0;
    });

    const filteredStocks = sortedStocks.filter(stock => {
        if (!hasActiveMonthFilters) {
            return true;
        }
        return activeCurrencies.some(currency => {
            const table = currencyContexts[currency]?.dividendTable[stock.stock_id];
            if (!table) return false;
            return monthFilters.some((active, idx) => {
                if (!active) return false;
                const cell = table[idx];
                return Boolean(cell && cell.dividend && cell.quantity);
            });
        });
    });

    const monthlyTotalsByCurrency = {};
    const monthlyCostsByCurrency = {};
    const monthlyCostDetailsByCurrency = {};
    const grandTotalsByCurrency = {};
    const avgPerMonthByCurrency = {};
    const aggregatedMonthlyTotals = Array(12).fill(0);

    activeCurrencies.forEach(currency => {
        const context = currencyContexts[currency];
        const totals = Array(12).fill(0);
        const costs = Array(12).fill(0);
        const details = Array.from({ length: 12 }, () => []);
        if (context) {
            filteredStocks.forEach(stock => {
                for (let idx = 0; idx < 12; idx++) {
                    const cell = context.dividendTable[stock.stock_id]?.[idx];
                    if (cell && cell.dividend && cell.quantity) {
                        const total = cell.dividend * cell.quantity;
                        totals[idx] += total;
                        const cost = Number(cell.cost_basis) || 0;
                        if (cost > 0) {
                            costs[idx] += cost;
                            details[idx].push({
                                stockId: stock.stock_id,
                                stockName: stock.stock_name,
                                quantity: cell.quantity,
                            });
                        }
                    }
                }
            });
        }
        monthlyTotalsByCurrency[currency] = totals;
        monthlyCostsByCurrency[currency] = costs;
        monthlyCostDetailsByCurrency[currency] = details;
        const grandTotal = totals.reduce((sum, val) => sum + val, 0);
        grandTotalsByCurrency[currency] = grandTotal;
        let monthsForAverage = 0;
        for (let m = 11; m >= 0; m--) {
            if (totals[m] > 0) {
                monthsForAverage = m + 1;
                break;
            }
        }
        avgPerMonthByCurrency[currency] = monthsForAverage > 0 ? grandTotal / monthsForAverage : 0;
        for (let idx = 0; idx < 12; idx++) {
            aggregatedMonthlyTotals[idx] += totals[idx];
        }
    });

    const aggregatedGrandTotal = aggregatedMonthlyTotals.reduce((sum, val) => sum + val, 0);
    let aggregatedMonthsForAverage = 0;
    for (let m = 11; m >= 0; m--) {
        if (aggregatedMonthlyTotals[m] > 0) {
            aggregatedMonthsForAverage = m + 1;
            break;
        }
    }
    const aggregatedAvgPerMonth = aggregatedMonthsForAverage > 0 ? aggregatedGrandTotal / aggregatedMonthsForAverage : 0;
    const totalColumns = 2 + (MONTHS.length * activeCurrencies.length);

    const donutDataByCurrency = useMemo(() => {
        const map = {};
        Object.entries(currencyContexts).forEach(([currency, context]) => {
            if (!context) return;
            const entries = context.stocks
                .map(stock => {
                    const total = context.totalPerStock?.[stock.stock_id] || 0;
                    const yearEndDate = `${selectedYear}-12-31`;
                    const quantity = Math.max(getHolding(stock.stock_id, yearEndDate), 0);
                    const avgCost = getAverageCostBeforeDate(stock.stock_id, yearEndDate);
                    const investment = avgCost > 0 && quantity > 0 ? avgCost * quantity : 0;
                    return {
                        id: stock.stock_id,
                        title: stock.stock_id,
                        label: stock.stock_name
                            ? `${stock.stock_id} ${stock.stock_name}`.trim()
                            : stock.stock_id,
                        total,
                        quantity,
                        investment
                    };
                })
                .filter(entry => entry.total > 0);
            if (!entries.length) {
                return;
            }
            entries.sort((a, b) => b.total - a.total);
            const sliceCount = Math.min(6, entries.length);
            const topItems = entries.slice(0, sliceCount);
            const others = entries.slice(sliceCount);
            const othersTotal = others.reduce((sum, entry) => sum + entry.total, 0);
            if (othersTotal > 0) {
                topItems.push({
                    id: 'others',
                    label: lang === 'en' ? 'Others' : '其他',
                    total: othersTotal,
                    quantity: others.reduce((sum, entry) => sum + (entry.quantity || 0), 0),
                    investment: others.reduce((sum, entry) => sum + (entry.investment || 0), 0)
                });
            }
            const totalSum = entries.reduce((sum, entry) => sum + entry.total, 0);
            map[currency] = {
                total: totalSum,
                slices: topItems
            };
        });
        return map;
    }, [currencyContexts, lang, selectedYear, getHolding, getAverageCostBeforeDate]);

    const donutCurrencies = useMemo(
        () => Object.keys(donutDataByCurrency),
        [donutDataByCurrency]
    );

    const [donutCurrency, setDonutCurrency] = useState(null);
    const [donutSelectedIndex, setDonutSelectedIndex] = useState(null);

    useEffect(() => {
        if (donutCurrencies.length === 0) {
            setDonutCurrency(null);
            setDonutSelectedIndex(null);
            return;
        }
        if (!donutCurrency || !donutCurrencies.includes(donutCurrency)) {
            setDonutCurrency(donutCurrencies[0]);
            setDonutSelectedIndex(null);
        }
    }, [donutCurrencies, donutCurrency]);

    const activeDonutData = donutCurrency ? donutDataByCurrency[donutCurrency] : null;

    const handleDonutCurrencyChange = useCallback((currency) => {
        setDonutCurrency(currency);
        setDonutSelectedIndex(null);
    }, []);

    const handleDonutSelect = useCallback((index) => {
        setDonutSelectedIndex(prev => (prev === index ? null : index));
    }, []);

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
            <div style={{ display: "flex", alignItems: "center", margin: "10px 0 0 0", gap: "12px", flexWrap: 'wrap'}}>
                <h3>{selectedYear} {lang === 'en' ? 'Dividend Overview' : '配息總覽'}</h3>
                <CurrencyViewToggle
                    viewMode={viewMode}
                    onChange={handleViewModeChange}
                    hasTwd={hasTwd}
                    hasUsd={hasUsd}
                    lang={lang}
                    description={viewDescriptionContent}
                    labelPrefix={viewLabelPrefix}
                />
            </div>
            {activeDonutData && (
                <section className="donut-section">
                    <div className="chart-header">
                        <h4 style={{ margin: 0 }}>{t('dividend_donut_heading')}</h4>
                        {donutCurrencies.length > 1 && (
                            <div className="dividend-chart-currency-switch">
                                <span className="currency-switch-label">
                                    {t('dividend_currency_label')}
                                </span>
                                <div className="currency-pill-group" role="group" aria-label={t('dividend_currency_label')}>
                                    {donutCurrencies.map((currency) => (
                                        <button
                                            key={`donut-currency-${currency}`}
                                            type="button"
                                            className={
                                                currency === donutCurrency
                                                    ? 'currency-pill currency-pill--active'
                                                    : 'currency-pill currency-pill--inactive'
                                            }
                                            aria-pressed={currency === donutCurrency}
                                            onClick={() => handleDonutCurrencyChange(currency)}
                                        >
                                            {currency}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    <DividendDonut
                        slices={activeDonutData.slices}
                        currency={donutCurrency}
                        formatValue={formatCurrencyValue}
                        t={t}
                        lang={lang}
                        selectedIndex={donutSelectedIndex}
                        onSelect={handleDonutSelect}
                    />
                </section>
            )}
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
            <table className="table table-bordered table-striped" ref={tableElementRef}>
                <thead>
                    <tr>
                        <th className="stock-col" rowSpan={activeCurrencies.length > 1 ? 2 : 1}
                            style={{
                                outline: "1px solid var(--color-border)",   // 外框顏色與粗細
                                outlineOffset: "-1px",            // 可選，讓框貼近內容
                                padding: "6px"                    // 可選，讓文字不擠
                            }}    
                        >
                            <span className="sortable" onClick={() => handleSort('stock_id')}>
                                {lang === 'en' ? 'Ticker/Name' : '股票代碼/名稱'}
                                {sortConfig.column === 'stock_id' && (
                                    <span className="sort-indicator">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>
                                )}
                            </span>
                        </th>
                        <th rowSpan={activeCurrencies.length > 1 ? 2 : 1}>
                            <span className="sortable" onClick={() => handleSort('total')}>
                                {lang === 'en' ? 'Total' : '總計'}
                                {sortConfig.column === 'total' && (
                                    <span className="sort-indicator">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>
                                )}
                            </span>
                        </th>
                        {MONTHS.map((m, idx) => (
                            <th
                                key={`month-${idx}`}
                                className={idx === currentMonth ? 'current-month' : ''}
                                colSpan={activeCurrencies.length}
                                style={{ minWidth: MONTH_COL_WIDTH * activeCurrencies.length }}
                            >
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
                    {activeCurrencies.length > 1 && (
                        <tr>
                            {MONTHS.map((m, idx) => (
                                activeCurrencies.map(currency => (
                                    <th
                                        key={`month-${idx}-${currency}`}
                                        className={idx === currentMonth ? 'current-month' : ''}
                                        style={{ width: MONTH_COL_WIDTH }}
                                    >
                                        {currencyHeaderLabel(currency)}
                                    </th>
                                ))
                            ))}
                        </tr>
                    )}
                </thead>
                <tbody>
                    {filteredStocks.length === 0 ? (
                        <tr>
                            <td 
                                style={{
                                    outline: "1px solid var(--color-border)",   // 外框顏色與粗細
                                    outlineOffset: "-1px",            // 可選，讓框貼近內容
                                    padding: "6px"                    // 可選，讓文字不擠
                                }}
                            colSpan={totalColumns}>
                                {hasActiveMonthFilters
                                    ? (lang === 'en' ? 'No dividends match the selected filters' : '目前篩選條件下沒有配息紀錄')
                                    : (lang === 'en' ? 'No holdings, please add transactions first' : '尚無庫存，請先新增交易紀錄')}
                            </td>
                        </tr>
                    ) : (
                        <>
                            <tr>
                                <td
                                    style={{
                                    outline: "1px solid var(--color-border)",   // 外框顏色與粗細
                                    outlineOffset: "-1px",            // 可選，讓框貼近內容
                                    padding: "6px"                    // 可選，讓文字不擠
                                }}
                                >{lang === 'en' ? 'Dividend Cost' : '配息成本'}</td>
                                <td></td>
                                {MONTHS.map((m, idx) => (
                                    activeCurrencies.map(currency => {
                                        const totals = monthlyCostsByCurrency[currency] || [];
                                        const details = monthlyCostDetailsByCurrency[currency]?.[idx] || [];
                                        const total = totals[idx] || 0;
                                        const hasTooltip = details.length > 0;
                                        const tooltip = hasTooltip
                                            ? [
                                                lang === 'en'
                                                    ? `${currencyHeaderLabel(currency)} holdings before ex-dividend:`
                                                    : `${currencyHeaderLabel(currency)}除息前持有：`,
                                                ...details.map(detail => {
                                                    const label = detail.stockName
                                                        ? `${detail.stockId} ${detail.stockName}`.trim()
                                                        : detail.stockId;
                                                    const lots = formatLots(detail.quantity);
                                                    return lang === 'en'
                                                        ? `${label} - ${lots} lots`
                                                        : `${label} - ${lots} 張`;
                                                })
                                            ].join('\n')
                                            : '';
                                        return (
                                            <td key={`cost-${idx}-${currency}`} className={idx === currentMonth ? 'current-month' : ''} style={{ width: MONTH_COL_WIDTH }}>
                                                {total > 0 ? (
                                                    hasTooltip ? (
                                                        <TooltipText
                                                            tooltip={tooltip}
                                                            style={{ borderBottom: '1px dotted #777' }}
                                                        >
                                                            {formatPlainAmount(total, { currency })}
                                                        </TooltipText>
                                                    ) : formatPlainAmount(total, { currency })
                                                ) : ''}
                                            </td>
                                        );
                                    })
                                ))}
                            </tr>
                            <tr>
                                <td 
                                    style={{
                                        outline: "1px solid var(--color-border)",   // 外框顏色與粗細
                                        outlineOffset: "-1px",            // 可選，讓框貼近內容
                                        padding: "6px"                    // 可選，讓文字不擠
                                    }}
                                >{lang === 'en' ? 'Monthly Total' : '月合計'}</td>
                                <td>
                                    {(() => {
                                        const currencySummaries = activeCurrencies
                                            .map(currency => ({
                                                currency,
                                                total: grandTotalsByCurrency[currency] || 0,
                                                avg: avgPerMonthByCurrency[currency] || 0,
                                            }))
                                            .filter(item => item.total > 0);
                                        if (currencySummaries.length === 0) {
                                            return '';
                                        }
                                        const tooltipLines = currencySummaries.map(({ currency, total, avg }) => (
                                            lang === 'en'
                                                ? `${currencyHeaderLabel(currency)} total: ${formatCurrencyValue(currency, total, { allowZero: true })}\nAvg per month: ${formatCurrencyValue(currency, avg, { allowZero: true })}`
                                                : `${currencyHeaderLabel(currency)}總計: ${formatCurrencyValue(currency, total, { allowZero: true })}\n每月平均: ${formatCurrencyValue(currency, avg, { allowZero: true })}`
                                        ));
                                        if (currencySummaries.length > 1) {
                                            tooltipLines.push(
                                                lang === 'en'
                                                    ? `Combined avg per month: ${formatPlainAmount(aggregatedAvgPerMonth, { allowZero: true })}`
                                                    : `加總每月平均: ${formatPlainAmount(aggregatedAvgPerMonth, { allowZero: true })}`
                                            );
                                        }
                                        const content = currencySummaries.length === 1
                                            ? formatCurrencyValue(currencySummaries[0].currency, currencySummaries[0].total, { allowZero: true })
                                            : (
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
                                                    {currencySummaries.map(({ currency, total }) => (
                                                        <span key={`monthly-total-${currency}`}>
                                                            {formatCurrencyValue(currency, total, { allowZero: true })}
                                                        </span>
                                                    ))}
                                                </div>
                                            );
                                        return (
                                            <TooltipText
                                                tooltip={tooltipLines.join('\n\n')}
                                                style={{ borderBottom: '1px dotted #777' }}
                                            >
                                                {content}
                                            </TooltipText>
                                        );
                                    })()}
                                </td>
                                {MONTHS.map((m, idx) => (
                                    activeCurrencies.map(currency => {
                                        const totals = monthlyTotalsByCurrency[currency] || [];
                                        const total = totals[idx] || 0;
                                        return (
                                            <td key={`total-${idx}-${currency}`} className={idx === currentMonth ? 'current-month' : ''} style={{ width: MONTH_COL_WIDTH }}>
                                                {total > 0 ? formatPlainAmount(total, { currency }) : ''}
                                            </td>
                                        );
                                    })
                                ))}
                            </tr>
                            {filteredStocks.map(stock => {
                                const totalsByCurrency = {};
                                activeCurrencies.forEach(currency => {
                                    totalsByCurrency[currency] = getTotalForStockByCurrency(stock.stock_id, currency);
                                });
                                const stockTotal = Object.values(totalsByCurrency).reduce((sum, val) => sum + val, 0);
                                const { detail: yieldDetail } = getYieldInfo(stock.stock_id);
                                const totalTooltipLines = activeCurrencies.map(currency => {
                                    const info = yieldDetail[currency];
                                    if (!info) return null;
                                    const context = currencyContexts[currency];
                                    const latest = context?.latestClosePrice[stock.stock_id]?.price ?? '-';
                                    const monthsCount = info.monthsCount || 0;
                                    const avgYield = monthsCount > 0 ? info.sumYield / monthsCount : 0;
                                    const estAnnual = avgYield * 12;
                                    if (lang === 'en') {
                                        return `${currencyHeaderLabel(currency)} - Latest close: ${latest}\nSum yield: ${info.sumYield.toFixed(1)}%\nEst. annual yield: ${estAnnual.toFixed(1)}%`;
                                    }
                                    return `${currencyHeaderLabel(currency)}：最新收盤價 ${latest}\n加總殖利率 ${info.sumYield.toFixed(1)}%\n預估年化殖利率 ${estAnnual.toFixed(1)}%`;
                                }).filter(Boolean);

                                const hasName = Boolean(stock.stock_name);
                                const displayText = hasName
                                    ? `${stock.stock_id}`
                                    : stock.stock_id;
                                const tooltipText = stock.stock_name || stock.stock_id;

                                return (
                                    <tr key={stock.stock_id + stock.stock_name}>
                                        <td className="stock-col" 
                                            style={{
                                                outline: "1px solid var(--color-border)",   // 外框顏色與粗細
                                                outlineOffset: "-1px",            // 可選，讓框貼近內容
                                                padding: "6px"                    // 可選，讓文字不擠
                                            }}
                                        >
                                            <a href={`${HOST_URL}/stock/${stock.stock_id}`} target="_blank" rel="noreferrer">
                                                <TooltipText tooltip={tooltipText}>
                                                    {displayText}
                                                </TooltipText>
                                            </a>
                                        </td>
                                        <td>{stockTotal > 0 ? (() => {
                                            const displayValues = activeCurrencies
                                                .map(currency => ({
                                                    currency,
                                                    value: totalsByCurrency[currency] || 0,
                                                }))
                                                .filter(item => item.value > 0)
                                                .map(item => ({
                                                    ...item,
                                                    text: formatCurrencyValue(item.currency, item.value, { allowZero: true }),
                                                }));
                                            if (displayValues.length === 0) {
                                                return '';
                                            }
                                            const content = displayValues.length === 1
                                                ? displayValues[0].text
                                                : (
                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
                                                        {displayValues.map(item => (
                                                            <span key={`stock-total-${stock.stock_id}-${item.currency}`}>
                                                                {item.text}
                                                            </span>
                                                        ))}
                                                    </div>
                                                );
                                            if (totalTooltipLines.length > 0) {
                                                return (
                                                    <TooltipText
                                                        tooltip={totalTooltipLines.join('\n\n')}
                                                        style={{ borderBottom: '1px dotted #777' }}
                                                    >
                                                        {content}
                                                    </TooltipText>
                                                );
                                            }
                                            return content;
                                        })() : ''}</td>
                                        {MONTHS.map((m, idx) => (
                                            activeCurrencies.map(currency => {
                                                const cell = currencyContexts[currency]?.dividendTable[stock.stock_id]?.[idx];
                                                if (!cell || !cell.dividend || !cell.quantity) {
                                                    return <td key={`cell-${stock.stock_id}-${idx}-${currency}`} className={idx === currentMonth ? 'current-month' : ''} style={{ width: MONTH_COL_WIDTH }}></td>;
                                                }
                                                const total = cell.dividend * cell.quantity;
                                                const currencySymbol = CURRENCY_SYMBOLS[currency] || `${currency} `;
                                                const lotText = (cell.quantity / 1000).toFixed(3).replace(/\.?0+$/, '');
                                                const quantityLineEn = currency === 'USD'
                                                    ? `Shares held: ${cell.quantity}`
                                                    : `Shares held: ${cell.quantity} (${lotText} lots)`;
                                                const quantityLineZh = currency === 'USD'
                                                    ? `持有數量: ${cell.quantity} 股`
                                                    : `持有數量: ${cell.quantity} 股 (${lotText} 張)`;
                                                const dividendPerShareEn = `Dividend per share: ${currencySymbol}${formatDividendAmount(cell.dividend)}`;
                                                const dividendPerShareZh = `每股配息: ${formatDividendAmount(cell.dividend)} ${currencyUnitZh(currency)}`;
                                                const tooltipContent = lang === 'en'
                                                    ? `${quantityLineEn}\n${dividendPerShareEn}\nClose before ex-date: ${cell.last_close_price}\nYield this time: ${cell.dividend_yield}\nEx-dividend date: ${cell.dividend_date || '-'}\nPayment date: ${cell.payment_date || '-'}`
                                                    : `${quantityLineZh}\n${dividendPerShareZh}\n除息前一天收盤價: ${cell.last_close_price}\n當次殖利率: ${cell.dividend_yield}\n配息日期: ${cell.dividend_date || '-'}\n發放日期: ${cell.payment_date || '-'}`;

                                                // const paymentDate = cell.payment_date ? formatShortDate(cell.payment_date) : null;
                                                // const dividendDate = cell.dividend_date ? formatShortDate(cell.dividend_date) : null;
                                                // const closePrice = (cell.last_close_price !== undefined && cell.last_close_price !== null && cell.last_close_price !== '')
                                                    // ? cell.last_close_price
                                                    // : null;
                                                return (
                                                    <td key={`cell-${stock.stock_id}-${idx}-${currency}`} className={idx === currentMonth ? 'current-month' : ''} style={{ width: MONTH_COL_WIDTH }}>
                                                        <TooltipText
                                                            tooltip={tooltipContent}
                                                            style={{ borderBottom: '1px dotted #777' }}
                                                        >
                                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                                                                <span>{total > 0 ? formatPlainAmount(total, { currency }) : ''}</span>
                                                            </div>
                                                        </TooltipText>
                                                    </td>
                                                );
                                            })
                                        ))}
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
                    ? 'Tip: tap or hover numbers to see holdings, per-share dividends, dates, prices and yield details.'
                    : '提示：點擊或滑鼠移到數字可看持股、每股配息及日期、價格與殖利率細節。'}
            </p>
        </div>
    );
}
