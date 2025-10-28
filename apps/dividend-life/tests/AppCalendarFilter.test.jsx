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
  const dividendTab = screen.getByRole('button', { name: 'ETF 配息查詢' });
  await act(async () => {
    fireEvent.click(dividendTab);
  });
  const bothBtn = await screen.findByRole('button', { name: '除息/發放日' });
  expect(bothBtn).toHaveClass('btn-selected');
});
