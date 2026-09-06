/* eslint-env jest */
import { render, screen, fireEvent } from '@testing-library/react';
import AddToCalendarButton from '../src/components/AddToCalendarButton';
import { translations } from '../src/i18n';

const t = (key) => translations.zh[key] || key;

const nextPayment = {
  stock_id: '0050',
  stock_name: '元大台灣50',
  dividend: 2,
  quantity: 500,
  total: 1000,
  date: '2026-09-15',
  daysUntil: 9,
};

beforeEach(() => {
  global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
  global.URL.revokeObjectURL = jest.fn();
});

test('renders a clickable button', () => {
  render(<AddToCalendarButton nextPayment={nextPayment} lang="zh" t={t} />);
  expect(screen.getByRole('button')).toBeInTheDocument();
});

test('clicking the button triggers a download via an object URL', () => {
  render(<AddToCalendarButton nextPayment={nextPayment} lang="zh" t={t} />);
  fireEvent.click(screen.getByRole('button'));
  expect(global.URL.createObjectURL).toHaveBeenCalledTimes(1);
  expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
});
