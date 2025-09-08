import { render, screen } from '@testing-library/react';
import Footer from './components/Footer.jsx';

test('renders contact info and dynamic copyright', () => {
  const year = new Date().getFullYear();
  render(<Footer theme="dark" toggleTheme={() => {}} />);
  expect(screen.getByRole('link', { name: '亮色主題' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: '贊助' })).toBeInTheDocument();
  expect(
    screen.getByText(`© ${year} ETF Life. All rights reserved.`)
  ).toBeInTheDocument();
});
