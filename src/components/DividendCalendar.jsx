import { useState } from 'react';

const MONTH_NAMES = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
const DAY_NAMES = ['日','一','二','三','四','五','六'];

export default function DividendCalendar({ year, events, showTotals = true }) {
  const timeZone = 'Asia/Taipei';
  const nowStr = new Date().toLocaleDateString('en-CA', { timeZone });
  const [month, setMonth] = useState(Number(nowStr.slice(5, 7)) - 1);
  const [expandedDates, setExpandedDates] = useState({});
  const todayStr = nowStr;

  const monthStr = String(month + 1).padStart(2, '0');
  const monthEvents = events.filter(e => e.date.startsWith(`${year}-${monthStr}`));
  const exTotal = monthEvents
    .filter(e => e.type === 'ex')
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const payTotal = monthEvents
    .filter(e => e.type === 'pay')
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

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
        {showTotals && (exTotal > 0 || payTotal > 0) && (
          <div className="calendar-summary">
            <div>除息金額: {Math.round(exTotal).toLocaleString()}</div>
            <span style={{ marginLeft: 8 }}>發放金額: {Math.round(payTotal).toLocaleString()}</span>
          </div>
        )}
      </div>
      <div className="calendar-legend">
        <span><span className="legend-box legend-ex"></span>除息日</span>
        <span style={{ marginLeft: 8 }}><span className="legend-box legend-pay"></span>發放日</span>
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
                        const tooltip = ev.quantity != null
                          ? `持有數量: ${ev.quantity} 股 (${lotText} 張)\n每股配息: ${ev.dividend} 元\n應收股息: ${Number(ev.amount).toFixed(1)} 元\n除息前一天收盤價: ${ev.last_close_price}\n當次殖利率: ${ev.dividend_yield}%\n配息日期: ${ev.dividend_date || '-'}\n發放日期: ${ev.payment_date || '-'}`
                          : `每股配息: ${Number(ev.amount).toFixed(3)} 元\n除息前一天收盤價: ${ev.last_close_price}\n當次殖利率: ${ev.dividend_yield}%\n配息日期: ${ev.dividend_date || '-'}\n發放日期: ${ev.payment_date || '-'}`;
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
                          更多+
                        </button>
                      )}
                      {expandedDates[d.dateStr] && d.events.length > 1 && (
                        <button
                          className="more-btn"
                          onClick={() => setExpandedDates(prev => ({ ...prev, [d.dateStr]: false }))}
                        >
                          隱藏-
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
