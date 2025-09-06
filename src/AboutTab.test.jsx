/* eslint-env jest */
import { render, screen, fireEvent } from '@testing-library/react';
import AboutTab from './AboutTab';

test('renders about heading and default tab', () => {
  render(<AboutTab />);
  expect(
    screen.getByRole('heading', { name: /關於本站/ })
  ).toBeInTheDocument();
  expect(
    screen.getByRole('heading', { name: /使用小幫手/ })
  ).toBeInTheDocument();
});

test('switches to FAQ tab when clicked', () => {
  render(<AboutTab />);
  fireEvent.click(screen.getByRole('button', { name: '常見問題' }));
  expect(
    screen.getByRole('heading', { name: /常見問題/ })
  ).toBeInTheDocument();
});
