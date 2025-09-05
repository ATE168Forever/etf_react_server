/* eslint-env jest */
import { render, screen } from '@testing-library/react';
import AboutTab from './AboutTab';

test('renders about heading', () => {
  render(<AboutTab />);
  expect(
    screen.getByRole('heading', { name: /關於這個專案/ })
  ).toBeInTheDocument();
});
