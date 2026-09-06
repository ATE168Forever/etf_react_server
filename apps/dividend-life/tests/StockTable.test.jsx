/* eslint-env jest */
import { render, screen, fireEvent } from '@testing-library/react';
import StockTable from '../src/components/StockTable';
import { LanguageContext, translations } from '../src/i18n';

jest.mock('../config', () => ({
  API_HOST: 'http://localhost',
  HOST_URL: 'http://localhost',
}));

// Minimal single-stock fixture with dividend data present in every month
// (0-11) so month columns are distinguishable regardless of which subset
// is currently visible. Values themselves are arbitrary — these tests only
// assert on the number/labels of rendered month <th> headers.
const STOCK_ID = '0050';
const buildDividendTable = () => ({
  [STOCK_ID]: Array.from({ length: 12 }, () => ({
    TWD: {
      dividend: 1.5,
      hasValidDividend: true,
      dividend_yield: 2.5,
      hasValidYield: true,
      perYield: 0.2,
      dividend_date: '2026-01-10',
      payment_date: '2026-01-20',
      entries: [],
    },
  })),
});

const buildDefaultProps = (overrides = {}) => ({
  stocks: [{ stock_id: STOCK_ID, stock_name: '元大台灣50' }],
  dividendTable: buildDividendTable(),
  totalPerStock: { [STOCK_ID]: { TWD: 10 } },
  yieldSum: { [STOCK_ID]: { TWD: 5 } },
  yieldCount: { [STOCK_ID]: { TWD: 4 } },
  latestPrice: { [STOCK_ID]: { price: 35 } },
  latestYield: { [STOCK_ID]: { yield: 5 } },
  estAnnualYield: { [STOCK_ID]: { TWD: 5 } },
  maxAnnualYield: { TWD: 5 },
  maxYieldPerMonth: { TWD: Array(12).fill(0.2) },
  stockOptions: [{ value: STOCK_ID, label: `${STOCK_ID} 元大台灣50` }],
  selectedStockIds: [],
  setSelectedStockIds: jest.fn(),
  monthHasValue: Array(12).fill(false),
  setMonthHasValue: jest.fn(),
  showDividendYield: false,
  showPerYield: false,
  currentMonth: 3,
  monthlyIncomeGoal: 10000,
  showAllStocks: false,
  setShowAllStocks: jest.fn(),
  showInfoAxis: false,
  getIncomeGoalInfo: jest.fn(() => ''),
  freqMap: { [STOCK_ID]: 4 },
  activeCurrencies: ['TWD'],
  ...overrides,
});

const renderWithLang = (props, lang = 'zh') => {
  const t = (key) => translations[lang][key];
  return render(
    <LanguageContext.Provider value={{ lang, setLang: () => {}, t }}>
      <StockTable {...buildDefaultProps(props)} />
    </LanguageContext.Provider>
  );
};

test('defaults to showing only the current month column, expands to 3 then to 12 via two separate controls', () => {
  const { container } = renderWithLang();

  // Only 1 month column (the current month) should be visible by default.
  expect(container.querySelectorAll('.month-th-inner').length).toBe(1);

  fireEvent.click(screen.getByRole('button', { name: /顯示近3月比較/ }));
  expect(container.querySelectorAll('.month-th-inner').length).toBe(3);

  fireEvent.click(screen.getByRole('button', { name: /展開全部月份/ }));
  expect(container.querySelectorAll('.month-th-inner').length).toBe(12);
});
