/* eslint-env jest */
import { render, screen, fireEvent, act } from '@testing-library/react';
// Mock asset imports used by App
jest.mock('@shared/assets/dividend-life.svg', () => 'data:image/svg+xml;base64,PHN2Zy8+');
jest.mock('@shared/assets/dividend-life-light.svg', () => 'data:image/svg+xml;base64,PHN2Zy8+');

jest.mock('../src/api', () => ({
  fetchWithCache: jest.fn(() => Promise.resolve({ data: [], cacheStatus: 'fresh', timestamp: '' })),
  clearCache: jest.fn(),
}));

jest.mock('../src/dividendApi', () => ({
  fetchDividendsByYears: jest.fn(() => Promise.resolve({ data: [], meta: null })),
  clearDividendsCache: jest.fn(),
  clearEmptyDividendCaches: jest.fn()
}));

jest.mock('../config', () => ({ API_HOST: '' }));

import App from '../src/App';
import { RouterProvider } from '@shared/router';

beforeAll(() => {
  globalThis.fetch = jest.fn(() => Promise.resolve({}));
});

test('calendar defaults to showing both ex and payment events', async () => {
  localStorage.clear();
  localStorage.setItem('lang', 'zh');
  await act(async () => {
    render(
      <RouterProvider>
        <App />
      </RouterProvider>
    );
  });
  const dividendTab = screen.getByRole('tab', { name: 'ETF 配息查詢' });
  await act(async () => {
    fireEvent.click(dividendTab);
  });
  const bothBtn = await screen.findByRole('button', { name: '全部' });
  expect(bothBtn).toHaveClass('filter-bar__pill--active');
});
