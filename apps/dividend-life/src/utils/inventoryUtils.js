function parseNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

export function summarizeInventory(transactionHistory, stockList = [], latestPrices = {}) {
  const stockMap = new Map(stockList.map(item => [item.stock_id, item]));
  const inventoryMap = new Map();

  transactionHistory.forEach(item => {
    const stockId = item?.stock_id;
    if (!stockId) return;
    if (!inventoryMap.has(stockId)) {
      const stockInfo = stockMap.get(stockId) || {};
      inventoryMap.set(stockId, {
        stock_id: stockId,
        stock_name: stockInfo.stock_name || item.stock_name || '',
        country: (stockInfo.country || item.country || '').toUpperCase() || '',
        total_quantity: 0,
        total_cost: 0
      });
    }
    const info = inventoryMap.get(stockId);
    const quantity = parseNumber(item.quantity);
    if (item.type === 'sell') {
      const sellQty = Math.min(quantity, info.total_quantity);
      if (sellQty > 0 && info.total_quantity > 0) {
        const avgCost = info.total_cost / info.total_quantity;
        info.total_quantity -= sellQty;
        info.total_cost -= avgCost * sellQty;
      }
    } else {
      const price = parseNumber(item.price);
      info.total_quantity += quantity;
      info.total_cost += quantity * price;
      if (!info.stock_name && item.stock_name) {
        info.stock_name = item.stock_name;
      }
      if (!info.stock_name) {
        const stockInfo = stockMap.get(stockId);
        if (stockInfo?.stock_name) {
          info.stock_name = stockInfo.stock_name;
        }
      }
      if (!info.country) {
        const stockInfo = stockMap.get(stockId);
        const fromHistory = typeof item.country === 'string' ? item.country.trim() : '';
        const candidate = stockInfo?.country || fromHistory;
        if (candidate) {
          info.country = candidate.toUpperCase();
        }
      }
    }
  });

  const inventoryList = Array.from(inventoryMap.values())
    .filter(item => item.total_quantity > 0)
    .map(item => ({
      ...item,
      avg_price: item.total_quantity > 0 ? item.total_cost / item.total_quantity : 0
    }));

  const totalInvestment = inventoryList.reduce((sum, item) => sum + item.total_cost, 0);
  const totalValue = inventoryList.reduce(
    (sum, item) => sum + item.total_quantity * (parseNumber(latestPrices[item.stock_id]) || 0),
    0
  );

  return {
    inventoryList,
    totalInvestment,
    totalValue
  };
}

/**
 * Extract unique purchased stock IDs from transaction history.
 * Filters to only include stocks with positive inventory.
 * @param {Array} transactionHistory - Array of transaction records
 * @returns {string[]} - Sorted array of unique stock IDs
 */
export function getPurchasedStockIds(transactionHistory) {
  const { inventoryList } = summarizeInventory(transactionHistory);
  const ids = inventoryList
    .map(item => {
      const raw = item?.stock_id;
      return typeof raw === 'string' ? raw.trim() : raw ? String(raw).trim() : '';
    })
    .filter(Boolean);
  const unique = Array.from(new Set(ids));
  unique.sort((a, b) => a.localeCompare(b));
  return unique;
}

export function calculateMonthlyContribution(transactionHistory, referenceDate = new Date()) {
  const year = referenceDate.getFullYear();
  const month = String(referenceDate.getMonth() + 1).padStart(2, '0');
  const targetMonth = `${year}-${month}`;

  return transactionHistory.reduce((sum, item) => {
    if (item.type === 'sell') return sum;
    if (!item.date) return sum;
    const month = String(item.date).slice(0, 7);
    if (month !== targetMonth) return sum;
    const quantity = parseNumber(item.quantity);
    const price = parseNumber(item.price);
    return sum + quantity * price;
  }, 0);
}
