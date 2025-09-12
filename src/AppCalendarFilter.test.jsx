/* eslint-env jest */
import { render, screen, fireEvent } from '@testing-library/react';
// Mock asset imports used by App
jest.mock('./assets/conceptB-ETF-Life-dark.svg', () => 'data:image/svg+xml;base64,PHN2Zy8+');
jest.mock('./assets/conceptB-ETF-Life-light.svg', () => 'data:image/svg+xml;base64,PHN2Zy8+');

jest.mock('./api', () => ({
  fetchWithCache: jest.fn(() => Promise.resolve({ data: [], cacheStatus: 'fresh', timestamp: '' })),
  clearCache: jest.fn(),
}));

jest.mock('./config', () => ({ API_HOST: '' }));

import App from './App';

beforeAll(() => {
  globalThis.fetch = jest.fn(() => Promise.resolve({}));
});

test('calendar defaults to showing both ex and payment events', async () => {
  render(<App />);
  const dividendTab = screen.getByRole('button', { name: 'ETF 配息查詢' });
  fireEvent.click(dividendTab);
  const bothBtn = await screen.findByRole('button', { name: '除息/發放日' });
  expect(bothBtn).toHaveStyle({ fontWeight: 'bold' });
});
