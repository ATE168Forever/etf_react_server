// How many months of a 12-slot yearly series should actually be rendered.
// The dividend chart's data is always a fixed-length 12-entry array for the
// current year, with months after "now" carrying a flat carried-forward
// cumulative value (no real data yet) -- for a past year every month has
// already happened, so the full series is shown.
export function getVisibleMonthCount(totalMonths, year, referenceDate = new Date()) {
  const isCurrentYear = Number(year) === referenceDate.getFullYear();
  if (!isCurrentYear) return totalMonths;
  return Math.min(totalMonths, referenceDate.getMonth() + 1);
}
