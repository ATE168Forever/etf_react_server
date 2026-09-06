/* eslint-env jest */
import { getVisibleMonthCount } from '../src/utils/chartVisibleMonths';

test('for the current year, shows only up through the current month (not the full 12)', () => {
  const referenceDate = new Date(2026, 8, 15); // September 2026 (month index 8)
  expect(getVisibleMonthCount(12, 2026, referenceDate)).toBe(9);
});

test('for a past year, shows all 12 months regardless of today\'s date', () => {
  const referenceDate = new Date(2026, 2, 1); // March 2026
  expect(getVisibleMonthCount(12, 2025, referenceDate)).toBe(12);
});

test('in December of the current year, shows all 12 months', () => {
  const referenceDate = new Date(2026, 11, 31);
  expect(getVisibleMonthCount(12, 2026, referenceDate)).toBe(12);
});

test('in January of the current year, shows only 1 month', () => {
  const referenceDate = new Date(2026, 0, 1);
  expect(getVisibleMonthCount(12, 2026, referenceDate)).toBe(1);
});

test('never returns more than the data array actually has, even for a past year', () => {
  const referenceDate = new Date(2026, 5, 1);
  expect(getVisibleMonthCount(5, 2025, referenceDate)).toBe(5);
});

test('coerces a string year for comparison against the reference date\'s year', () => {
  const referenceDate = new Date(2026, 3, 1); // April 2026 (month index 3)
  expect(getVisibleMonthCount(12, '2026', referenceDate)).toBe(4);
});
