/* eslint-env jest */
import { render, screen } from '@testing-library/react';
import AboutTab from '../AboutTab';

test('renders about heading and all sections', () => {
  render(<AboutTab />);
  expect(
    screen.getByRole('heading', { name: /關於本站/ })
  ).toBeInTheDocument();
  expect(
    screen.getByRole('heading', { name: /使用小幫手/ })
  ).toBeInTheDocument();
  expect(
    screen.getByRole('heading', { name: /常見問題/ })
  ).toBeInTheDocument();
  expect(
    screen.getByRole('heading', { name: /免責聲明/ })
  ).toBeInTheDocument();
  expect(
    screen.getByRole('heading', { name: /服務條款/ })
  ).toBeInTheDocument();
  expect(
    screen.getByRole('heading', { name: /隱私權政策/ })
  ).toBeInTheDocument();
});
