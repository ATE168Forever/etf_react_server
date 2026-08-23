/* eslint-env jest */
import { render, screen } from '@testing-library/react';
import CashflowChart from '../src/components/CashflowChart';
import { translations } from '../src/i18n';

const t = (key) => translations.zh[key] || key;

test('renders an amount row per month', () => {
  const months = [
    { year: 2026, month: 7, amount: 1000, hasAnnouncedData: true, isBelowLivingCost: false },
    { year: 2026, month: 8, amount: 0, hasAnnouncedData: false, isBelowLivingCost: false }
  ];
  render(<CashflowChart months={months} lang="zh" t={t} />);
  expect(screen.getByText('NT$1,000')).toBeInTheDocument();
  expect(screen.getByText(t('cashflow_month_no_data'))).toBeInTheDocument();
});

test('marks months below the living cost target', () => {
  const months = [
    { year: 2026, month: 7, amount: 500, hasAnnouncedData: true, isBelowLivingCost: true }
  ];
  render(<CashflowChart months={months} lang="zh" t={t} />);
  expect(screen.getByText(t('cashflow_below_living_cost'))).toBeInTheDocument();
});
