import Cookies from 'js-cookie';

const STORAGE_KEY = 'my_transaction_history';

export function migrateTransactionHistory() {
  // first check localStorage
  try {
    const localVal = localStorage.getItem(STORAGE_KEY);
    if (localVal) {
      return JSON.parse(localVal);
    }
  } catch {}

  // fallback to cookie
  try {
    const cookieVal = Cookies.get(STORAGE_KEY);
    if (cookieVal) {
      const list = JSON.parse(cookieVal);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      Cookies.remove(STORAGE_KEY);
      return list;
    }
  } catch {
    Cookies.remove(STORAGE_KEY);
  }
  return [];
}

export function readTransactionHistory() {
  try {
    const val = localStorage.getItem(STORAGE_KEY);
    return val ? JSON.parse(val) : [];
  } catch {
    return [];
  }
}

export function saveTransactionHistory(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}
