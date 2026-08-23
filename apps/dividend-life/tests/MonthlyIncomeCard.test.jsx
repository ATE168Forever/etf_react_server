// eslint-env jest
import { render, screen } from '@testing-library/react';
import MonthlyIncomeCard from '../src/components/MonthlyIncomeCard';
import { translations } from '../src/i18n';

const t = (key) => translations.zh[key] || key;

test('shows scheduled, received, and pending amounts', () => {
  render(
    <MonthlyIncomeCard
      twScheduled={2000} twReceived={1000} twPending={500}
      hasUsAmount={false} usScheduled={0} lang="zh" t={t}
    />
  );
  expect(screen.getByText('NT$2,000')).toBeInTheDocument();
  expect(screen.getByText('NT$1,000')).toBeInTheDocument();
  expect(screen.getByText('NT$500')).toBeInTheDocument();
});

test('shows the US pre-tax disclaimer and US amount only when a US amount is present', () => {
  const { rerender } = render(
    <MonthlyIncomeCard
      twScheduled={2000} twReceived={2000} twPending={0}
      hasUsAmount={false} usScheduled={0} lang="zh" t={t}
    />
  );
  expect(screen.queryByText(t('us_dividend_pretax_disclaimer'))).not.toBeInTheDocument();
  expect(screen.queryByText(t('monthly_income_us_label'))).not.toBeInTheDocument();
  expect(screen.queryByText('US$450.00')).not.toBeInTheDocument();

  rerender(
    <MonthlyIncomeCard
      twScheduled={2000} twReceived={2000} twPending={0}
      hasUsAmount usScheduled={450} lang="zh" t={t}
    />
  );
  expect(screen.getByText(t('us_dividend_pretax_disclaimer'))).toBeInTheDocument();
  expect(screen.getByText(t('monthly_income_us_label'))).toBeInTheDocument();
  expect(screen.getByText('US$450.00')).toBeInTheDocument();
});
