// apps/dividend-life/tests/homeCurrencyFormat.test.js
import { formatTwd, formatMissingValue } from '../src/utils/homeCurrencyFormat';

describe('formatTwd', () => {
  test('formats a positive integer with NT$ prefix and thousands separator, no decimals', () => {
    expect(formatTwd(18620)).toBe('NT$18,620');
  });

  test('rounds fractional values instead of showing decimals', () => {
    expect(formatTwd(18620.6)).toBe('NT$18,621');
  });

  test('formats zero', () => {
    expect(formatTwd(0)).toBe('NT$0');
  });

  test('returns the missing-value placeholder for non-finite input', () => {
    expect(formatTwd(NaN)).toBe('—');
    expect(formatTwd(undefined)).toBe('—');
    expect(formatTwd(null)).toBe('—');
  });
});

describe('formatMissingValue', () => {
  test('returns an em dash', () => {
    expect(formatMissingValue()).toBe('—');
  });
});
