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
  const header = ['stock_id', 'stock_name', 'date', 'quantity', 'price', 'type'];
  const rows = list.map(item => [
    encodeCsvCode(item.stock_id),
    item.stock_name || '',
    item.date,
    item.quantity,
    item.price ?? '',
    item.type
  ].join(','));
  return '﻿' + [header.join(','), ...rows].join('\n');
}

export function transactionsFromCsv(text) {
  // Remove BOM if present (handles UTF-8 BOM from different platforms)
  let cleanText = text;
  if (cleanText.charCodeAt(0) === 0xFEFF) {
    cleanText = cleanText.slice(1);
  }
  // Also remove the BOM character if it appears as a string
  cleanText = cleanText.replace(/^\uFEFF/, '');

  // Normalize line endings and trim
  cleanText = cleanText.trim().replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  const lines = cleanText.split('\n');
  if (lines.length <= 1) return [];

  // Parse header and clean it
  const header = lines[0].split(',').map(h => h.trim());
  const hasName = header.includes('stock_name');
  const rows = lines.slice(1);

  return rows.filter(line => line.trim()).map(line => {
    const parts = line.split(',').map(p => p.trim());
    if (hasName) {
      const [stock_id, stock_name, date, quantity, price, type] = parts;
      return {
        stock_id: decodeCsvCode(stock_id),
        stock_name: stock_name || '',
        date: date || '',
        quantity: Number(quantity),
        price: price ? Number(price) : '',
        type: type || ''
      };
    }
    const [stock_id, date, quantity, price, type] = parts;
    return {
      stock_id: decodeCsvCode(stock_id),
      stock_name: '',
      date: date || '',
      quantity: Number(quantity),
      price: price ? Number(price) : '',
      type: type || ''
    };
  });
}
