const ID_PREFIX = 'tx_';

function generateTransactionId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${ID_PREFIX}${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function normalizePrice(type, price) {
  if (type === 'sell') return '';
  const numeric = Number(price);
  return Number.isFinite(numeric) ? numeric : '';
}

export function ensureTransactionId(item) {
  if (!item || typeof item !== 'object') {
    return null;
  }
  const id = typeof item.id === 'string' && item.id ? item.id : generateTransactionId();
  const type = item.type === 'sell' ? 'sell' : 'buy';
  return {
    ...item,
    id,
    type,
    price: normalizePrice(type, item.price)
  };
}

export function ensureTransactionListHasIds(list) {
  return (Array.isArray(list) ? list : [])
    .map(ensureTransactionId)
    .filter(item => item !== null);
}

export function serializeTransaction(item) {
  const type = item?.type === 'sell' ? 'sell' : 'buy';
  const quantity = Number(item?.quantity);
  const normalizedQuantity = Number.isFinite(quantity) ? quantity : 0;
  const price = normalizePrice(type, item?.price);

  return {
    stock_id: item?.stock_id || '',
    stock_name: item?.stock_name || '',
    date: item?.date || '',
    quantity: normalizedQuantity,
    price: type === 'buy' ? (price === '' ? null : price) : null,
    type
  };
}

export function deserializeTransaction(id, data) {
  const type = data?.type === 'sell' ? 'sell' : 'buy';
  const price = type === 'buy' ? data?.price ?? '' : '';
  const updatedAt = data?.updatedAt?.toMillis ? data.updatedAt.toMillis() : data?.updatedAt ?? null;
  const createdAt = data?.createdAt?.toMillis ? data.createdAt.toMillis() : data?.createdAt ?? null;
  return {
    id,
    stock_id: data?.stock_id || '',
    stock_name: data?.stock_name || '',
    date: data?.date || '',
    quantity: Number(data?.quantity) || 0,
    price: price === null ? '' : price,
    type,
    updatedAt,
    createdAt
  };
}

export function sortTransactionsByDate(list) {
  return [...(Array.isArray(list) ? list : [])].sort((a, b) => {
    const dateA = new Date(a?.date || 0).getTime();
    const dateB = new Date(b?.date || 0).getTime();
    if (dateA !== dateB) return dateA - dateB;
    if (a?.createdAt && b?.createdAt && a.createdAt !== b.createdAt) {
      return a.createdAt - b.createdAt;
    }
    return (a?.id || '').localeCompare(b?.id || '');
  });
}

export function toTransactionMap(list) {
  const map = new Map();
  (Array.isArray(list) ? list : []).forEach(item => {
    if (item?.id) {
      map.set(item.id, item);
    }
  });
  return map;
}

export function areTransactionsEqual(a, b) {
  if (a === b) return true;
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    const first = a[i];
    const second = b[i];
    if (!first || !second) return false;
    if (first.id !== second.id) return false;
    if (first.stock_id !== second.stock_id) return false;
    if (first.stock_name !== second.stock_name) return false;
    if (first.date !== second.date) return false;
    if (first.type !== second.type) return false;
    const firstPrice = first.price === '' ? '' : Number(first.price);
    const secondPrice = second.price === '' ? '' : Number(second.price);
    if (firstPrice !== secondPrice) return false;
    if (Number(first.quantity) !== Number(second.quantity)) return false;
  }
  return true;
}

export { generateTransactionId };
