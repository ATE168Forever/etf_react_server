/* eslint-env jest */
import { isExDividendPast } from '../src/utils/exDividendStatus';

test('a date before today (by calendar day) is past', () => {
  const referenceDate = new Date(2026, 8, 15); // Sep 15, 2026
  expect(isExDividendPast('2026-09-14', referenceDate)).toBe(true);
});

test('a date after today is not past', () => {
  const referenceDate = new Date(2026, 8, 15);
  expect(isExDividendPast('2026-09-16', referenceDate)).toBe(false);
});

test('a date equal to today is not past (still current)', () => {
  const referenceDate = new Date(2026, 8, 15);
  expect(isExDividendPast('2026-09-15', referenceDate)).toBe(false);
});

test('ignores time-of-day when comparing -- only the calendar date matters', () => {
  const referenceDate = new Date(2026, 8, 15, 23, 59);
  expect(isExDividendPast('2026-09-15', referenceDate)).toBe(false);
});

test('a null or empty date is not treated as past', () => {
  const referenceDate = new Date(2026, 8, 15);
  expect(isExDividendPast(null, referenceDate)).toBe(false);
  expect(isExDividendPast('', referenceDate)).toBe(false);
  expect(isExDividendPast(undefined, referenceDate)).toBe(false);
});

test('an unparseable date string is not treated as past', () => {
  const referenceDate = new Date(2026, 8, 15);
  expect(isExDividendPast('not-a-date', referenceDate)).toBe(false);
});
