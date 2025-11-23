import { useState } from 'react';
import { useLanguage } from '../i18n';

const DEFAULT_CURRENCY = 'TWD';

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
  receivableAsPerShare = false
}) {
  const timeZone = 'Asia/Taipei';
  const nowStr = new Date().toLocaleDateString('en-CA', { timeZone });
  const [month, setMonth] = useState(Number(nowStr.slice(5, 7)) - 1);
  const [expandedDates, setExpandedDates] = useState({});
  const todayStr = nowStr;

  const { lang, t } = useLanguage();
  const MONTH_NAMES = lang === 'zh'
    ? ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月']
    : ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
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

  const prevMonth = () => setMonth(m => (m === 0 ? 11 : m - 1));
  const nextMonth = () => setMonth(m => (m === 11 ? 0 : m + 1));


  return (
    <div className="calendar">
      <div className="calendar-header">
        <div className="calendar-nav">
          <button onClick={prevMonth} style={{ all: 'unset' }}>◀</button>
          <span>{year} {MONTH_NAMES[month]}</span>
          <button onClick={nextMonth} style={{ all: 'unset' }}>▶</button>
        </div>
        {showTotals && hasTotals && (
          <div className="calendar-summary">
            {[{ key: 'ex', label: t('dividend') }, { key: 'pay', label: t('payment') }]
              .map(({ key, label }) => {
                const items = currenciesInMonth
                  .map(currency => {
                    const total = totalsByType[key]?.[currency] || 0;
                    if (total <= 0) return null;
                    return (
                      <span key={`${key}-${currency}`} className="calendar-summary-value">
                        <span className="calendar-summary-currency">{currencyLabel(currency)}</span>
                        <span className="calendar-summary-amount">{formatSummaryAmount(currency, total)}</span>
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
        <span style={{ marginLeft: 8 }}><span className="legend-box legend-pay"></span>{t('payment_date')}</span>
      </div>
      <div className="table-responsive">
      <table className="calendar-grid">
        <thead>
          <tr>
            {DAY_NAMES.map(d => <th key={d}>{d}</th>)}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week, idx) => (
            <tr key={idx}>
              {week.map((d, i) => (
                <td key={i} className={`calendar-cell${d && d.isToday ? ' calendar-today' : ''}`}>
                  {d && (
                    <div>
                      <div className={`date-num${d.isToday ? ' today' : ''}`}>{d.day}</div>
                      {(expandedDates[d.dateStr] ? d.events : d.events.slice(0,1)).map((ev, j) => {
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
                        tooltipParts.push(
                          `${t('prev_close')}: ${ev.last_close_price}`,
                          `${t('current_yield')}: ${ev.dividend_yield}%`,
                          `${t('dividend_date')}: ${ev.dividend_date || '-'}`,
                          `${t('payment_date')}: ${ev.payment_date || '-'}`
                        );
                        const tooltip = tooltipParts.join('\n');
                        return (
                          <div
                            key={j}
                            className={`event ${ev.type === 'ex' ? 'event-ex' : 'event-pay'}`}
                            style={{ borderBottom: '1px dotted #777', cursor: 'help' }}
                            title={tooltip}
                          >
                            {ev.stock_id}
                          </div>
                        );
                      })}
                      {!expandedDates[d.dateStr] && d.events.length > 1 && (
                        <button
                          className="more-btn"
                          onClick={() => setExpandedDates(prev => ({ ...prev, [d.dateStr]: true }))}
                        >
                          {lang === 'zh'
                            ? `${t('more')}${d.events.length - 1}+`
                            : `${t('more')} ${d.events.length - 1}+`}
                        </button>
                      )}
                      {expandedDates[d.dateStr] && d.events.length > 1 && (
                        <button
                          className="more-btn"
                          onClick={() => setExpandedDates(prev => ({ ...prev, [d.dateStr]: false }))}
                        >
                          {t('hide')}-
                        </button>
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
    </div>
  );
}
