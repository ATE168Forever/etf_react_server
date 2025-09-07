import { render, screen } from '@testing-library/react';
import Footer from './components/Footer.jsx';

test('renders contact info and dynamic copyright', () => {
  const year = new Date().getFullYear();
  render(<Footer />);
  expect(screen.getByText('聯絡方式')).toBeInTheDocument();
  expect(
    screen.getByText(`© ${year} ETF Life. All rights reserved.`)
  ).toBeInTheDocument();
});
