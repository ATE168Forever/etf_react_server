import { readTransactionHistory } from './transactionStorage';

export function getTomorrowDividendAlerts(dividendData, history = readTransactionHistory(), daysAhead = 7) {
  if (!Array.isArray(dividendData) || dividendData.length === 0) return [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Build holdings snapshot
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() + daysAhead);
  const holdings = {};
  (history || []).forEach(item => {
    const d = item.date || item.purchased_date;
    if (!d) return;
    if (new Date(d) <= cutoff) {
      const qty = Number(item.quantity) || 0;
      holdings[item.stock_id] = (holdings[item.stock_id] || 0) + (item.type === 'sell' ? -qty : qty);
    }
  });

  // Build date strings for the window
  const dateStrings = {};
  for (let i = 1; i <= daysAhead; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    dateStrings[d.toISOString().slice(0, 10)] = i;
  }

  const seen = new Set();
  const alerts = [];
  dividendData.forEach(item => {
    const qty = holdings[item.stock_id];
    if (!qty) return;
    const dividend = parseFloat(item.dividend) || 0;

    const exDays = dateStrings[item.dividend_date];
    if (exDays != null) {
      const key = `${item.stock_id}-ex-${item.dividend_date}`;
      if (!seen.has(key)) {
        seen.add(key);
        alerts.push({ stock_id: item.stock_id, stock_name: item.stock_name, type: 'ex', dividend, quantity: qty, total: dividend * qty, date: item.dividend_date, daysUntil: exDays });
      }
    }

    const payDays = dateStrings[item.payment_date];
    if (payDays != null) {
      const key = `${item.stock_id}-pay-${item.payment_date}`;
      if (!seen.has(key)) {
        seen.add(key);
        alerts.push({ stock_id: item.stock_id, stock_name: item.stock_name, type: 'pay', dividend, quantity: qty, total: dividend * qty, date: item.payment_date, daysUntil: payDays });
      }
    }
  });

  alerts.sort((a, b) => a.daysUntil - b.daysUntil);
  return alerts;
}
