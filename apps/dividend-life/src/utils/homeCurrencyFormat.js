export function formatMissingValue() {
  return '—';
}

export function formatTwd(value) {
  if (value === null || value === undefined) {
    return formatMissingValue();
  }
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return formatMissingValue();
  }
  return `NT$${Math.round(numericValue).toLocaleString('en-US')}`;
}
