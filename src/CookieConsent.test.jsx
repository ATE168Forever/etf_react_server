import { render, screen, fireEvent } from '@testing-library/react';
import Cookies from 'js-cookie';
import CookieConsent from './components/CookieConsent.jsx';

describe('CookieConsent', () => {
  beforeEach(() => {
    Cookies.remove('cookie_consent');
  });

  test('renders banner and hides after acceptance', () => {
    render(<CookieConsent />);
    expect(
      screen.getByText(/本網站使用 Cookie 以提升使用者體驗/)
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '知道了！' }));
    expect(
      screen.queryByText(/本網站使用 Cookie 以提升使用者體驗/)
    ).not.toBeInTheDocument();
    expect(Cookies.get('cookie_consent')).toBe('true');
  });
});
