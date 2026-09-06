import { formatTwd } from './homeCurrencyFormat';

function escapeIcsText(text) {
  return String(text)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

function toIcsDate(dateStr) {
  return dateStr.replace(/-/g, '');
}

function toIcsTimestamp(date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  const hh = String(date.getUTCHours()).padStart(2, '0');
  const mm = String(date.getUTCMinutes()).padStart(2, '0');
  const ss = String(date.getUTCSeconds()).padStart(2, '0');
  return `${y}${m}${d}T${hh}${mm}${ss}Z`;
}

export function buildIcsEvent(nextPayment, lang = 'zh') {
  const uid = `dividend-life-${nextPayment.stock_id}-${nextPayment.date}@etflife.org`;
  const dtstamp = toIcsTimestamp(new Date());
  const dtstart = toIcsDate(nextPayment.date);
  const amount = formatTwd(nextPayment.total);
  const summary = escapeIcsText(lang === 'en'
    ? `${nextPayment.stock_id} dividend payment`
    : `${nextPayment.stock_id} 配息入帳`);
  const description = escapeIcsText(lang === 'en'
    ? `${nextPayment.stock_name}: estimated ${amount} dividend payment`
    : `${nextPayment.stock_name}：預估配息入帳 ${amount}`);

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Dividend Life//etflife.org//EN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART;VALUE=DATE:${dtstart}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.join('\r\n') + '\r\n';
}

export function downloadIcsFile(icsContent, filename) {
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
