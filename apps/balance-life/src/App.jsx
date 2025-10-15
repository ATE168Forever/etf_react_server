import { useMemo, useState } from 'react'
import {
  addMonths,
  endOfMonth,
  format,
  isAfter,
  isBefore,
  isWithinInterval,
  parseISO,
  startOfDay,
  startOfMonth,
  differenceInCalendarDays,
  differenceInCalendarMonths,
} from 'date-fns'
import { rrulestr } from 'rrule'

const currencyTemplates = {
  TWD: { label: '新台幣 (TWD)', symbol: 'NT$' },
  USD: { label: '美元 (USD)', symbol: 'US$' },
}

const rruleTemplates = [
  { label: '每月 5 號', value: 'FREQ=MONTHLY;BYMONTHDAY=5' },
  {
    label: '雙月 (偶數月) 10 號',
    value: 'FREQ=MONTHLY;INTERVAL=2;BYMONTH=2,4,6,8,10,12;BYMONTHDAY=10',
  },
  {
    label: '季末最後一天',
    value: 'FREQ=MONTHLY;BYMONTH=3,6,9,12;BYMONTHDAY=-1',
  },
  {
    label: '每年 4 月 15 號',
    value: 'FREQ=YEARLY;BYMONTH=4;BYMONTHDAY=15',
  },
]

const initialItems = [
  {
    id: 'salary',
    type: 'income',
    category: '薪資',
    name: '軟體工程師薪資',
    amount: 85000,
    currency: 'TWD',
    account: '薪資帳戶',
    rrule: 'FREQ=MONTHLY;BYMONTHDAY=5',
    start_date: '2023-01-05',
    notes: '含基本薪與固定加班費',
    enabled: true,
  },
  {
    id: 'mortgage',
    type: 'expense',
    category: '房貸',
    name: '房貸-XX銀行',
    amount: 32000,
    currency: 'TWD',
    account: '房貸扣款戶',
    rrule: 'FREQ=MONTHLY;BYMONTHDAY=1',
    start_date: '2022-07-01',
    notes: '等額本息，利率 1.8%',
    enabled: true,
  },
  {
    id: 'tuition',
    type: 'expense',
    category: '學費',
    name: '孩子雙語學校學費',
    amount: 60000,
    currency: 'TWD',
    account: '家庭帳戶',
    rrule: 'FREQ=YEARLY;BYMONTH=9;BYMONTHDAY=10',
    start_date: '2024-09-10',
    notes: '秋季開學前繳清',
    enabled: true,
  },
  {
    id: 'insurance',
    type: 'expense',
    category: '保險',
    name: '全家醫療險',
    amount: 12000,
    currency: 'TWD',
    account: '信用卡',
    rrule: 'FREQ=YEARLY;BYMONTH=4;BYMONTHDAY=15',
    start_date: '2022-04-15',
    indexation: { type: 'annual', rate: 0.03 },
    notes: '年年調升 3%',
    enabled: true,
  },
  {
    id: 'dividend',
    type: 'income',
    category: '股息',
    name: '美股ETF股息',
    amount: 400,
    currency: 'USD',
    account: '券商帳戶',
    rrule: 'FREQ=MONTHLY;BYMONTH=3,6,9,12;BYMONTHDAY=-1',
    start_date: '2023-03-31',
    notes: '季配息，除息後 1 個月到帳',
    enabled: true,
  },
  {
    id: 'investment',
    type: 'expense',
    category: '固定投資',
    name: 'ETF定期定額',
    amount: 15000,
    currency: 'TWD',
    account: '券商帳戶',
    rrule: 'FREQ=MONTHLY;BYMONTHDAY=25',
    start_date: '2023-01-25',
    notes: '可透過情境切換暫停',
    enabled: true,
  },
]

const defaultRates = {
  TWD: 1,
  USD: 32,
}

const toNumber = (value) => {
  const parsed = Number.parseFloat(value)
  return Number.isNaN(parsed) ? 0 : parsed
}

const convertCurrency = (amount, from, to, rates) => {
  if (!rates[from] || !rates[to]) return amount
  const amountInTWD = amount * rates[from]
  return amountInTWD / rates[to]
}

const formatBase = (amount, baseCurrency) => {
  const template = currencyTemplates[baseCurrency] || { symbol: '' }
  const hasFraction = Math.abs(amount % 1) > 0
  const formatOptions = hasFraction
    ? { minimumFractionDigits: 1, maximumFractionDigits: 2 }
    : { minimumFractionDigits: 0, maximumFractionDigits: 0 }

  return `${template.symbol}${amount.toLocaleString(undefined, formatOptions)}`
}

const buildRule = (item) => {
  if (!item.rrule) return null
  try {
    const dtstart = item.start_date ? parseISO(item.start_date) : new Date()
    return rrulestr(item.rrule, { dtstart })
  } catch (error) {
    console.warn('Failed to parse rrule', item.rrule, error)
    return null
  }
}

const getOccurrences = (item, windowStart, windowEnd) => {
  const rule = buildRule(item)
  if (!rule) return []

  const occurrences = rule.between(windowStart, windowEnd, true)

  return occurrences
    .filter((date) => {
      const startDate = item.start_date ? parseISO(item.start_date) : null
      const endDate = item.end_date ? parseISO(item.end_date) : null
      if (startDate && isBefore(date, startDate)) return false
      if (endDate && isAfter(date, endDate)) return false
      return true
    })
    .map((date) => startOfDay(date))
}

const calculateIndexationMultiplier = (item, date) => {
  if (!item.indexation || item.indexation.type !== 'annual') return 1
  if (!item.start_date) return 1
  const startDate = parseISO(item.start_date)
  const monthsDiff = differenceInCalendarMonths(date, startDate)
  if (monthsDiff <= 0) return 1
  const years = monthsDiff / 12
  return (1 + item.indexation.rate) ** years
}

const groupByMonth = (occurrences, items, baseCurrency, rates) => {
  const start = startOfMonth(new Date())
  const months = Array.from({ length: 12 }, (_, index) => {
    const monthDate = addMonths(start, index)
    const key = format(monthDate, 'yyyy-MM')
    return {
      key,
      monthDate,
      label: format(monthDate, 'yyyy MMM'),
      items: [],
      income: 0,
      expense: 0,
    }
  })

  const bucketMap = new Map(months.map((month) => [month.key, month]))

  items.forEach((item) => {
    const itemOccurrences = occurrences[item.id] || []
    itemOccurrences.forEach((date) => {
      const key = format(date, 'yyyy-MM')
      const bucket = bucketMap.get(key)
      if (!bucket) return
      const multiplier = calculateIndexationMultiplier(item, date)
      const adjustedAmount = item.amount * multiplier
      const signedAmount = item.type === 'expense' ? -adjustedAmount : adjustedAmount
      const baseAmount = convertCurrency(adjustedAmount, item.currency, baseCurrency, rates)
      const signedBase = item.type === 'expense' ? -baseAmount : baseAmount
      const record = {
        id: `${item.id}-${date.toISOString()}`,
        date,
        name: item.name,
        category: item.category,
        type: item.type,
        currency: item.currency,
        amount: adjustedAmount,
        baseAmount: baseAmount,
        notes: item.notes,
      }
      bucket.items.push(record)
      if (item.type === 'income') {
        bucket.income += signedBase
      } else {
        bucket.expense += baseAmount
      }
    })
  })

  return months.map((month) => ({
    ...month,
    expense: Number(month.expense.toFixed(2)),
    income: Number(month.income.toFixed(2)),
    net: Number((month.income - month.expense).toFixed(2)),
  }))
}

const buildCalendarEvents = (occurrences, items, baseCurrency, rates) => {
  const events = []
  Object.entries(occurrences).forEach(([itemId, dates]) => {
    const item = items.find((candidate) => candidate.id === itemId)
    if (!item) return
    dates.forEach((date) => {
      const multiplier = calculateIndexationMultiplier(item, date)
      const adjustedAmount = item.amount * multiplier
      events.push({
        id: `${item.id}-${date.toISOString()}`,
        date,
        item,
        adjustedAmount,
        baseAmount: convertCurrency(adjustedAmount, item.currency, baseCurrency, rates),
      })
    })
  })

  return events.sort((a, b) => a.date - b.date)
}

const determineWarnings = (months, cashProjection, safetyLine, upcomingEvents, baseCurrency) => {
  const warnings = []
  months
    .filter((month) => month.net < 0)
    .forEach((month) => {
      warnings.push({
        type: 'deficit',
        message: `${format(month.monthDate, 'yyyy MMM')} 預估赤字 ${formatBase(Math.abs(month.net), baseCurrency)}`,
      })
    })

  cashProjection
    .filter((month) => month.cashAfter < safetyLine)
    .forEach((month) => {
      warnings.push({
        type: 'cash',
        message: `${format(month.monthDate, 'yyyy MMM')} 現金將跌至 ${formatBase(month.cashAfter, baseCurrency)} (低於安全線)` ,
      })
    })

  upcomingEvents.forEach((event) => {
    warnings.push({
      type: 'upcoming',
      message: `${format(event.date, 'MM/dd')} ${event.item.type === 'income' ? '入帳' : '支出'}：${
        event.item.name
      } ${formatBase(Math.abs(event.baseAmount), baseCurrency)}`,
    })
  })

  return warnings
}

const categoryTotals = (items) => {
  const totals = {}
  items.forEach((item) => {
    if (!totals[item.category]) {
      totals[item.category] = { income: 0, expense: 0 }
    }
    if (item.type === 'income') {
      totals[item.category].income += item.amount
    } else {
      totals[item.category].expense += item.amount
    }
  })
  return totals
}

const ratioMetrics = (months) => {
  const totalIncome = months.reduce((sum, month) => sum + Math.max(month.income, 0), 0)
  const totalExpense = months.reduce((sum, month) => sum + Math.max(month.expense, 0), 0)
  const averageIncome = totalIncome / months.length || 0
  const averageExpense = totalExpense / months.length || 0
  const savingRate = averageIncome ? ((averageIncome - averageExpense) / averageIncome) * 100 : 0
  const expenseRatio = averageIncome ? (averageExpense / averageIncome) * 100 : 0

  return {
    totalIncome,
    totalExpense,
    averageIncome,
    averageExpense,
    savingRate,
    expenseRatio,
  }
}

const MonthDetail = ({ month, baseCurrency }) => {
  if (!month) return null
  const total = month.items.reduce((sum, item) => sum + (item.type === 'income' ? item.baseAmount : -item.baseAmount), 0)
  return (
    <div className="panel">
      <h3>{month.label} 明細</h3>
      <div className="month-grid">
        {month.items
          .sort((a, b) => Math.abs(b.baseAmount) - Math.abs(a.baseAmount))
          .map((item) => {
            const value = item.type === 'income' ? item.baseAmount : -item.baseAmount
            const share = total ? Math.abs((value / total) * 100) : 0
            return (
              <div key={item.id} className={`month-item ${item.type}`}>
                <div className="month-item-header">
                  <span>{item.name}</span>
                  <span>{item.type === 'income' ? '收入' : '支出'}</span>
                </div>
                <div className="month-item-body">
                  <div className="amount">{formatBase(Math.abs(value), baseCurrency)}</div>
                  <div className="meta">
                    <span>{item.category}</span>
                    <span>{format(item.date, 'MM/dd')}</span>
                  </div>
                  <div className="progress">
                    <div className="progress-bar" style={{ width: `${Math.min(100, share)}%` }} />
                  </div>
                  <div className="share">佔比 {share.toFixed(1)}%</div>
                  {item.notes ? <p className="notes">{item.notes}</p> : null}
                </div>
              </div>
            )
          })}
      </div>
    </div>
  )
}

const CalendarView = ({ events, baseCurrency }) => {
  const grouped = events.reduce((acc, event) => {
    const key = format(event.date, 'yyyy MMM')
    if (!acc[key]) acc[key] = []
    acc[key].push(event)
    return acc
  }, {})

  return (
    <div className="panel">
      <h3>月曆視圖</h3>
      <div className="calendar-grid">
        {Object.entries(grouped).map(([month, items]) => (
          <div key={month} className="calendar-month">
            <div className="calendar-header">{month}</div>
            <ul>
              {items.map((event) => (
                <li key={event.id} className={event.item.type}>
                  <span className="date">{format(event.date, 'MM/dd')}</span>
                  <span className="name">{event.item.name}</span>
                  <span className="amount">{formatBase(Math.abs(event.baseAmount), baseCurrency)}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}

const CashFlowView = ({ months, startCash, safetyLine, baseCurrency }) => {
  let running = startCash
  const rows = months.map((month) => {
    running += month.net
    return {
      ...month,
      cashAfter: running,
    }
  })

  return (
    <div className="panel">
      <h3>現金流投影</h3>
      <table className="table">
        <thead>
          <tr>
            <th>月份</th>
            <th>結餘</th>
            <th>累計現金</th>
            <th>狀態</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className={row.cashAfter < safetyLine ? 'warning' : ''}>
              <td>{row.label}</td>
              <td>{formatBase(row.net, baseCurrency)}</td>
              <td>{formatBase(row.cashAfter, baseCurrency)}</td>
              <td>{row.cashAfter < safetyLine ? '低於安全線' : '穩定'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const UpcomingAlerts = ({ warnings }) => (
  <div className="panel warnings">
    <h3>提醒與風險提示</h3>
    <ul>
      {warnings.map((warning, index) => (
        <li key={index} className={warning.type}>{warning.message}</li>
      ))}
      {warnings.length === 0 ? <li className="success">未偵測到即將到期或赤字風險</li> : null}
    </ul>
  </div>
)

const RecurringItemForm = ({ newItem, onChange, onAdd }) => (
  <div className="panel">
    <h3>新增固定項目</h3>
    <div className="form-grid">
      <label>
        名稱
        <input value={newItem.name} onChange={(event) => onChange('name', event.target.value)} />
      </label>
      <label>
        類型
        <select value={newItem.type} onChange={(event) => onChange('type', event.target.value)}>
          <option value="income">收入</option>
          <option value="expense">支出</option>
        </select>
      </label>
      <label>
        類別
        <input value={newItem.category} onChange={(event) => onChange('category', event.target.value)} />
      </label>
      <label>
        金額
        <input
          type="number"
          value={newItem.amount}
          onChange={(event) => onChange('amount', event.target.value)}
        />
      </label>
      <label>
        幣別
        <select value={newItem.currency} onChange={(event) => onChange('currency', event.target.value)}>
          {Object.keys(currencyTemplates).map((currency) => (
            <option key={currency} value={currency}>
              {currencyTemplates[currency].label}
            </option>
          ))}
        </select>
      </label>
      <label>
        帳戶
        <input value={newItem.account} onChange={(event) => onChange('account', event.target.value)} />
      </label>
      <label>
        首次生效日
        <input
          type="date"
          value={newItem.start_date}
          onChange={(event) => onChange('start_date', event.target.value)}
        />
      </label>
      <label>
        結束日（可留空）
        <input
          type="date"
          value={newItem.end_date}
          onChange={(event) => onChange('end_date', event.target.value)}
        />
      </label>
      <label className="full">
        排程（RRULE）
        <input value={newItem.rrule} onChange={(event) => onChange('rrule', event.target.value)} />
      </label>
      <label>
        年度調整（%）
        <input
          type="number"
          step="0.1"
          value={newItem.indexationRate}
          onChange={(event) => onChange('indexationRate', event.target.value)}
        />
      </label>
      <label className="full">
        備註
        <textarea value={newItem.notes} onChange={(event) => onChange('notes', event.target.value)} />
      </label>
    </div>
    <div className="template-row">
      <span>快速套用排程：</span>
      {rruleTemplates.map((template) => (
        <button key={template.value} type="button" onClick={() => onChange('rrule', template.value)}>
          {template.label}
        </button>
      ))}
    </div>
    <button className="primary" type="button" onClick={onAdd}>
      加入固定項目
    </button>
  </div>
)

const RecurringItemList = ({ items, onToggle, onUpdate, onRemove }) => (
  <div className="panel">
    <h3>固定項目清單</h3>
    <div className="item-list">
      {items.map((item) => (
        <div key={item.id} className={`item ${item.type}`}>
          <header>
            <div>
              <h4>{item.name}</h4>
              <span className="category">{item.category}</span>
            </div>
            <div className="actions">
              <label className="switch">
                <input type="checkbox" checked={item.enabled} onChange={() => onToggle(item.id)} />
                <span>啟用</span>
              </label>
              <button type="button" onClick={() => onRemove(item.id)} className="ghost">
                移除
              </button>
            </div>
          </header>
          <div className="item-body">
            <div className="field">
              <span>金額</span>
              <input
                type="number"
                value={item.amount}
                onChange={(event) => onUpdate(item.id, 'amount', event.target.value)}
              />
            </div>
            <div className="field">
              <span>幣別</span>
              <select value={item.currency} onChange={(event) => onUpdate(item.id, 'currency', event.target.value)}>
                {Object.keys(currencyTemplates).map((currency) => (
                  <option key={currency} value={currency}>
                    {currency}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <span>排程</span>
              <input value={item.rrule} onChange={(event) => onUpdate(item.id, 'rrule', event.target.value)} />
            </div>
            <div className="field">
              <span>首次生效</span>
              <input
                type="date"
                value={item.start_date}
                onChange={(event) => onUpdate(item.id, 'start_date', event.target.value)}
              />
            </div>
            <div className="field">
              <span>結束日</span>
              <input
                type="date"
                value={item.end_date || ''}
                onChange={(event) => onUpdate(item.id, 'end_date', event.target.value)}
              />
            </div>
            <div className="field">
              <span>年度調整</span>
              <input
                type="number"
                step="0.1"
                value={item.indexation?.rate ? (item.indexation.rate * 100).toString() : ''}
                onChange={(event) =>
                  onUpdate(item.id, 'indexation', event.target.value ? { type: 'annual', rate: toNumber(event.target.value) / 100 } : null)
                }
              />
            </div>
          </div>
          {item.notes ? <p className="notes">{item.notes}</p> : null}
        </div>
      ))}
    </div>
  </div>
)

const ScenarioToggles = ({ categories, scenarioFilters, onToggle }) => (
  <div className="panel">
    <h3>快速情境切換</h3>
    <div className="scenario-grid">
      {categories.map((category) => {
        const enabled = scenarioFilters[category] !== false
        return (
          <button
            key={category}
            type="button"
            className={enabled ? 'scenario active' : 'scenario'}
            onClick={() => onToggle(category, !enabled)}
          >
            {enabled ? '✅' : '🚫'} {category}
          </button>
        )
      })}
    </div>
    <p className="helper">點擊類別即可暫時排除該類固定項目，立即查看 12 個月預估影響。</p>
  </div>
)

const BalanceTable = ({ months, baseCurrency, onSelect, showOnlyDeficit }) => {
  const filtered = showOnlyDeficit ? months.filter((month) => month.net < 0) : months
  return (
    <div className="panel">
      <div className="panel-header">
        <h3>月度收支總表</h3>
      </div>
      <table className="table">
        <thead>
          <tr>
            <th>月份</th>
            <th>固定收入</th>
            <th>固定支出</th>
            <th>結餘</th>
            <th>狀態</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((month) => (
            <tr key={month.key} className={month.net < 0 ? 'deficit' : ''} onClick={() => onSelect(month)}>
              <td>{month.label}</td>
              <td>{formatBase(month.income, baseCurrency)}</td>
              <td>{formatBase(month.expense, baseCurrency)}</td>
              <td>{formatBase(month.net, baseCurrency)}</td>
              <td>{month.net < 0 ? '赤字' : '盈餘'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const MetricsBar = ({ metrics, baseCurrency }) => (
  <div className="panel metrics">
    <div>
      <span className="label">平均固定收入</span>
      <span className="value">{formatBase(metrics.averageIncome, baseCurrency)}</span>
    </div>
    <div>
      <span className="label">平均固定支出</span>
      <span className="value">{formatBase(metrics.averageExpense, baseCurrency)}</span>
    </div>
    <div>
      <span className="label">儲蓄率</span>
      <span className="value">{metrics.savingRate.toFixed(1)}%</span>
    </div>
    <div>
      <span className="label">支出/收入比</span>
      <span className="value">{metrics.expenseRatio.toFixed(1)}%</span>
    </div>
  </div>
)

const CashSummary = ({ months, startCash, baseCurrency, safetyLine }) => {
  let running = startCash
  const rows = months.map((month) => {
    running += month.net
    return running
  })
  const breachIndex = rows.findIndex((value) => value < safetyLine)
  return (
    <div className="panel">
      <h3>現金安全檢核</h3>
      <p>起始現金：{formatBase(startCash, baseCurrency)}</p>
      <p>安全線：{formatBase(safetyLine, baseCurrency)}</p>
      <p>
        {breachIndex >= 0
          ? `${format(addMonths(startOfMonth(new Date()), breachIndex), 'yyyy MMM')} 現金跌破安全線`
          : '未偵測到跌破安全線的月份'}
      </p>
    </div>
  )
}

const RateManager = ({ baseCurrency, onBaseChange, rates, onRateChange }) => (
  <div className="panel">
    <h3>多幣別匯率</h3>
    <label>
      顯示主幣別
      <select value={baseCurrency} onChange={(event) => onBaseChange(event.target.value)}>
        {Object.keys(rates).map((currency) => (
          <option key={currency} value={currency}>
            {currencyTemplates[currency]?.label || currency}
          </option>
        ))}
      </select>
    </label>
    <div className="rate-grid">
      {Object.entries(rates).map(([currency, rate]) => (
        <label key={currency}>
          1 {currency} = {rate} TWD
          <input
            type="number"
            step="0.1"
            value={rate}
            onChange={(event) => onRateChange(currency, Number(event.target.value) || 0)}
          />
        </label>
      ))}
    </div>
    <p className="helper">匯率以「兌換成 TWD」為基準，可每日更新一次作為快取。</p>
  </div>
)

const useOccurrences = (items, scenarioFilters) => {
  const start = startOfMonth(new Date())
  const windowStart = start
  const windowEnd = endOfMonth(addMonths(start, 11))

  const activeItems = items.filter((item) => item.enabled && scenarioFilters[item.category] !== false)

  const occurrenceMap = {}
  activeItems.forEach((item) => {
    occurrenceMap[item.id] = getOccurrences(item, windowStart, windowEnd)
  })

  return { occurrenceMap, activeItems, windowStart, windowEnd }
}

const initialNewItem = {
  name: '',
  type: 'expense',
  category: '',
  amount: '0',
  currency: 'TWD',
  account: '',
  rrule: 'FREQ=MONTHLY;BYMONTHDAY=1',
  start_date: format(new Date(), 'yyyy-MM-dd'),
  end_date: '',
  notes: '',
  indexationRate: '',
}

const App = () => {
  const [items, setItems] = useState(initialItems)
  const [newItem, setNewItem] = useState(initialNewItem)
  const [baseCurrency, setBaseCurrency] = useState('TWD')
  const [currencyRates, setCurrencyRates] = useState(defaultRates)
  const [startCash, setStartCash] = useState(120000)
  const [safetyLine, setSafetyLine] = useState(30000)
  const [showOnlyDeficit, setShowOnlyDeficit] = useState(false)
  const [scenarioFilters, setScenarioFilters] = useState({})
  const [selectedMonth, setSelectedMonth] = useState(null)
  const [upcomingDays, setUpcomingDays] = useState(14)

  const { occurrenceMap, activeItems } = useOccurrences(items, scenarioFilters)

  const months = useMemo(
    () => groupByMonth(occurrenceMap, activeItems, baseCurrency, currencyRates),
    [occurrenceMap, activeItems, baseCurrency, currencyRates]
  )

  const metrics = useMemo(() => ratioMetrics(months), [months])

  const calendarEvents = useMemo(
    () => buildCalendarEvents(occurrenceMap, activeItems, baseCurrency, currencyRates),
    [occurrenceMap, activeItems, baseCurrency, currencyRates]
  )

  const upcomingEvents = useMemo(() => {
    const today = new Date()
    const horizon = addMonths(today, 1)
    return calendarEvents.filter((event) => {
      const diff = differenceInCalendarDays(event.date, today)
      return diff >= 0 && diff <= upcomingDays && isBefore(event.date, horizon)
    })
  }, [calendarEvents, upcomingDays])

  const cashProjection = useMemo(() => {
    let running = startCash
    return months.map((month) => {
      running += month.net
      return { ...month, cashAfter: running }
    })
  }, [months, startCash])

  const warnings = useMemo(
    () => determineWarnings(months, cashProjection, safetyLine, upcomingEvents, baseCurrency),
    [months, cashProjection, safetyLine, upcomingEvents, baseCurrency]
  )

  const categories = useMemo(() => {
    const unique = new Set(items.map((item) => item.category))
    return Array.from(unique).filter(Boolean)
  }, [items])

  const handleNewItemChange = (field, value) => {
    setNewItem((previous) => ({ ...previous, [field]: value }))
  }

  const handleAddItem = () => {
    if (!newItem.name || !newItem.rrule) return
    const item = {
      id: `${newItem.name}-${Date.now()}`,
      name: newItem.name,
      type: newItem.type,
      category: newItem.category || '其他',
      amount: toNumber(newItem.amount),
      currency: newItem.currency,
      account: newItem.account,
      rrule: newItem.rrule,
      start_date: newItem.start_date,
      end_date: newItem.end_date || undefined,
      notes: newItem.notes,
      enabled: true,
    }
    if (newItem.indexationRate) {
      item.indexation = { type: 'annual', rate: toNumber(newItem.indexationRate) / 100 }
    }
    setItems((previous) => [...previous, item])
    setNewItem(initialNewItem)
  }

  const handleToggle = (id) => {
    setItems((previous) => previous.map((item) => (item.id === id ? { ...item, enabled: !item.enabled } : item)))
  }

  const handleUpdate = (id, field, value) => {
    setItems((previous) =>
      previous.map((item) => {
        if (item.id !== id) return item
        if (field === 'amount') {
          return { ...item, amount: toNumber(value) }
        }
        if (field === 'indexation') {
          return { ...item, indexation: value || undefined }
        }
        return { ...item, [field]: value }
      })
    )
  }

  const handleRemove = (id) => {
    setItems((previous) => previous.filter((item) => item.id !== id))
  }

  const handleScenarioToggle = (category, enabled) => {
    setScenarioFilters((previous) => ({ ...previous, [category]: enabled }))
  }

  const handleRateChange = (currency, rate) => {
    setCurrencyRates((previous) => ({ ...previous, [currency]: rate }))
  }

  const categorySummary = useMemo(() => categoryTotals(activeItems), [activeItems])

  return (
    <div className="app">
      <header>
        <h1>Balance Life：固定收支雷達</h1>
        <p>
          一眼掌握未來 12 個月的固定收入與支出。透過 RRULE 排程展開每筆固定項目，支援多幣別換算、指數調整、赤字預警與現金流投影。
        </p>
      </header>

      <section className="controls">
        <div className="panel">
          <h3>現金假設</h3>
          <label>
            起始現金
            <input
              type="number"
              value={startCash}
              onChange={(event) => setStartCash(Number(event.target.value) || 0)}
            />
          </label>
          <label>
            安全線
            <input
              type="number"
              value={safetyLine}
              onChange={(event) => setSafetyLine(Number(event.target.value) || 0)}
            />
          </label>
          <label>
            提前提醒天數
            <input
              type="number"
              value={upcomingDays}
              onChange={(event) => setUpcomingDays(Number(event.target.value) || 0)}
            />
          </label>
          <label className="switch">
            <input
              type="checkbox"
              checked={showOnlyDeficit}
              onChange={(event) => setShowOnlyDeficit(event.target.checked)}
            />
            <span>只顯示赤字月份</span>
          </label>
        </div>
        <RateManager
          baseCurrency={baseCurrency}
          onBaseChange={setBaseCurrency}
          rates={currencyRates}
          onRateChange={handleRateChange}
        />
        <CashSummary
          months={months}
          startCash={startCash}
          baseCurrency={baseCurrency}
          safetyLine={safetyLine}
        />
      </section>

      <section className="metrics-row">
        <MetricsBar metrics={metrics} baseCurrency={baseCurrency} />
        <ScenarioToggles
          categories={categories}
          scenarioFilters={scenarioFilters}
          onToggle={handleScenarioToggle}
        />
      </section>

      <section className="balance-view">
        <BalanceTable
          months={months}
          baseCurrency={baseCurrency}
          onSelect={setSelectedMonth}
          showOnlyDeficit={showOnlyDeficit}
        />
        <MonthDetail month={selectedMonth} baseCurrency={baseCurrency} />
      </section>

      <section className="calendar-section">
        <CalendarView events={calendarEvents} baseCurrency={baseCurrency} />
        <CashFlowView
          months={months}
          startCash={startCash}
          safetyLine={safetyLine}
          baseCurrency={baseCurrency}
        />
      </section>

      <section className="alerts-section">
        <UpcomingAlerts warnings={warnings} />
        <div className="panel">
          <h3>類別摘要</h3>
          <ul className="category-summary">
            {Object.entries(categorySummary).map(([category, value]) => (
              <li key={category}>
                <span>{category}</span>
                <span>
                  收入 {value.income.toLocaleString()} / 支出 {value.expense.toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="manage-section">
        <RecurringItemForm
          newItem={newItem}
          onChange={handleNewItemChange}
          onAdd={handleAddItem}
        />
        <RecurringItemList items={items} onToggle={handleToggle} onUpdate={handleUpdate} onRemove={handleRemove} />
      </section>
    </div>
  )
}

export default App
