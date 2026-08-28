// Sample holdings shown when a user with no real transactions opts into demo mode.
// Real, well-known TW ETF ids so their dividend/price data comes from the live API —
// only the "holdings" are fabricated, never persisted to localStorage.
export const DEMO_TRANSACTIONS = [
  { stock_id: '0050', stock_name: '元大台灣50', country: 'TW', date: '2025-02-10', type: 'buy', quantity: 1000, price: 130 },
  { stock_id: '0056', stock_name: '元大高股息', country: 'TW', date: '2025-05-15', type: 'buy', quantity: 2000, price: 36 },
  { stock_id: '00878', stock_name: '國泰永續高股息', country: 'TW', date: '2025-08-01', type: 'buy', quantity: 3000, price: 20 },
];
