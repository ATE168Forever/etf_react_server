import { useState } from 'react';

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

export default function DividendCalendar({ year, events }) {
  const [month, setMonth] = useState(new Date().getMonth());
  const todayStr = new Date().toISOString().slice(0, 10);

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
        const dayEvents = events.filter(e => e.date === dateStr);
        week.push({ day, dateStr, events: dayEvents, isToday: dateStr === todayStr });
      }
      day++;
    }
    weeks.push(week);
  }

  const prevMonth = () => setMonth(m => (m === 0 ? 11 : m - 1));
  const nextMonth = () => setMonth(m => (m === 11 ? 0 : m + 1));

  const monthTotal = events
    .filter(e => new Date(e.date).getFullYear() === year && new Date(e.date).getMonth() === month)
    .reduce((sum, e) => sum + Number(e.amount || 0), 0);

  return (
    <div className="calendar">
      <div className="calendar-header">
        <button onClick={prevMonth}>◀</button>
        <span>{year} {MONTH_NAMES[month]}</span>
        <button onClick={nextMonth}>▶</button>
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
                      {d.events.map((ev, j) => (
                        <div
                          key={j}
                          className={`event ${ev.type === 'ex' ? 'event-ex' : 'event-pay'}`}
                          title={`股息: ${Number(ev.amount).toFixed(1)}`}
                        >
                          {ev.stock_id}
                        </div>
                      ))}
                    </div>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      <div className="calendar-total">當月合計: {monthTotal.toFixed(1)}</div>
    </div>
  );
}
