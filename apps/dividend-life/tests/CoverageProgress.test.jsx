/* eslint-env jest */
import { render, screen, fireEvent } from '@testing-library/react';
import CoverageProgress from '../src/components/CoverageProgress';
import { translations } from '../src/i18n';
import { loadLivingCost } from '../src/utils/livingCostStorage';

const t = (key) => translations.zh[key] || key;

beforeEach(() => {
  localStorage.clear();
});

test('shows a setup CTA and input when living cost is not set', () => {
  render(
    <CoverageProgress
      monthlyLivingCost={0} isLivingCostSet={false} coveragePercent={null}
      twScheduled={5000} hasUsAmount={false} lang="zh" t={t} onLivingCostSaved={() => {}}
    />
  );
  expect(screen.getByText(t('coverage_living_cost_cta'))).toBeInTheDocument();
  expect(screen.queryByText(/%/)).not.toBeInTheDocument();
});

test('shows the coverage percent and progress bar when living cost is set', () => {
  render(
    <CoverageProgress
      monthlyLivingCost={10000} isLivingCostSet coveragePercent={50}
      twScheduled={5000} hasUsAmount={false} lang="zh" t={t} onLivingCostSaved={() => {}}
    />
  );
  expect(screen.getByText('50%')).toBeInTheDocument();
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50');
});

test('shows the US pre-tax disclaimer when hasUsAmount is true', () => {
  render(
    <CoverageProgress
      monthlyLivingCost={10000} isLivingCostSet coveragePercent={50}
      twScheduled={5000} hasUsAmount lang="zh" t={t} onLivingCostSaved={() => {}}
    />
  );
  expect(screen.getByText(t('us_dividend_pretax_disclaimer'))).toBeInTheDocument();
});

test('allows editing the living cost after it has already been set', () => {
  render(
    <CoverageProgress
      monthlyLivingCost={10000} isLivingCostSet coveragePercent={50}
      twScheduled={5000} hasUsAmount={false} lang="zh" t={t} onLivingCostSaved={() => {}}
    />
  );
  expect(screen.queryByPlaceholderText(t('coverage_living_cost_placeholder'))).not.toBeInTheDocument();
  fireEvent.click(screen.getByText(t('coverage_living_cost_edit')));
  expect(screen.getByPlaceholderText(t('coverage_living_cost_placeholder'))).toHaveValue(10000);
});

test('saving a new living cost persists it and calls onLivingCostSaved', () => {
  const onLivingCostSaved = jest.fn();
  render(
    <CoverageProgress
      monthlyLivingCost={0} isLivingCostSet={false} coveragePercent={null}
      twScheduled={5000} hasUsAmount={false} lang="zh" t={t} onLivingCostSaved={onLivingCostSaved}
    />
  );
  fireEvent.click(screen.getByText(t('coverage_living_cost_cta')));
  fireEvent.change(screen.getByPlaceholderText(t('coverage_living_cost_placeholder')), { target: { value: '25000' } });
  fireEvent.click(screen.getByText(t('coverage_living_cost_save')));
  expect(loadLivingCost()).toBe(25000);
  expect(onLivingCostSaved).toHaveBeenCalledWith(25000);
});
