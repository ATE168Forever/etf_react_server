/* eslint-env jest */
import { render, screen, fireEvent, within } from '@testing-library/react';
import ConceptCalculatorPage from '../src/pages/ConceptCalculatorPage';

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('lang', 'zh');
});

test('preset buttons expose their selected state via aria-pressed', () => {
  render(<ConceptCalculatorPage />);

  const moderateBtns = screen.getAllByRole('button', { name: '穩健' });
  const conservativeBtns = screen.getAllByRole('button', { name: '保守' });
  expect(moderateBtns.length).toBeGreaterThan(0);
  expect(conservativeBtns.length).toBeGreaterThan(0);

  moderateBtns.forEach(btn => expect(btn).toHaveAttribute('aria-pressed', 'true'));
  conservativeBtns.forEach(btn => expect(btn).toHaveAttribute('aria-pressed', 'false'));

  fireEvent.click(conservativeBtns[0]);

  screen.getAllByRole('button', { name: '保守' }).forEach(btn => expect(btn).toHaveAttribute('aria-pressed', 'true'));
  screen.getAllByRole('button', { name: '穩健' }).forEach(btn => expect(btn).toHaveAttribute('aria-pressed', 'false'));
});

test('chart bars are keyboard-focusable and expose per-year data via aria-label', () => {
  render(<ConceptCalculatorPage />);

  const chart = screen.getByRole('img', { name: '配息收入預測圖表' });
  const bars = within(chart).getAllByRole('button');
  expect(bars.length).toBeGreaterThan(0);

  const firstYear = String(new Date().getFullYear());
  expect(bars[0]).toHaveAttribute('tabindex', '0');
  expect(bars[0].getAttribute('aria-label')).toContain(firstYear);

  fireEvent.focus(bars[0]);
  expect(within(chart).getByText(/月股息: NT\$/)).toBeInTheDocument();

  fireEvent.blur(bars[0]);
  expect(within(chart).queryByText(/月股息: NT\$/)).not.toBeInTheDocument();
});
