import { getTomorrowDividendAlerts } from './dividendUtils';

// Wide enough to cover any realistic dividend announcement horizon without
// modifying getTomorrowDividendAlerts's own default 7-day window (used
// unchanged by DividendLifePage.jsx's top-of-page alert banner).
const NEXT_PAYMENT_LOOKAHEAD_DAYS = 3650;

export function getNextAnnouncedPayment(dividendData, transactionHistory) {
  const alerts = getTomorrowDividendAlerts(dividendData, transactionHistory, NEXT_PAYMENT_LOOKAHEAD_DAYS);
  const payAlerts = alerts.filter(alert => alert.type === 'pay');
  if (!payAlerts.length) return null;
  return payAlerts.reduce((earliest, alert) =>
    alert.daysUntil < earliest.daysUntil ? alert : earliest
  );
}
