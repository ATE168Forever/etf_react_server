// apps/dividend-life/tests/SummaryHero.test.jsx
/* eslint-env jest */
import { render, screen } from '@testing-library/react';
import SummaryHero from '../src/components/SummaryHero';
import { translations } from '../src/i18n';

const t = (key) => translations.zh[key] || key;

test('shows amount and coverage percent when living cost is set', () => {
  render(<SummaryHero monthLabel="8月" twScheduled={18620} coveragePercent={74} lang="zh" t={t} />);
  expect(screen.getByText(/NT\$18,620/)).toBeInTheDocument();
  expect(screen.getByText(/74%/)).toBeInTheDocument();
});

test('falls back to a no-coverage message when coveragePercent is null', () => {
  render(<SummaryHero monthLabel="8月" twScheduled={18620} coveragePercent={null} lang="zh" t={t} />);
  expect(screen.getByText(/NT\$18,620/)).toBeInTheDocument();
  expect(screen.queryByText(/%/)).not.toBeInTheDocument();
});
