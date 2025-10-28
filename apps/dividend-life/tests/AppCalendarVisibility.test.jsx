/* eslint-env jest */
import { render, screen, fireEvent, act } from '@testing-library/react';
// Mock asset imports used by App
jest.mock('../src/assets/dividend-life.svg', () => 'data:image/svg+xml;base64,PHN2Zy8+');
jest.mock('../src/assets/dividend-life-light.svg', () => 'data:image/svg+xml;base64,PHN2Zy8+');

jest.mock('../src/api', () => ({
  fetchWithCache: jest.fn(() => Promise.resolve({ data: [], cacheStatus: 'fresh', timestamp: '' })),
  clearCache: jest.fn(),
}));

jest.mock('../src/config', () => ({ API_HOST: '' }));

import App from '../src/App';
import { RouterProvider } from '@shared/router';

beforeAll(() => {
  globalThis.fetch = jest.fn(() => Promise.resolve({}));
});

test('App remembers calendar visibility', async () => {
  localStorage.clear();
  localStorage.setItem('lang', 'zh');
  let unmount;
  await act(async () => {
    ({ unmount } = render(
      <RouterProvider>
        <App />
      </RouterProvider>
    ));
  });

  const dividendTab = await screen.findByRole('button', { name: 'ETF 配息查詢' });
  await act(async () => {
    fireEvent.click(dividendTab);
  });

  const hideBtn = await screen.findByRole('button', { name: '隱藏月曆' });
  await act(async () => {
    fireEvent.click(hideBtn);
  });

  await act(async () => {
    unmount();
  });

  await act(async () => {
    render(
      <RouterProvider>
        <App />
      </RouterProvider>
    );
  });

  const dividendTab2 = await screen.findByRole('button', { name: 'ETF 配息查詢' });
  await act(async () => {
    fireEvent.click(dividendTab2);
  });

  const showBtn = await screen.findByRole('button', { name: '顯示月曆' });
  expect(showBtn).toBeInTheDocument();
});
