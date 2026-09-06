/* eslint-env jest */
import { render, screen, fireEvent } from '@testing-library/react';
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

test('event tooltip shows localized unavailable text for missing price/yield, never "null" or a bare 0%', () => {
  const nowStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' });
  const [year, month] = nowStr.split('-');
  const eventWithMissingData = {
    date: `${year}-${month}-07`,
    type: 'ex',
    stock_id: 'SEMY',
    stock_name: 'GraniteShares YieldBOOST Semiconductor ETF',
    amount: 1.835,
    dividend: 0.18346,
    quantity: 10,
    dividend_yield: null,
    hasValidYield: false,
    hasPendingYield: false,
    last_close_price: null,
    dividend_date: `${year}-${month}-07`,
    payment_date: `${year}-${month}-14`,
    currency: 'USD',
  };

  const { container } = render(<DividendCalendar year={Number(year)} events={[eventWithMissingData]} />);

  const tooltipTrigger = Array.from(container.querySelectorAll('.tooltip-text'))
    .find(el => (el.title || '').includes('除息前一天收盤價'));

  expect(tooltipTrigger).toBeTruthy();
  expect(tooltipTrigger.title).not.toMatch(/null/);
  expect(tooltipTrigger.title).toMatch(/資料不足/); // missing close price
  expect(tooltipTrigger.title).toMatch(/無法計算/); // missing/uncalculable yield
  expect(tooltipTrigger.title).not.toMatch(/當次殖利率: 0%/); // never a bare "0%"
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

test('day cells show colored dots instead of stock-code text, capped at 3 with a +N overflow indicator', () => {
  const nowStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' });
  const [year, month, day] = nowStr.split('-');
  const dateStr = `${year}-${month}-${day}`;
  const events = [
    { date: dateStr, type: 'ex', stock_id: 'AAA', amount: 10 },
    { date: dateStr, type: 'pay', stock_id: 'BBB', amount: 20 },
    { date: dateStr, type: 'ex', stock_id: 'CCC', amount: 30 },
    { date: dateStr, type: 'pay', stock_id: 'DDD', amount: 40 },
  ];
  const { container } = render(<DividendCalendar year={Number(year)} events={events} />);

  expect(screen.queryByText('AAA')).not.toBeInTheDocument();
  expect(screen.queryByText('BBB')).not.toBeInTheDocument();
  expect(container.querySelectorAll('.calendar-dot').length).toBe(3);
  expect(screen.getByText('+1')).toBeInTheDocument();
});

test('clicking a day with events opens a detail panel below the grid, listing that day\'s events', () => {
  const nowStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' });
  const [year, month, day] = nowStr.split('-');
  const dateStr = `${year}-${month}-${day}`;
  const events = [
    { date: dateStr, type: 'ex', stock_id: 'AAA', amount: 10, dividend: 0.5 },
  ];
  render(<DividendCalendar year={Number(year)} events={events} />);

  expect(screen.queryByText('AAA', { selector: '.calendar-day-detail__stock' })).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: new RegExp(`${Number(day)} 日`) }));

  expect(screen.getByText('AAA', { selector: '.calendar-day-detail__stock' })).toBeInTheDocument();
});

test('clicking the selected day again closes the detail panel', () => {
  const nowStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' });
  const [year, month, day] = nowStr.split('-');
  const dateStr = `${year}-${month}-${day}`;
  const events = [{ date: dateStr, type: 'pay', stock_id: 'AAA', amount: 10, dividend: 0.5 }];
  render(<DividendCalendar year={Number(year)} events={events} />);

  const dayButton = screen.getByRole('button', { name: new RegExp(`${Number(day)} 日`) });
  fireEvent.click(dayButton);
  expect(screen.getByText('AAA', { selector: '.calendar-day-detail__stock' })).toBeInTheDocument();

  fireEvent.click(dayButton);
  expect(screen.queryByText('AAA', { selector: '.calendar-day-detail__stock' })).not.toBeInTheDocument();
});

test('a day with no events is not rendered as a clickable button', () => {
  const nowStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' });
  const [year] = nowStr.split('-');
  render(<DividendCalendar year={Number(year)} events={[]} />);
  // No events anywhere this month: no day-number buttons should exist at all.
  expect(screen.queryAllByRole('button', { name: /日，\d+ 筆股息事件/ }).length).toBe(0);
});

test('the selected date cell gets the gold selection class', () => {
  const nowStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' });
  const [year, month, day] = nowStr.split('-');
  const dateStr = `${year}-${month}-${day}`;
  const events = [{ date: dateStr, type: 'ex', stock_id: 'AAA', amount: 10 }];
  const { container } = render(<DividendCalendar year={Number(year)} events={events} />);

  fireEvent.click(screen.getByRole('button', { name: new RegExp(`${Number(day)} 日`) }));

  const selectedCell = container.querySelector('.calendar-cell--selected');
  expect(selectedCell).toBeInTheDocument();
  expect(selectedCell.textContent).toContain(String(Number(day)));
});

test('the dot tooltip includes the stock code and name', () => {
  const nowStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' });
  const [year, month, day] = nowStr.split('-');
  const dateStr = `${year}-${month}-${day}`;
  const events = [
    { date: dateStr, type: 'ex', stock_id: '00770', stock_name: '富邦特選高股息30', amount: 100, quantity: 1000 },
  ];
  const { container } = render(<DividendCalendar year={Number(year)} events={events} />);

  const dot = container.querySelector('.calendar-dot');
  const tooltipTrigger = dot.closest('.tooltip-text');
  expect(tooltipTrigger.title).toMatch(/00770/);
  expect(tooltipTrigger.title).toMatch(/富邦特選高股息30/);
});

test('each dot has a short accessible name identifying the stock and event type', () => {
  const nowStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' });
  const [year, month, day] = nowStr.split('-');
  const dateStr = `${year}-${month}-${day}`;
  const events = [
    { date: dateStr, type: 'ex', stock_id: 'AAA', amount: 10 },
    { date: dateStr, type: 'pay', stock_id: 'BBB', amount: 20 },
  ];
  const { container } = render(<DividendCalendar year={Number(year)} events={events} />);

  const dots = container.querySelectorAll('.calendar-dot');
  expect(dots.length).toBe(2);
  expect(dots[0].closest('.tooltip-text')).toHaveAttribute('aria-label', 'AAA 除息日');
  expect(dots[1].closest('.tooltip-text')).toHaveAttribute('aria-label', 'BBB 發放日');
});
