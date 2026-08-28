/* eslint-env jest */
import { render, screen, fireEvent } from '@testing-library/react';
import EmptyPortfolioState from '../src/components/EmptyPortfolioState';
import { translations } from '../src/i18n';

const t = (key) => translations.zh[key] || key;

test('renders guidance text without a 0.00 amount', () => {
  render(<EmptyPortfolioState lang="zh" t={t} />);
  expect(screen.getByText(t('empty_portfolio_title'))).toBeInTheDocument();
  expect(screen.queryByText(/0\.00/)).not.toBeInTheDocument();
});

test('renders a clickable CTA when onCtaClick is provided', () => {
  const onCtaClick = jest.fn();
  render(<EmptyPortfolioState onCtaClick={onCtaClick} lang="zh" t={t} />);
  fireEvent.click(screen.getByText(t('empty_portfolio_cta')));
  expect(onCtaClick).toHaveBeenCalled();
});

test('renders the CTA text as non-interactive when onCtaClick is not provided', () => {
  render(<EmptyPortfolioState lang="zh" t={t} />);
  expect(screen.queryByRole('button', { name: t('empty_portfolio_cta') })).not.toBeInTheDocument();
  expect(screen.getByText(t('empty_portfolio_cta'))).toBeInTheDocument();
});

test('does not render a demo CTA when onDemoClick is not provided', () => {
  render(<EmptyPortfolioState lang="zh" t={t} />);
  expect(screen.queryByText(t('empty_portfolio_demo_cta'))).not.toBeInTheDocument();
});

test('renders a clickable demo CTA when onDemoClick is provided', () => {
  const onDemoClick = jest.fn();
  render(<EmptyPortfolioState onDemoClick={onDemoClick} lang="zh" t={t} />);
  fireEvent.click(screen.getByText(t('empty_portfolio_demo_cta')));
  expect(onDemoClick).toHaveBeenCalled();
});
