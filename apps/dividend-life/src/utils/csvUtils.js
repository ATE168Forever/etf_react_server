export function encodeCsvCode(code) {
  return `="${code}"`;
}

export function decodeCsvCode(raw) {
  const trimmed = String(raw).trim();
  // Formula-encoded value with quotes: ="..."
  if (trimmed.startsWith('="') && trimmed.endsWith('"')) {
    return trimmed.slice(2, -1);
  }
  // Formula-encoded value after CSV parsing consumed outer quotes: =...
  if (trimmed.startsWith('=') && !trimmed.startsWith('="')) {
    return trimmed.slice(1);
  }
  // Regular quoted field
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function quoteField(value) {
  const str = String(value ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function parseCsvLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;
  let i = 0;
  while (i < line.length) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i += 2;
        } else {
          inQuotes = false;
          i++;
        }
      } else {
        current += ch;
        i++;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
        i++;
      } else if (ch === ',') {
        fields.push(current);
        current = '';
        i++;
      } else {
        current += ch;
        i++;
      }
    }
  }
  fields.push(current);
  return fields;
}

export function transactionsToCsv(list) {
  const header = ['stock_id', 'stock_name', 'date', 'quantity', 'price', 'type'];
  const rows = list.map(item => [
    encodeCsvCode(item.stock_id),
    quoteField(item.stock_name || ''),
    item.date,
    item.quantity,
    item.price ?? '',
    item.type
  ].join(','));
  return '﻿' + [header.join(','), ...rows].join('\n');
}

export function transactionsFromCsv(text) {
  let cleanText = text;
  if (cleanText.charCodeAt(0) === 0xFEFF) {
    cleanText = cleanText.slice(1);
  }
  cleanText = cleanText.replace(/^﻿/, '');
  cleanText = cleanText.trim().replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  const lines = cleanText.split('\n');
  if (lines.length <= 1) return [];

  const header = parseCsvLine(lines[0]).map(h => h.trim());
  const hasName = header.includes('stock_name');

  return lines.slice(1).filter(line => line.trim()).map(line => {
    const parts = parseCsvLine(line).map(p => p.trim());
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
