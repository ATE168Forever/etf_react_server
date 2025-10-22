/* eslint-env jest */
import { render, screen } from '@testing-library/react';
import DividendCalendar from '../src/components/DividendCalendar';

test('displays monthly ex and pay totals', () => {
  const nowStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' });
  const [year, month] = nowStr.split('-');
  const events = [
    { date: `${year}-${month}-05`, type: 'ex', amount: 100 },
    { date: `${year}-${month}-15`, type: 'pay', amount: 200 }
  ];
  render(<DividendCalendar year={Number(year)} events={events} />);
  expect(
    screen.getByText((_, element) => element.textContent && element.textContent.replace(/\s/g, '') === '除息金額:NT$100')
  ).toBeInTheDocument();
  expect(
    screen.getByText((_, element) => element.textContent && element.textContent.replace(/\s/g, '') === '發放金額:NT$200')
  ).toBeInTheDocument();
});

test('displays USD totals with three decimal places', () => {
  const nowStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' });
  const [year, month] = nowStr.split('-');
  const events = [
    { date: `${year}-${month}-05`, type: 'ex', amount: 10.1, currency: 'USD' },
    { date: `${year}-${month}-15`, type: 'pay', amount: 20.1234, currency: 'USD' }
  ];
  render(<DividendCalendar year={Number(year)} events={events} />);
  expect(
    screen.getByText((_, element) => element.textContent && element.textContent.replace(/\s/g, '') === '除息金額:US$10.100')
  ).toBeInTheDocument();
  expect(
    screen.getByText((_, element) => element.textContent && element.textContent.replace(/\s/g, '') === '發放金額:US$20.123')
  ).toBeInTheDocument();
});

test('hides monthly totals when showTotals is false', () => {
  const nowStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' });
  const [year, month] = nowStr.split('-');
  const events = [
    { date: `${year}-${month}-05`, type: 'ex', amount: 100 },
    { date: `${year}-${month}-15`, type: 'pay', amount: 200 }
  ];
  render(<DividendCalendar year={Number(year)} events={events} showTotals={false} />);
  expect(
    screen.queryByText((_, element) => element.textContent && element.textContent.replace(/\s/g, '') === '除息金額:NT$100')
  ).not.toBeInTheDocument();
  expect(
    screen.queryByText((_, element) => element.textContent && element.textContent.replace(/\s/g, '') === '發放金額:NT$200')
  ).not.toBeInTheDocument();
});
