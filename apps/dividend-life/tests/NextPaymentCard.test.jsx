/* eslint-env jest */
import { render, screen } from '@testing-library/react';
import NextPaymentCard from '../src/components/NextPaymentCard';
import { translations } from '../src/i18n';

const t = (key) => translations.zh[key] || key;

test('shows the empty-state message when there is no announced payment', () => {
  render(<NextPaymentCard nextPayment={null} lang="zh" t={t} />);
  expect(screen.getByText(t('next_payment_empty'))).toBeInTheDocument();
});

test('shows stock, amount, and days-until when a payment is announced', () => {
  const nextPayment = {
    stock_id: '0050', stock_name: '元大台灣50', dividend: 2, quantity: 500,
    total: 1000, date: '2026-09-01', daysUntil: 5
  };
  render(<NextPaymentCard nextPayment={nextPayment} lang="zh" t={t} />);
  expect(screen.getByText(/0050/)).toBeInTheDocument();
  expect(screen.getByText('NT$1,000')).toBeInTheDocument();
  expect(screen.getByText(t('next_payment_days_in_n').replace('{days}', '5'))).toBeInTheDocument();
});

test('renders the optional calendarAction slot when provided', () => {
  const nextPayment = { stock_id: '0050', stock_name: '元大台灣50', dividend: 2, quantity: 500, total: 1000, date: '2026-09-01', daysUntil: 5 };
  render(<NextPaymentCard nextPayment={nextPayment} lang="zh" t={t} calendarAction={<button type="button">ics</button>} />);
  expect(screen.getByText('ics')).toBeInTheDocument();
});
