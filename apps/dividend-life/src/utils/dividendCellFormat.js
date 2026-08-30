const COMPACT_MISSING = '—';

// Number(null) is 0 (not NaN), so a raw null/undefined/'' value must be
// rejected before coercion — otherwise a missing last_close_price would be
// treated as a valid 0 instead of missing.
const isFiniteNumber = (value) =>
  value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));

function missingCloseText(lang, verbose) {
  if (!verbose) return COMPACT_MISSING;
  return lang === 'zh' ? '資料不足' : 'Data unavailable';
}

function missingYieldText(lang, verbose) {
  if (!verbose) return COMPACT_MISSING;
  return lang === 'zh' ? '無法計算' : 'Not available';
}

function missingDividendText(lang, verbose) {
  if (!verbose) return COMPACT_MISSING;
  return lang === 'zh' ? '資料不足' : 'Data unavailable';
}

export function getDividendCellDisplay(cell, { lang = 'zh', verbose = false } = {}) {
  const pendingText = lang === 'zh' ? '待確認' : 'Pending';

  const rawDividend = Number(cell?.dividend);
  const rawYield = Number(cell?.dividend_yield);
  const isDividendValid = Boolean(cell?.hasValidDividend) && isFiniteNumber(rawDividend);
  const isYieldValid = Boolean(cell?.hasValidYield) && isFiniteNumber(rawYield);
  const hasPendingDividend = Boolean(cell?.hasPendingDividend);
  const hasPendingYield = Boolean(cell?.hasPendingYield);

  const dividendText = isDividendValid
    ? rawDividend.toFixed(3)
    : hasPendingDividend
      ? pendingText
      : missingDividendText(lang, verbose);

  const yieldText = isYieldValid
    ? `${rawYield.toFixed(1)}%`
    : (hasPendingYield || hasPendingDividend)
      ? pendingText
      : missingYieldText(lang, verbose);

  const rawCloseInput = cell?.last_close_price;
  const closePrice = isFiniteNumber(rawCloseInput) ? Number(rawCloseInput) : null;
  const closePriceText = closePrice !== null ? closePrice : missingCloseText(lang, verbose);

  return {
    isDividendValid,
    isYieldValid,
    dividendText,
    yieldText,
    closePrice,
    closePriceText,
    rawDividend: isDividendValid ? rawDividend : null,
    rawYield: isYieldValid ? rawYield : null,
  };
}
