/* eslint-env jest */
import { loadLivingCost, saveLivingCost } from '../src/utils/livingCostStorage';

describe('livingCostStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('returns 0 when nothing is stored', () => {
    expect(loadLivingCost()).toBe(0);
  });

  test('round-trips a saved value', () => {
    saveLivingCost(25000);
    expect(loadLivingCost()).toBe(25000);
  });

  test('normalizes negative values to 0 on save', () => {
    saveLivingCost(-100);
    expect(loadLivingCost()).toBe(0);
  });

  test('normalizes non-finite values to 0 on save', () => {
    saveLivingCost(NaN);
    expect(loadLivingCost()).toBe(0);
  });

  test('treats corrupted stored data as 0', () => {
    localStorage.setItem('dividend_life_monthly_living_cost', 'not-a-number');
    expect(loadLivingCost()).toBe(0);
  });
});
