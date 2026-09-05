/* eslint-env jest */
import { render, screen, fireEvent } from '@testing-library/react';
import DividendLifePage from '../src/DividendLifePage';
import { fetchWithCache } from '../src/api';

jest.mock('../src/api');
jest.mock('../config', () => ({
  API_HOST: 'http://localhost',
  HOST_URL: 'http://localhost',
}));
jest.mock('../src/stockApi', () => ({ fetchStockList: jest.fn(() => Promise.resolve({ list: [], meta: null })) }));
jest.mock('../src/dividendApi', () => ({
  fetchDividendsByYears: jest.fn(() => Promise.resolve({ data: [], meta: null })),
  clearEmptyDividendCaches: jest.fn(),
}));

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('lang', 'zh');
  fetchWithCache.mockResolvedValue({ data: [] });
  window.history.replaceState(null, '', '#');
});

test('tab list is wrapped for horizontal scrolling with an accompanying fade-hint element', async () => {
  render(<DividendLifePage />);
  const tabList = await screen.findByRole('tablist');
  expect(tabList.parentElement).toHaveClass('tab-scroll-wrapper');
  expect(tabList.parentElement.querySelector('.tab-scroll-fade')).toBeInTheDocument();
});

test('scroll-fade hint hides once the tab list is scrolled to its end, and reappears if scrolled back', async () => {
  render(<DividendLifePage />);
  const tabList = await screen.findByRole('tablist');
  const fade = tabList.parentElement.querySelector('.tab-scroll-fade');

  Object.defineProperty(tabList, 'scrollWidth', { value: 600, configurable: true });
  Object.defineProperty(tabList, 'clientWidth', { value: 300, configurable: true });
  Object.defineProperty(tabList, 'scrollLeft', { value: 0, configurable: true, writable: true });
  fireEvent.scroll(tabList);
  expect(fade.className).not.toMatch(/tab-scroll-fade-hidden/);

  tabList.scrollLeft = 300;
  fireEvent.scroll(tabList);
  expect(fade.className).toMatch(/tab-scroll-fade-hidden/);

  tabList.scrollLeft = 100;
  fireEvent.scroll(tabList);
  expect(fade.className).not.toMatch(/tab-scroll-fade-hidden/);
});
