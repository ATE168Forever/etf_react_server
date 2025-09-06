/* eslint-env jest */
import { render, screen } from '@testing-library/react';
import DisclaimerTab from './DisclaimerTab';

test('renders disclaimer heading', () => {
  render(<DisclaimerTab />);
  expect(
    screen.getByRole('heading', { name: /免責聲明/ })
  ).toBeInTheDocument();
});

