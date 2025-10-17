import Cookies from 'js-cookie';
import { ensureTransactionListHasIds } from './transactionUtils';

const STORAGE_KEY = 'my_transaction_history';
const STORAGE_UPDATED_AT_KEY = 'my_transaction_history_updated_at';

function readUpdatedAt() {
  try {
    const value = localStorage.getItem(STORAGE_UPDATED_AT_KEY);
    if (!value) return null;
    const timestamp = Number(value);
    return Number.isFinite(timestamp) ? timestamp : null;
  } catch {
    return null;
  }
}

function writeUpdatedAt(timestamp) {
  try {
    const value = Number.isFinite(timestamp) ? String(timestamp) : String(Date.now());
    localStorage.setItem(STORAGE_UPDATED_AT_KEY, value);
  } catch {
    // ignore storage write errors
  }
}

export function migrateTransactionHistory() {
  // first check localStorage
  try {
    const localVal = localStorage.getItem(STORAGE_KEY);
    if (localVal) {
      const list = JSON.parse(localVal);
      if (list) {
        const current = readUpdatedAt();
        if (current == null) {
          writeUpdatedAt(Date.now());
        }
        return ensureTransactionListHasIds(list);
      }
    }
  } catch {
    // ignore localStorage errors
  }

  // fallback to cookie
  try {
    const cookieVal = Cookies.get(STORAGE_KEY);
    if (cookieVal) {
      const list = JSON.parse(cookieVal);
      const normalized = ensureTransactionListHasIds(list);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
      writeUpdatedAt(Date.now());
      Cookies.remove(STORAGE_KEY);
      return normalized;
    }
  } catch {
    Cookies.remove(STORAGE_KEY);
  }
  return [];
}

export function readTransactionHistory() {
  try {
    const val = localStorage.getItem(STORAGE_KEY);
    return val ? ensureTransactionListHasIds(JSON.parse(val)) : [];
  } catch {
    return [];
  }
}

export function saveTransactionHistory(list) {
  const normalized = ensureTransactionListHasIds(list);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  writeUpdatedAt(Date.now());
}

export function getTransactionHistoryUpdatedAt() {
  return readUpdatedAt();
}
