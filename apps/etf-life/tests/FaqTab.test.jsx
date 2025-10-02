/* eslint-env jest */
import { render, screen } from '@testing-library/react';
import FaqTab from '../src/FaqTab';

test('renders faq heading', () => {
  render(<FaqTab />);
  expect(
    screen.getByRole('heading', { name: /常見問題/ })
  ).toBeInTheDocument();
});

