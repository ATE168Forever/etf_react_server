/* eslint-env jest */
import { render, screen } from '@testing-library/react';
import HomeTab from './HomeTab';
import { fetchWithCache } from './api';

jest.mock('./api');
jest.mock('./config', () => ({
  API_HOST: 'http://localhost'
}));

const mockData = {
  milestones: [
    { label: '已收錄台灣 ETF', value: 301 },
    { label: '累積配息紀錄', value: 1432 },
    { label: '歷史資料涵蓋', value: 21 }
  ],
  latest: [
    '✅ 已更新 2025 年 9 月最新配息數據',
    '📊 新增 ETF：009805 新光美國電力基建'
  ],
  tip: '高股息 ETF 不代表報酬率高，還需要考慮殖利率與價格變化。'
};

beforeEach(() => {
  fetchWithCache.mockResolvedValue({ data: mockData });
});

afterEach(() => {
  jest.resetAllMocks();
});

test('renders data milestones section', async () => {
  render(<HomeTab />);
  await screen.findByText('本站數據概況');
  expect(await screen.findByText('301')).toBeInTheDocument();
});

test('renders latest updates section', async () => {
  render(<HomeTab />);
  await screen.findByText('最新收錄');
  expect(
    await screen.findByText('✅ 已更新 2025 年 9 月最新配息數據')
  ).toBeInTheDocument();
});

test('renders knowledge section', async () => {
  render(<HomeTab />);
  await screen.findByText('ETF 小知識');
  expect(
    await screen.findByText(
      '高股息 ETF 不代表報酬率高，還需要考慮殖利率與價格變化。'
    )
  ).toBeInTheDocument();
});
