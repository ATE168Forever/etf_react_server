const STORAGE_KEY = 'dividend_life_monthly_living_cost';

export function loadLivingCost() {
  if (typeof localStorage === 'undefined') return 0;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return 0;
    const value = Number(raw);
    return Number.isFinite(value) && value >= 0 ? value : 0;
  } catch {
    return 0;
  }
}

export function saveLivingCost(value) {
  if (typeof localStorage === 'undefined') return;
  const numericValue = Number(value);
  const safeValue = Number.isFinite(numericValue) && numericValue >= 0 ? numericValue : 0;
  try {
    localStorage.setItem(STORAGE_KEY, String(safeValue));
  } catch (e) {
    console.error('[storage] write failed:', e);
    throw e;
  }
}
