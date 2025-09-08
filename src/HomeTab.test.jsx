/* eslint-env jest */
import { render, screen } from '@testing-library/react';
import HomeTab from './HomeTab';

test('renders data milestones section', () => {
  render(<HomeTab />);
  expect(screen.getByText('本站數據概況')).toBeInTheDocument();
  expect(screen.getByText('80+')).toBeInTheDocument();
});

test('renders latest updates section', () => {
  render(<HomeTab />);
  expect(screen.getByText('最新收錄')).toBeInTheDocument();
});

test('renders knowledge section', () => {
  render(<HomeTab />);
  expect(screen.getByText('ETF 小知識')).toBeInTheDocument();
});
