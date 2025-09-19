/* eslint-env jest */
import { render, screen, fireEvent } from '@testing-library/react';
// Mock asset imports used by App
jest.mock('../assets/conceptB-ETF-Life-dark.svg', () => 'data:image/svg+xml;base64,PHN2Zy8+');
jest.mock('../assets/conceptB-ETF-Life-light.svg', () => 'data:image/svg+xml;base64,PHN2Zy8+');

jest.mock('../api', () => ({
  fetchWithCache: jest.fn(() => Promise.resolve({ data: [], cacheStatus: 'fresh', timestamp: '' })),
  clearCache: jest.fn(),
}));

jest.mock('../config', () => ({ API_HOST: '' }));

import App from '../App';

beforeAll(() => {
  globalThis.fetch = jest.fn(() => Promise.resolve({}));
});

test('App remembers calendar visibility', async () => {
  localStorage.clear();
  const { unmount } = render(<App />);
  const dividendTab = screen.getByRole('button', { name: 'ETF 配息查詢' });
  fireEvent.click(dividendTab);
  const hideBtn = await screen.findByRole('button', { name: '隱藏月曆' });
  fireEvent.click(hideBtn);
  unmount();
  render(<App />);
  const dividendTab2 = screen.getByRole('button', { name: 'ETF 配息查詢' });
  fireEvent.click(dividendTab2);
  const showBtn = await screen.findByRole('button', { name: '顯示月曆' });
  expect(showBtn).toBeInTheDocument();
});
