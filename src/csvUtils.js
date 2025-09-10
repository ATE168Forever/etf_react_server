export function encodeCsvCode(code) {
  return `="${code}"`;
}

export function decodeCsvCode(raw) {
  const trimmed = String(raw).trim();
  if (trimmed.startsWith('="') && trimmed.endsWith('"')) {
    return trimmed.slice(2, -1);
  }
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

export function transactionsToCsv(list) {
  const header = ['stock_id', 'date', 'quantity', 'price', 'type'];
  const rows = list.map(item => [
    encodeCsvCode(item.stock_id),
    item.date,
    item.quantity,
    item.price ?? '',
    item.type
  ].join(','));
  return '\ufeff' + [header.join(','), ...rows].join('\n');
}

export function transactionsFromCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length <= 1) return [];
  const [, ...rows] = lines;
  return rows.filter(line => line.trim()).map(line => {
    const [stock_id, date, quantity, price, type] = line.split(',');
    return {
      stock_id: decodeCsvCode(stock_id),
      date,
      quantity: Number(quantity),
      price: price ? Number(price) : '',
      type
    };
  });
}
