export const DIVIDEND_EXCLUSION_STORAGE_KEY = 'inventoryDividendExclusions';
export const DIVIDEND_EXCLUSION_EVENT = 'dividendExclusionsUpdated';

export const normalizeStockId = (value) => {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim().toUpperCase();
  return trimmed || '';
};

export const loadDividendExclusions = () => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(DIVIDEND_EXCLUSION_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.reduce((acc, id) => {
        const normalized = normalizeStockId(id);
        if (normalized) {
          acc[normalized] = true;
        }
        return acc;
      }, {});
    }
    if (parsed && typeof parsed === 'object') {
      return Object.keys(parsed).reduce((acc, key) => {
        if (!parsed[key]) return acc;
        const normalized = normalizeStockId(key);
        if (normalized) {
          acc[normalized] = true;
        }
        return acc;
      }, {});
    }
  } catch {
    // ignore parse errors
  }
  return {};
};

export const persistDividendExclusions = (map) => {
  if (typeof window === 'undefined') return;
  try {
    const payload = Object.keys(map).filter(key => map[key]);
    window.localStorage.setItem(
      DIVIDEND_EXCLUSION_STORAGE_KEY,
      JSON.stringify(payload)
    );
    window.dispatchEvent(new CustomEvent(DIVIDEND_EXCLUSION_EVENT));
  } catch {
    // ignore storage errors
  }
};
