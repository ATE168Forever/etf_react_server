/* eslint-env jest */
import { render, screen } from '@testing-library/react';
import AboutTab from './AboutTab';

test('renders about heading', () => {
  render(<AboutTab />);
  expect(
    screen.getByRole('heading', { name: /About This Project/i })
  ).toBeInTheDocument();
});
