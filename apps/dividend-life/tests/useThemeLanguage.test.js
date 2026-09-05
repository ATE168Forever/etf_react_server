/* eslint-env jest */
import { getInitialTheme } from '@shared/hooks/useThemeLanguage.jsx';

describe('getInitialTheme', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('defaults new visitors (no stored theme) to light', () => {
    expect(getInitialTheme()).toBe('light');
  });

  test('still honors an explicitly stored theme preference', () => {
    localStorage.setItem('theme', 'dark');
    expect(getInitialTheme()).toBe('dark');
  });
});
