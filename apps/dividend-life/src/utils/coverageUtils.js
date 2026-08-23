function buildHoldingsMap(inventoryList = []) {
  const holdings = new Map();
  (Array.isArray(inventoryList) ? inventoryList : []).forEach(item => {
    const stockId = item?.stock_id;
    const quantity = Number(item?.total_quantity);
    if (stockId && Number.isFinite(quantity) && quantity > 0) {
      holdings.set(stockId, quantity);
    }
  });
  return holdings;
}

function resolveCurrency(event) {
  return typeof event?.currency === 'string' && event.currency.trim()
    ? event.currency.trim().toUpperCase()
    : 'TWD';
}

export function calculateCoverage({
  dividendData = [],
  inventoryList = [],
  monthlyLivingCost = 0,
  asOfDate = new Date()
} = {}) {
  const holdings = buildHoldingsMap(inventoryList);
  const today = new Date(asOfDate);
  today.setHours(0, 0, 0, 0);
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();

  let twScheduled = 0;
  let twReceived = 0;
  let twPending = 0;
  let usScheduled = 0;

  (Array.isArray(dividendData) ? dividendData : []).forEach(event => {
    const stockId = event?.stock_id;
    const quantity = holdings.get(stockId);
    if (!quantity) return;

    const eventDateRaw = event?.dividend_date || event?.payment_date;
    const eventDate = eventDateRaw ? new Date(eventDateRaw) : null;
    if (!eventDate || Number.isNaN(eventDate.getTime())) return;
    if (eventDate.getFullYear() !== currentYear || eventDate.getMonth() !== currentMonth) return;

    const perShare = Number(event?.dividend);
    if (!Number.isFinite(perShare) || perShare <= 0) return;
    const amount = perShare * quantity;

    if (resolveCurrency(event) === 'USD') {
      usScheduled += amount;
      return;
    }

    twScheduled += amount;
    const paymentDateRaw = event?.payment_date;
    const paymentDate = paymentDateRaw ? new Date(paymentDateRaw) : null;
    if (paymentDate && !Number.isNaN(paymentDate.getTime()) && paymentDate <= today) {
      twReceived += amount;
    } else {
      twPending += amount;
    }
  });

  const isLivingCostSet = Number(monthlyLivingCost) > 0;
  const coveragePercent = isLivingCostSet
    ? Math.round((twScheduled / Number(monthlyLivingCost)) * 100)
    : null;

  return {
    twScheduled,
    twReceived,
    twPending,
    usScheduled,
    hasUsAmount: usScheduled > 0,
    isLivingCostSet,
    coveragePercent
  };
}
