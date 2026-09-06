/* eslint-env jest */
import { render, screen, fireEvent } from '@testing-library/react';
import FaqTab from '../src/FaqTab';

test('renders faq heading', () => {
  render(<FaqTab />);
  expect(
    screen.getByRole('heading', { name: /常見問題/ })
  ).toBeInTheDocument();
});

test('the FAQ section is collapsed by default and expands independently of other sections', () => {
  render(<FaqTab />);
  const faqDetails = screen.getByRole('heading', { name: /常見問題/ }).closest('details');
  expect(faqDetails.open).toBe(false);

  const firstQuestion = screen.getByText('殖利率是怎麼算的？');
  expect(firstQuestion).toBeInTheDocument();
  const firstAnswerDetails = firstQuestion.closest('details');
  expect(firstAnswerDetails.open).toBe(false);

  fireEvent.click(screen.getByRole('heading', { name: /常見問題/ }));
  expect(faqDetails.open).toBe(true);
  expect(firstAnswerDetails.open).toBe(false);

  fireEvent.click(firstQuestion);
  expect(firstAnswerDetails.open).toBe(true);
  expect(faqDetails.open).toBe(true);
});

test('renders the JSON-LD FAQPage schema regardless of accordion state', () => {
  const { container } = render(<FaqTab />);
  const script = container.querySelector('script[type="application/ld+json"]');
  expect(script).toBeInTheDocument();
  expect(script.textContent).toContain('FAQPage');
});

