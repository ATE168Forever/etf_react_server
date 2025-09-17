/* eslint-env jest */
import { render, screen } from '@testing-library/react';
import HomeTab from './HomeTab';
import { fetchWithCache } from './api';
import { LanguageContext, translations } from './i18n';

jest.mock('./api');
jest.mock('./config', () => ({
  API_HOST: 'http://localhost'
}));

const mockData = {
  milestones: [
    { label: '已收錄台灣 ETF', value: 301 },
    { label: '已收錄美股 ETF', value: 0 },
    { label: '累積配息紀錄', value: 1432 }
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

const renderWithLang = (lang = 'zh') => {
  const t = (key) => translations[lang][key];
  return render(
    <LanguageContext.Provider value={{ lang, setLang: () => {}, t }}>
      <HomeTab />
    </LanguageContext.Provider>
  );
};

test('renders data milestones section', async () => {
  renderWithLang();
  await screen.findByText(translations.zh.site_stats);
  expect(await screen.findByText('301')).toBeInTheDocument();
});

test('renders latest updates section', async () => {
  renderWithLang();
  await screen.findByText(translations.zh.latest);
  expect(
    await screen.findByText('✅ 已更新 2025 年 9 月最新配息數據')
  ).toBeInTheDocument();
});

test('renders knowledge section', async () => {
  renderWithLang();
  await screen.findByText(translations.zh.etf_tips);
  expect(
    await screen.findByText(
      '高股息 ETF 不代表報酬率高，還需要考慮殖利率與價格變化。'
    )
  ).toBeInTheDocument();
});

test('fetches stats with en flag false for zh', async () => {
  renderWithLang('zh');
  await screen.findByText(translations.zh.site_stats);
  expect(fetchWithCache).toHaveBeenCalledWith(
    'http://localhost/site_stats?en=false',
    expect.any(Number)
  );
});

test('fetches stats with en flag true for en', async () => {
  renderWithLang('en');
  await screen.findByText(translations.en.site_stats);
  expect(fetchWithCache).toHaveBeenCalledWith(
    'http://localhost/site_stats?en=true',
    expect.any(Number)
  );
});
