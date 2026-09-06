/* eslint-env jest */
import { separateLabelYs } from '../src/utils/chartLabelLayout';

test('leaves two labels untouched when they are already far enough apart', () => {
  const result = separateLabelYs(50, 100, 14);
  expect(result).toEqual({ yA: 50, yB: 100 });
});

test('leaves two labels untouched when the gap is exactly the minimum', () => {
  const result = separateLabelYs(50, 64, 14);
  expect(result).toEqual({ yA: 50, yB: 64 });
});

test('pushes two colliding labels apart to exactly the minimum gap, preserving order', () => {
  // yA (50) is smaller/higher than yB (55) -- a real overlap case from the
  // reported bug, where the bar value and the cumulative value land within
  // a few pixels of each other.
  const result = separateLabelYs(50, 55, 14);
  expect(result.yA).toBeLessThan(result.yB);
  expect(result.yB - result.yA).toBeCloseTo(14);
});

test('preserves order when yB is the smaller/higher one', () => {
  const result = separateLabelYs(55, 50, 14);
  expect(result.yB).toBeLessThan(result.yA);
  expect(result.yA - result.yB).toBeCloseTo(14);
});

test('handles an exact tie by still separating the two labels', () => {
  const result = separateLabelYs(40, 40, 14);
  expect(Math.abs(result.yA - result.yB)).toBeCloseTo(14);
});

test('clamps the smaller (higher) label to the floor instead of pushing it off-chart', () => {
  // Both raw positions are already near the top of the chart -- separating
  // them naively would push the higher one above the floor.
  const result = separateLabelYs(12, 14, 14, 10);
  expect(result.yA).toBeGreaterThanOrEqual(10);
  expect(result.yB - result.yA).toBeCloseTo(14);
});

test('passes through null/undefined labels unchanged (e.g. a month with no bar value)', () => {
  expect(separateLabelYs(null, 80, 14)).toEqual({ yA: null, yB: 80 });
  expect(separateLabelYs(80, null, 14)).toEqual({ yA: 80, yB: null });
  expect(separateLabelYs(null, null, 14)).toEqual({ yA: null, yB: null });
});
