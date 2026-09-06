import { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '../i18n';
import TooltipText from './TooltipText';
import { getDividendCellDisplay } from '../utils/dividendCellFormat';

const DEFAULT_CURRENCY = 'TWD';
const MAX_VISIBLE_DOTS = 3;

const currencyLabel = (currency) => {
  return currency === 'USD' ? 'US$' : 'NT$';
};

const sortCurrencies = (currencies) => {
  const order = { TWD: 0, USD: 1 };
  return Array.from(currencies).sort((a, b) => {
    const aOrder = order[a] ?? 99;
    const bOrder = order[b] ?? 99;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return a.localeCompare(b);
  });
};

const formatSummaryAmount = (currency, value) => {
  if (!Number.isFinite(value)) {
    return '';
  }
  if (currency === 'USD') {
    return value.toLocaleString(undefined, {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    });
  }
  return Math.round(value).toLocaleString();
};

const formatEventAmount = (currency, value, { hasQuantity } = {}) => {
  if (!Number.isFinite(value)) {
    return '0';
  }
  if (currency === 'USD') {
    return value.toLocaleString(undefined, {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    });
  }
  const precision = hasQuantity ? 1 : 3;
  return value.toFixed(precision);
};

export default function DividendCalendar({
  year,
  events,
  showTotals = true,
  receivableAsPerShare = false,
  availableYears = [],
  onYearChange = null,
  month: controlledMonth = null,
  onMonthChange = null,
}) {
  const timeZone = 'Asia/Taipei';
  const nowStr = new Date().toLocaleDateString('en-CA', { timeZone });
  const [internalMonth, setInternalMonth] = useState(Number(nowStr.slice(5, 7)) - 1);
  const [selectedDate, setSelectedDate] = useState(null);
  const todayStr = nowStr;

  // Use controlled month if provided, otherwise use internal state
  const month = controlledMonth !== null ? controlledMonth : internalMonth;
  const setMonth = onMonthChange || setInternalMonth;

  useEffect(() => {
    setSelectedDate(null);
  }, [month, year]);

  const { lang, t } = useLanguage();
  const MONTH_NAMES = useMemo(() => (lang === 'zh'
    ? ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月']
    : ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']), [lang]);
  const DAY_NAMES = lang === 'zh'
    ? ['日','一','二','三','四','五','六']
    : ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  const monthStr = String(month + 1).padStart(2, '0');
  const monthEvents = events.filter(e => e.date.startsWith(`${year}-${monthStr}`));
  const totalsByType = monthEvents.reduce((acc, event) => {
    const typeKey = event.type === 'ex' ? 'ex' : 'pay';
    const currency = event.currency || DEFAULT_CURRENCY;
    if (!acc[typeKey]) {
      acc[typeKey] = {};
    }
    acc[typeKey][currency] = (acc[typeKey][currency] || 0) + (Number(event.amount) || 0);
    return acc;
  }, { ex: {}, pay: {} });

  const currenciesInMonth = sortCurrencies(new Set([
    ...Object.keys(totalsByType.ex || {}),
    ...Object.keys(totalsByType.pay || {}),
  ]));

  const hasTotals = currenciesInMonth.some(currency => {
    const ex = totalsByType.ex?.[currency] || 0;
    const pay = totalsByType.pay?.[currency] || 0;
    return ex > 0 || pay > 0;
  });

  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startDay = firstDay.getDay();

  const weeks = [];
  let day = 1 - startDay;
  while (day <= daysInMonth) {
    const week = [];
    for (let i=0;i<7;i++) {
      if (day < 1 || day > daysInMonth) {
        week.push(null);
      } else {
        const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
        const dayEvents = events
          .filter(e => e.date === dateStr)
          .sort((a, b) => (b.dividend_yield || 0) - (a.dividend_yield || 0));
        week.push({ day, dateStr, events: dayEvents, isToday: dateStr === todayStr });
      }
      day++;
    }
    weeks.push(week);
  }

  const selectedDayEvents = useMemo(() => {
    if (!selectedDate) return [];
    return monthEvents
      .filter(e => e.date === selectedDate)
      .sort((a, b) => (b.dividend_yield || 0) - (a.dividend_yield || 0));
  }, [monthEvents, selectedDate]);

  const selectedDateLabel = useMemo(() => {
    if (!selectedDate) return '';
    const [, selMonth, selDay] = selectedDate.split('-').map(Number);
    return lang === 'zh'
      ? `${selMonth} 月 ${selDay} 日`
      : `${MONTH_NAMES[selMonth - 1]} ${selDay}`;
  }, [selectedDate, lang, MONTH_NAMES]);

  const buildEventTooltip = (ev) => {
    const lotText = ev.quantity != null
      ? (ev.quantity / 1000).toFixed(3).replace(/\.?0+$/, '')
      : '';
    const currencyCode = ev.currency || DEFAULT_CURRENCY;
    const currencySymbol = currencyCode === 'USD' ? 'US$' : 'NT$';
    const currencyUnitZh = currencyCode === 'USD' ? '美元' : '元';
    const amountValue = Number(ev.amount);
    const amountFormatted = formatEventAmount(currencyCode, amountValue, {
      hasQuantity: ev.quantity != null,
    });
    const amountText = lang === 'en'
      ? `${amountFormatted} ${currencySymbol}`
      : `${amountFormatted} ${currencyUnitZh}`;
    const perShareText = receivableAsPerShare
      ? amountText
      : lang === 'en'
        ? `${currencySymbol}${ev.dividend}`
        : `${ev.dividend} ${currencyUnitZh}`;
    const tooltipParts = [];
    if (ev.quantity != null) {
      tooltipParts.push(`${t('quantity')}: ${ev.quantity} ${lang === 'en' ? 'shares' : '股'} (${lotText} ${lang === 'en' ? 'lots' : '張'})`);
    }
    tooltipParts.push(`${t('per_share_dividend')}: ${perShareText}`);
    if (!receivableAsPerShare) {
      tooltipParts.push(`${t('dividend_receivable')}: ${amountText}`);
    }
    const { closePriceText, yieldText } = getDividendCellDisplay(ev, { lang, verbose: true });
    tooltipParts.push(
      `${t('prev_close')}: ${closePriceText}`,
      `${t('current_yield')}: ${yieldText}`,
      `${t('dividend_date')}: ${ev.dividend_date || '-'}`,
      `${t('payment_date')}: ${ev.payment_date || '-'}`
    );
    return tooltipParts.join('\n');
  };

  const prevMonth = () => {
    if (month === 0) {
      const prevYear = year - 1;
      if (onYearChange && availableYears.includes(prevYear)) {
        onYearChange(prevYear);
        setMonth(11);
      }
    } else {
      setMonth(month - 1);
    }
  };

  const nextMonth = () => {
    if (month === 11) {
      const nextYear = year + 1;
      if (onYearChange && availableYears.includes(nextYear)) {
        onYearChange(nextYear);
        setMonth(0);
      }
    } else {
      setMonth(month + 1);
    }
  };

  return (
    <div className="calendar">
      <div className="calendar-header">
        <div className="calendar-nav">
          <button type="button" onClick={prevMonth} className="calendar-nav-btn" aria-label={lang === 'en' ? 'Previous month' : '上個月'}>◀</button>
          <span>{year} {MONTH_NAMES[month]}</span>
          <button type="button" onClick={nextMonth} className="calendar-nav-btn" aria-label={lang === 'en' ? 'Next month' : '下個月'}>▶</button>
        </div>
        {showTotals && hasTotals && (
          <div className="calendar-summary">
            {[{ key: 'ex', label: t('dividend') }, { key: 'pay', label: t('payment') }]
              .map(({ key, label }) => {
                const items = currenciesInMonth
                  .map(currency => {
                    const total = totalsByType[key]?.[currency] || 0;
                    if (total <= 0) return null;
                    const contributing = monthEvents
                      .filter(e => (e.type === 'ex' ? 'ex' : 'pay') === key && (e.currency || DEFAULT_CURRENCY) === currency && (Number(e.amount) || 0) > 0)
                      .sort((a, b) => (Number(b.amount) || 0) - (Number(a.amount) || 0));
                    const tooltipText = contributing
                      .map(e => `${e.stock_id}: ${formatSummaryAmount(currency, Number(e.amount))}`)
                      .join('\n');
                    return (
                      <span key={`${key}-${currency}`} className="calendar-summary-value">
                        <span className="calendar-summary-currency">{currencyLabel(currency)}</span>
                        <TooltipText tooltip={tooltipText} className="calendar-summary-amount">
                          {formatSummaryAmount(currency, total)}
                        </TooltipText>
                      </span>
                    );
                  })
                  .filter(Boolean);
                if (items.length === 0) {
                  return null;
                }
                return (
                  <div key={key} className="calendar-summary-group">
                    {`${label}:`}
                    {items}
                  </div>
                );
              })
              .filter(Boolean)}
          </div>
        )}
      </div>
      <div className="calendar-legend">
        <span><span className="legend-box legend-ex"></span>{t('ex_dividend_date')}</span>
        <span><span className="legend-box legend-pay"></span>{t('payment_date')}</span>
      </div>
      <div className="table-responsive">
      <table className="calendar-grid" aria-label={`${MONTH_NAMES[month]} ${year}`}>
        <thead>
          <tr>
            {DAY_NAMES.map(d => <th key={d} scope="col">{d}</th>)}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week, idx) => (
            <tr key={idx}>
              {week.map((d, i) => (
                <td
                  key={i}
                  className={`calendar-cell${d && d.isToday ? ' calendar-today' : ''}${d && d.dateStr === selectedDate ? ' calendar-cell--selected' : ''}`}
                >
                  {d && (
                    <div>
                      {d.events.length > 0 ? (
                        <button
                          type="button"
                          className={`date-num${d.isToday ? ' today' : ''}`}
                          aria-expanded={d.dateStr === selectedDate}
                          aria-label={lang === 'zh'
                            ? `${d.day} 日，${d.events.length} 筆股息事件，點擊查看明細`
                            : `Day ${d.day}, ${d.events.length} dividend events, click for details`}
                          onClick={() => setSelectedDate(prev => (prev === d.dateStr ? null : d.dateStr))}
                        >
                          {d.day}
                        </button>
                      ) : (
                        <span className={`date-num${d.isToday ? ' today' : ''}`}>{d.day}</span>
                      )}
                      {d.events.length > 0 && (
                        <div className="calendar-dots">
                          {d.events.slice(0, MAX_VISIBLE_DOTS).map((ev, j) => (
                            <TooltipText key={j} tooltip={buildEventTooltip(ev)}>
                              <span
                                className={`calendar-dot ${ev.type === 'ex' ? 'calendar-dot--ex' : 'calendar-dot--pay'}`}
                                aria-hidden="true"
                              />
                            </TooltipText>
                          ))}
                          {d.events.length > MAX_VISIBLE_DOTS && (
                            <span className="calendar-dot-more" aria-hidden="true">
                              +{d.events.length - MAX_VISIBLE_DOTS}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      {selectedDate && (
        <div className="calendar-day-detail">
          <div className="calendar-day-detail__header">
            <strong>{selectedDateLabel}</strong>
            <button
              type="button"
              className="calendar-day-detail__close"
              onClick={() => setSelectedDate(null)}
              aria-label={lang === 'zh' ? '關閉明細' : 'Close details'}
            >
              ✕
            </button>
          </div>
          {selectedDayEvents.length === 0 ? (
            <p className="calendar-day-detail__empty">
              {lang === 'zh' ? '這天沒有股息事件' : 'No dividend events on this day'}
            </p>
          ) : (
            <ul className="calendar-day-detail__list">
              {selectedDayEvents.map((ev, idx) => {
                const currencyCode = ev.currency || DEFAULT_CURRENCY;
                const currencySymbol = currencyCode === 'USD' ? 'US$' : 'NT$';
                const currencyUnitZh = currencyCode === 'USD' ? '美元' : '元';
                const amountValue = Number(ev.amount);
                const amountFormatted = formatEventAmount(currencyCode, amountValue, {
                  hasQuantity: ev.quantity != null,
                });
                const amountText = lang === 'en'
                  ? `${amountFormatted} ${currencySymbol}`
                  : `${amountFormatted} ${currencyUnitZh}`;
                const perShareText = receivableAsPerShare
                  ? amountText
                  : lang === 'en'
                    ? `${currencySymbol}${ev.dividend}`
                    : `${ev.dividend} ${currencyUnitZh}`;
                return (
                  <li
                    key={`${ev.stock_id}-${ev.type}-${idx}`}
                    className={`calendar-day-detail__item calendar-day-detail__item--${ev.type}`}
                  >
                    <span
                      className={`calendar-dot ${ev.type === 'ex' ? 'calendar-dot--ex' : 'calendar-dot--pay'}`}
                      aria-hidden="true"
                    />
                    <span className="calendar-day-detail__type">
                      {ev.type === 'ex' ? t('ex_dividend_date') : t('payment_date')}
                    </span>
                    <span className="calendar-day-detail__stock">{ev.stock_id}</span>
                    <span className="calendar-day-detail__amount">
                      {receivableAsPerShare ? perShareText : amountText}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
