// Whether an ex-dividend date has already passed, compared by calendar day
// (not exact time) against a reference "now" -- today itself is not past.
export function isExDividendPast(dividendDateStr, referenceDate = new Date()) {
  if (!dividendDateStr) return false;
  const exDate = new Date(dividendDateStr);
  if (Number.isNaN(exDate.getTime())) return false;
  const todayStart = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate()
  );
  const exDateStart = new Date(exDate.getFullYear(), exDate.getMonth(), exDate.getDate());
  return exDateStart < todayStart;
}
