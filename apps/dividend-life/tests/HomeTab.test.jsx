/* eslint-env jest */
import { render, screen } from '@testing-library/react';
import HomeTab from '../src/HomeTab';
import { fetchWithCache } from '../src/api';
import { LanguageContext, translations } from '../src/i18n';

jest.mock('../src/api');
jest.mock('../config', () => ({
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

const mockDividendData = [
  { stock_id: '0050', dividend_date: '2024-01-10', dividend: 1, last_close_price: 20 }
];

const currentYear = new Date().getFullYear();
const previousYear = currentYear - 1;

beforeEach(() => {
  localStorage.clear();
  fetchWithCache.mockImplementation((url) => {
    if (url.includes('/site_stats')) {
      return Promise.resolve({ data: mockData });
    }
    if (url.includes('/get_dividend')) {
      const queryString = url.split('?')[1] || '';
      const params = new URLSearchParams(queryString);
      const supportedCountries = ['tw', 'us'];
      const yearsParam = params.get('year');
      const countriesParam = params.get('country');
      const years = yearsParam
        ? yearsParam.split(',').map(value => Number(value.trim())).filter(Number.isFinite)
        : [currentYear, previousYear];
      const countries = countriesParam
        ? countriesParam.split(',').map(value => value.trim().toLowerCase()).filter(Boolean)
        : supportedCountries;
      const hasValidYear = years.some(year => [currentYear, previousYear].includes(year));
      const hasValidCountry = countries.some(country => supportedCountries.includes(country));
      if (hasValidYear && hasValidCountry) {
        return Promise.resolve({ data: mockDividendData });
      }
    }
    return Promise.resolve({ data: [] });
  });
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

test('renders investment goals card', async () => {
  renderWithLang();
  await screen.findByText(translations.zh.investment_goals);
  expect(
    screen.getByText(translations.zh.goal_empty_state)
  ).toBeInTheDocument();
});

test('shows custom goal title when saved', async () => {
  localStorage.setItem('investment_goals', JSON.stringify({ goalName: '現金流自由計畫' }));
  renderWithLang();
  expect(await screen.findByText('現金流自由計畫')).toBeInTheDocument();
});

test('fetches stats with en flag false for zh', async () => {
  renderWithLang('zh');
  await screen.findByText('301');
  expect(fetchWithCache).toHaveBeenCalledWith(
    'http://localhost/site_stats?en=false',
    expect.any(Number)
  );
});

test('fetches stats with en flag true for en', async () => {
  renderWithLang('en');
  await screen.findByText('301');
  expect(fetchWithCache).toHaveBeenCalledWith(
    'http://localhost/site_stats?en=true',
    expect.any(Number)
  );
});
