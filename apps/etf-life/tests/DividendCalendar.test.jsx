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
  expect(screen.getByText(/除息金額/)).toHaveTextContent(/NT\$\s*100/);
  expect(screen.getByText(/發放金額/)).toHaveTextContent(/NT\$\s*200/);
});

test('hides monthly totals when showTotals is false', () => {
  const nowStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' });
  const [year, month] = nowStr.split('-');
  const events = [
    { date: `${year}-${month}-05`, type: 'ex', amount: 100 },
    { date: `${year}-${month}-15`, type: 'pay', amount: 200 }
  ];
  render(<DividendCalendar year={Number(year)} events={events} showTotals={false} />);
  expect(screen.queryByText(/除息金額/)).not.toBeInTheDocument();
  expect(screen.queryByText(/發放金額/)).not.toBeInTheDocument();
});
