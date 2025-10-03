const THIN_SPACE_REGEX = /[\u00A0\u2000-\u200A\u202F\u205F\u3000]/g;
const DECIMAL_LIKE_REGEX = /[\uFF0E\u2024\uFE52\uFF61\u3002\u00B7\u0387\u2022\u2027\u2219\u22C5\u30FB\uFF65\u02D9\u2E30\u2E31\u2981\u2218\uA78F\u1427\u16EB\u318D]/g;
const NUMERIC_FRAGMENT_REGEX = /[+-]?(?:\d{1,3}(?:[.,]\d{3})*|\d+)(?:[.,]\d+)?|[+-]?\.[0-9]+/g;

function normalizeFullWidthChars(value) {
  if (typeof value !== 'string') return value;
  return value
    // Digits ０-９ -> 0-9
    .replace(/[\uFF10-\uFF19]/g, char => String.fromCharCode(char.charCodeAt(0) - 0xFF10 + 0x30))
    // Full-width plus/minus signs → ASCII
    .replace(/\uFF0B/g, '+')
    .replace(/[\uFF0D\u2212]/g, '-')
    // Treat thin-space style thousands separators as commas so later logic recognises them
    .replace(THIN_SPACE_REGEX, ',')
    // Common middle-dot / bullet style decimal separators → ASCII decimal point
    .replace(DECIMAL_LIKE_REGEX, '.')
    .replace(/[\uFF0C\uFE50\uFE10\uFE51\u3001]/g, ',');
}

export function parseNumeric(value) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : Number.NaN;
  }

  if (typeof value !== 'string') {
    return Number.NaN;
  }

  const trimmed = normalizeFullWidthChars(value).trim();
  if (!trimmed) return Number.NaN;

  const sanitized = trimmed.replace(/[^0-9+.,-]/g, ' ');

  const matches = sanitized.matchAll(NUMERIC_FRAGMENT_REGEX);

  let bestResult = Number.NaN;
  let bestAbs = -Infinity;

  for (const match of matches) {
    const candidate = match[0];
    if (!candidate) continue;

    const parsed = parseSanitizedNumeric(candidate);
    if (!Number.isFinite(parsed)) continue;

    const absValue = Math.abs(parsed);
    if (!Number.isFinite(bestResult) || absValue > bestAbs) {
      bestResult = parsed;
      bestAbs = absValue;
    }
  }

  return bestResult;
}

export default parseNumeric;

function parseSanitizedNumeric(numericStr) {
  if (!numericStr) return Number.NaN;

  const sign = numericStr[0] === '+' || numericStr[0] === '-' ? numericStr[0] : '';
  let body = sign ? numericStr.slice(1) : numericStr;
  if (!body) return Number.NaN;

  const separators = [];
  for (let i = 0; i < body.length; i += 1) {
    const ch = body[i];
    if (ch === '.' || ch === ',') {
      separators.push({ char: ch, index: i });
    }
  }

  if (!separators.length) {
    const digitsOnly = body.replace(/[^0-9]/g, '');
    if (!digitsOnly) return Number.NaN;
    const result = Number(`${sign}${digitsOnly}`);
    return Number.isFinite(result) ? result : Number.NaN;
  }

  const lastSeparator = separators[separators.length - 1];
  const fractionalLength = body.length - lastSeparator.index - 1;

  let normalized;
  if (separators.length === 1) {
    const rawInteger = body.slice(0, lastSeparator.index).replace(/[,\.]/g, '');
    const rawFractional = body.slice(lastSeparator.index + 1).replace(/[,\.]/g, '');
    const treatAsThousands = fractionalLength === 3 && rawInteger && rawInteger[0] !== '0';
    if (treatAsThousands) {
      normalized = rawInteger + rawFractional;
    } else {
      const integerPart = rawInteger || '0';
      normalized = rawFractional
        ? `${integerPart}.${rawFractional}`
        : integerPart;
    }
  } else {
    const digitsOnly = body.replace(/[,\.]/g, '');
    if (!digitsOnly) return Number.NaN;
    const rawInteger = body.slice(0, lastSeparator.index).replace(/[,\.]/g, '');
    const uniformSeparator = separators.every(({ char }) => char === separators[0].char);
    const looksLikeThousands = uniformSeparator
      && fractionalLength === 3
      && rawInteger
      && (rawInteger[0] !== '0' || rawInteger.length > 3);

    if (looksLikeThousands) {
      normalized = digitsOnly;
    } else if (fractionalLength > 0) {
      const integerDigits = digitsOnly.slice(0, digitsOnly.length - fractionalLength) || '0';
      const fractionalDigits = digitsOnly.slice(digitsOnly.length - fractionalLength);
      normalized = `${integerDigits}.${fractionalDigits}`;
    } else {
      normalized = digitsOnly;
    }
  }

  const result = Number(`${sign}${normalized}`);
  return Number.isFinite(result) ? result : Number.NaN;
}
