/* eslint-env jest */
import { getDividendCellDisplay } from '../src/utils/dividendCellFormat';

const validCell = {
  dividend: 1.5,
  dividend_yield: 3.2,
  last_close_price: 101.5,
  hasValidDividend: true,
  hasValidYield: true,
  hasPendingDividend: false,
  hasPendingYield: false,
};

test('valid cell formats compactly by default', () => {
  const result = getDividendCellDisplay(validCell, { lang: 'zh' });
  expect(result.dividendText).toBe('1.500');
  expect(result.yieldText).toBe('3.2%');
  expect(result.closePrice).toBe(101.5);
  expect(result.closePriceText).toBe(101.5);
  expect(result.isDividendValid).toBe(true);
  expect(result.isYieldValid).toBe(true);
});

test('missing price/yield render as a dash in compact mode', () => {
  const cell = { ...validCell, dividend_yield: null, last_close_price: null, hasValidYield: false };
  const result = getDividendCellDisplay(cell, { lang: 'zh' });
  expect(result.yieldText).toBe('—');
  expect(result.closePriceText).toBe('—');
  expect(result.isYieldValid).toBe(false);
});

test('missing price/yield render as spec-mandated long text in verbose mode (zh)', () => {
  const cell = { ...validCell, dividend_yield: null, last_close_price: null, hasValidYield: false };
  const result = getDividendCellDisplay(cell, { lang: 'zh', verbose: true });
  expect(result.closePriceText).toBe('資料不足');
  expect(result.yieldText).toBe('無法計算');
});

test('missing price/yield render as spec-mandated long text in verbose mode (en)', () => {
  const cell = { ...validCell, dividend_yield: null, last_close_price: null, hasValidYield: false };
  const result = getDividendCellDisplay(cell, { lang: 'en', verbose: true });
  expect(result.closePriceText).toBe('Data unavailable');
  expect(result.yieldText).toBe('Not available');
});

test('NaN last_close_price (e.g. a bad string from the API) is treated as missing, not shown literally', () => {
  const cell = { ...validCell, last_close_price: 'NaN' };
  const result = getDividendCellDisplay(cell, { lang: 'zh', verbose: true });
  expect(result.closePrice).toBeNull();
  expect(result.closePriceText).toBe('資料不足');
});

test('a genuine 0% yield is distinguishable from a missing one via rawYield/isYieldValid', () => {
  const cell = { ...validCell, dividend_yield: 0, hasValidYield: true };
  const result = getDividendCellDisplay(cell, { lang: 'zh' });
  expect(result.isYieldValid).toBe(true);
  expect(result.rawYield).toBe(0);
  expect(result.yieldText).toBe('0.0%');
});

test('pending (raw value present but not yet finite) shows the pending label in both modes', () => {
  const cell = { ...validCell, dividend_yield: null, hasValidYield: false, hasPendingYield: true };
  expect(getDividendCellDisplay(cell, { lang: 'zh' }).yieldText).toBe('待確認');
  expect(getDividendCellDisplay(cell, { lang: 'en', verbose: true }).yieldText).toBe('Pending');
});
