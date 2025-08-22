import { readTransactionHistory } from './transactionStorage';

export function getTomorrowDividendAlerts(dividendData, history = readTransactionHistory()) {
  if (!Array.isArray(dividendData) || dividendData.length === 0) return [];
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);
  const holdings = {};
  (history || []).forEach(item => {
    const d = item.date || item.purchased_date;
    if (!d) return;
    if (new Date(d) <= tomorrow) {
      const qty = Number(item.quantity) || 0;
      holdings[item.stock_id] = (holdings[item.stock_id] || 0) + (item.type === 'sell' ? -qty : qty);
    }
  });
  const alerts = [];
  dividendData.forEach(item => {
    const qty = holdings[item.stock_id];
    if (!qty) return;
    const dividend = parseFloat(item.dividend) || 0;
    if (item.dividend_date === tomorrowStr) {
      alerts.push({ stock_id: item.stock_id, stock_name: item.stock_name, type: 'ex', dividend, quantity: qty, total: dividend * qty });
    }
    if (item.payment_date === tomorrowStr) {
      alerts.push({ stock_id: item.stock_id, stock_name: item.stock_name, type: 'pay', dividend, quantity: qty, total: dividend * qty });
    }
  });
  return alerts;
}
