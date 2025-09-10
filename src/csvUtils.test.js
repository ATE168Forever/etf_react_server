/* eslint-env jest */
import { encodeCsvCode, decodeCsvCode } from './csvUtils';

test('encodeCsvCode wraps code with formula to preserve leading zeros', () => {
  expect(encodeCsvCode('00878')).toBe('="00878"');
});

test('decodeCsvCode removes wrapper and returns original code', () => {
  expect(decodeCsvCode('="00878"')).toBe('00878');
  expect(decodeCsvCode('00878')).toBe('00878');
});
