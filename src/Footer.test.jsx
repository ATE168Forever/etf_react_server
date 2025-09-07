import { render, screen } from '@testing-library/react';
import Footer from './components/Footer.jsx';

test('displays copyright with current year', () => {
  const year = new Date().getFullYear();
  render(<Footer />);
  expect(screen.getByText(`© ${year} GiantBean`)).toBeInTheDocument();
});
