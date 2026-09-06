/* eslint-env jest */
import { render, screen, within, fireEvent } from '@testing-library/react';
import HomeTab from '../src/HomeTab';
import { fetchWithCache } from '../src/api';
import { fetchDividendsByYears } from '../src/dividendApi';
import { LanguageContext, translations } from '../src/i18n';
import { readTransactionHistory } from '../src/utils/transactionStorage';

jest.mock('../src/api');
jest.mock('../config', () => ({
  API_HOST: 'http://localhost'
}));
jest.mock('../src/utils/transactionStorage', () => ({
  readTransactionHistory: jest.fn(() => []),
}));
// HomeTab fetches dividend events via dividendApi's fetchDividendsByYears (which
// hits the network directly, not the mocked ../src/api fetchWithCache), so it
// must be mocked separately to control whether dividend data is available
// (hasDividendData / State C vs D).
jest.mock('../src/dividendApi', () => ({
  fetchDividendsByYears: jest.fn(),
  clearDividendsCache: jest.fn(),
  clearEmptyDividendCaches: jest.fn()
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

const currentYear = new Date().getFullYear();

// Fixture for tests that need State D (holdings + dividend data present):
// pass to `fetchDividendsByYears.mockResolvedValue({ data: mockDividendData })`.
// dividend_date must fall in the current year: calculateDividendSummary only
// counts events where eventYear === currentYear when building monthlyTotals
// (which drives chartCurrency / hasDividendData). January keeps it safely in
// the past relative to "now" so next-payment-empty assertions still hold.
const mockDividendData = [
  { stock_id: '0050', dividend_date: `${currentYear}-01-10`, dividend: 1, last_close_price: 20 }
];

beforeEach(() => {
  localStorage.clear();
  readTransactionHistory.mockReturnValue([]);
  fetchDividendsByYears.mockResolvedValue({ data: [] });
  fetchWithCache.mockImplementation((url) => {
    if (url.includes('/site_stats')) {
      return Promise.resolve({ data: mockData });
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
  // The goal-empty invite card only renders once the user has holdings
  // (State B/C/D) — State A shows EmptyPortfolioState instead, see the
  // HomeTab state matrix tests below.
  readTransactionHistory.mockReturnValue([
    { stock_id: '0050', date: '2023-01-01', type: 'buy', quantity: 1000 }
  ]);
  renderWithLang();
  await screen.findByText(translations.zh.investment_goals);
  expect(
    screen.getByText(translations.zh.goal_empty_state)
  ).toBeInTheDocument();
});

test('shows custom goal title when saved', async () => {
  readTransactionHistory.mockReturnValue([
    { stock_id: '0050', date: '2023-01-01', type: 'buy', quantity: 1000 }
  ]);
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

test('shows the empty portfolio state when there are no holdings', async () => {
  renderWithLang();
  expect(await screen.findByText(translations.zh.empty_portfolio_title)).toBeInTheDocument();
});

test('shows the coverage setup CTA when living cost is not set', async () => {
  readTransactionHistory.mockReturnValue([
    { stock_id: '0050', date: '2023-01-01', type: 'buy', quantity: 1000 }
  ]);
  fetchDividendsByYears.mockResolvedValue({ data: mockDividendData });
  renderWithLang();
  expect(await screen.findByText(translations.zh.coverage_living_cost_cta)).toBeInTheDocument();
});

test('shows the next payment empty message when no payment is announced', async () => {
  readTransactionHistory.mockReturnValue([
    { stock_id: '0050', date: '2023-01-01', type: 'buy', quantity: 1000 }
  ]);
  fetchDividendsByYears.mockResolvedValue({ data: mockDividendData });
  renderWithLang();
  expect(await screen.findByText(translations.zh.next_payment_empty)).toBeInTheDocument();
});

test('shows an "Add to calendar" button when a payment is announced', async () => {
  readTransactionHistory.mockReturnValue([
    { stock_id: '0050', date: '2023-01-01', type: 'buy', quantity: 1000 }
  ]);
  const futurePaymentDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 5);
    return d.toISOString().slice(0, 10);
  })();
  fetchDividendsByYears.mockResolvedValue({
    data: [
      {
        stock_id: '0050',
        stock_name: '元大台灣50',
        dividend_date: `${currentYear}-01-10`,
        payment_date: futurePaymentDate,
        dividend: 1,
        last_close_price: 20,
      },
    ],
  });
  renderWithLang();
  expect(
    await screen.findByRole('button', { name: new RegExp(translations.zh.next_payment_add_to_calendar) })
  ).toBeInTheDocument();
});

test('still renders the existing investment goals card below the new Phase 2 content', async () => {
  // Phase 2 "no holdings" content is EmptyPortfolioState, which already
  // covers the same message as the goal-empty invite card — so the invite
  // card is intentionally suppressed there (State A) and only shows once
  // the user has holdings (here: State C, Phase 2 content is the
  // asset-summary-card hint).
  readTransactionHistory.mockReturnValue([
    { stock_id: '0050', date: '2023-01-01', type: 'buy', quantity: 1000 }
  ]);
  renderWithLang();
  await screen.findByText(translations.zh.home_no_dividend_data_hint);
  expect(await screen.findByText(translations.zh.investment_goals)).toBeInTheDocument();
});

test('entering demo mode shows the demo banner and dashboard content instead of the empty state', async () => {
  renderWithLang();
  const demoButton = await screen.findByText(translations.zh.empty_portfolio_demo_cta);
  fireEvent.click(demoButton);
  expect(await screen.findByText(translations.zh.demo_mode_banner_text)).toBeInTheDocument();
  expect(screen.queryByText(translations.zh.empty_portfolio_title)).not.toBeInTheDocument();
});

test('exiting demo mode restores the real (empty) portfolio state', async () => {
  renderWithLang();
  fireEvent.click(await screen.findByText(translations.zh.empty_portfolio_demo_cta));
  fireEvent.click(await screen.findByText(translations.zh.demo_mode_banner_exit));
  expect(await screen.findByText(translations.zh.empty_portfolio_title)).toBeInTheDocument();
  expect(screen.queryByText(translations.zh.demo_mode_banner_text)).not.toBeInTheDocument();
});

test('does not persist demo holdings to localStorage', async () => {
  renderWithLang();
  fireEvent.click(await screen.findByText(translations.zh.empty_portfolio_demo_cta));
  await screen.findByText(translations.zh.demo_mode_banner_text);
  expect(localStorage.getItem('my_transaction_history')).toBeNull();
});

test('shows the InsightCard no-goal message (not "0%") for holdings with no configured goal', async () => {
  readTransactionHistory.mockReturnValue([
    { stock_id: '0050', date: '2023-01-01', type: 'buy', quantity: 1000 }
  ]);
  fetchDividendsByYears.mockResolvedValue({ data: mockDividendData });
  renderWithLang();
  const insightCard = (await screen.findByText(translations.zh.insight_card_no_goal)).closest('section');
  expect(within(insightCard).getByText(translations.zh.insight_card_no_goal)).toBeInTheDocument();
  expect(within(insightCard).queryByText('0%')).not.toBeInTheDocument();
});

describe('HomeTab state matrix', () => {
  afterEach(() => {
    readTransactionHistory.mockReset();
    readTransactionHistory.mockReturnValue([]);
  });

  test('State A (no holdings, no goal): EmptyPortfolioState shows, no KPI row, no goal card', async () => {
    readTransactionHistory.mockReturnValue([]);
    renderWithLang();
    expect(await screen.findByText(translations.zh.empty_portfolio_title)).toBeInTheDocument();
    expect(screen.queryByText(/本月配息/)).not.toBeInTheDocument();
    expect(screen.queryByText(/NT\$0/)).not.toBeInTheDocument();
    expect(screen.queryByText(translations.zh.goal_empty_state)).not.toBeInTheDocument();
  });

  test('State B (no holdings, has goal): EmptyPortfolioState shows, goal progress section still renders', async () => {
    readTransactionHistory.mockReturnValue([]);
    localStorage.setItem('investment_goals', JSON.stringify({ totalTarget: 100000 }));
    renderWithLang();
    expect(await screen.findByText(translations.zh.empty_portfolio_title)).toBeInTheDocument();
    const goalSection = document.querySelector('.goal-section');
    expect(goalSection).not.toBeNull();
    expect(
      within(goalSection).getAllByText((content) => content.includes(translations.zh.annual_goal)).length
    ).toBeGreaterThan(0);
    expect(within(goalSection).queryByText(translations.zh.goal_empty_state)).not.toBeInTheDocument();
  });

  test('State C (holdings, no dividend data): shows hint, no KPI row', async () => {
    readTransactionHistory.mockReturnValue([
      { stock_id: '0050', date: '2025-01-01', quantity: 1000, price: 100, type: 'buy', country: 'TW' },
    ]);
    renderWithLang();
    expect(await screen.findByText(translations.zh.home_no_dividend_data_hint)).toBeInTheDocument();
    expect(screen.queryByText(/本月配息/)).not.toBeInTheDocument();
  });

  test('State D (holdings, has dividend data): full dashboard shows, no EmptyPortfolioState/hint', async () => {
    readTransactionHistory.mockReturnValue([
      { stock_id: '0050', date: '2023-01-01', type: 'buy', quantity: 1000 }
    ]);
    fetchDividendsByYears.mockResolvedValue({ data: mockDividendData });
    renderWithLang();
    expect((await screen.findAllByText(/本月配息/)).length).toBeGreaterThan(0);
    expect(screen.queryByText(translations.zh.empty_portfolio_title)).not.toBeInTheDocument();
    expect(screen.queryByText(translations.zh.home_no_dividend_data_hint)).not.toBeInTheDocument();
  });
});
