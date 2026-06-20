const STORAGE_KEY = 'dividend_bank_overrides';

export function loadDividendBankOverrides() {
  try {
    const val = localStorage.getItem(STORAGE_KEY);
    return val ? JSON.parse(val) : {};
  } catch {
    return {};
  }
}

export function saveDividendBankOverrides(overrides) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
  } catch (e) {
    console.error('[storage] write failed:', e);
    throw e;
  }
}
