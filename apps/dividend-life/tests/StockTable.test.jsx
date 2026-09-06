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

test('the annual-max stock shows a neutral high-yield badge with a disclaimer, not the old emoji badge', () => {
  // estAnnualYield[STOCK_ID].TWD equals maxAnnualYield.TWD, which is the
  // annual-max trigger condition (see StockTable.jsx's shouldShowCrown) that
  // used to render the crown emoji badge.
  //
  // The default fixture's maxYieldPerMonth (0.2 for every month) happens to
  // equal buildDividendTable's per-cell perYield (also 0.2), which would
  // independently satisfy the *monthly*-max ("diamond") condition too. Since
  // both conditions render the identical .high-yield-badge markup, this test
  // must neutralize that condition explicitly — otherwise it would still
  // pass even if the crown-specific code path were completely broken.
  // Overriding maxYieldPerMonth to a value that does NOT match 0.2 makes
  // shouldShowDiamond false, so any badge found here can only have come
  // from the annual-max ("crown") path.
  const { container } = renderWithLang({
    estAnnualYield: { [STOCK_ID]: { TWD: 8 } },
    maxAnnualYield: { TWD: 8 },
    maxYieldPerMonth: { TWD: Array(12).fill(0.9) },
  });

  // The removed emoji badges were the only elements in this component using
  // role="img"; the new text badge carries no such role.
  expect(screen.queryByRole('img')).not.toBeInTheDocument();
  // Scope to the <table>: the mobile card list (added in Task 5) renders the
  // same totals content — and thus the same crown badge markup — via the
  // shared buildTotalsContent(), so an unscoped query would double-count.
  const badges = container.querySelector('table').querySelectorAll('.high-yield-badge');
  expect(badges.length).toBe(1);
  expect(screen.getAllByText('殖利率偏高').length).toBeGreaterThan(0);

  // The disclaimer text must land in the badge's tooltip, not just the
  // badge label itself.
  const tooltipTrigger = badges[0].closest('.tooltip-text');
  expect(tooltipTrigger).toHaveAttribute(
    'title',
    expect.stringContaining(translations.zh.high_yield_disclaimer)
  );
});

test('renders both the table and a card list unconditionally; CSS decides which is visible', () => {
  const { container } = renderWithLang();
  expect(container.querySelector('.table-responsive.stock-table-scroll')).toBeInTheDocument();
  expect(container.querySelector('.stock-table-cards')).toBeInTheDocument();
});

test('each card shows the stock code, name, latest price, and estimated-yield/total content', () => {
  // Reuse the crown-badge fixture from the "annual-max stock" test above (one
  // stock, known price and estAnnualYield) so the assertions below have a
  // concrete value to check for.
  const { container } = renderWithLang({
    estAnnualYield: { [STOCK_ID]: { TWD: 8 } },
    maxAnnualYield: { TWD: 8 },
    maxYieldPerMonth: { TWD: Array(12).fill(0.9) },
  });

  const card = container.querySelector('.stock-card');
  expect(card).toBeInTheDocument();
  expect(card.querySelector('.stock-card__id')).toHaveTextContent(STOCK_ID);
  expect(card.querySelector('.stock-card__name')).toHaveTextContent('元大台灣50');
  expect(card.querySelector('.stock-card__price')).toHaveTextContent('35');
  expect(card.querySelector('.stock-card__body').textContent.length).toBeGreaterThan(0);
});

test('the monthly-max stock shows a neutral high-yield badge, not the old emoji badge', () => {
  // Every month cell's perYield (0.2, from buildDividendTable) equals
  // maxYieldPerMonth.TWD[idx], which is the monthly-max trigger condition
  // (see StockTable.jsx's shouldShowDiamond) that used to render the diamond
  // emoji badge.
  //
  // The default fixture's estAnnualYield.TWD (5) also happens to equal
  // maxAnnualYield.TWD (5), which would independently satisfy the *annual*-
  // max ("crown") condition too. This test must neutralize that condition
  // explicitly — otherwise it would still pass even if the diamond-specific
  // code path were completely broken. Overriding maxAnnualYield to a value
  // that does NOT match estAnnualYield.TWD makes shouldShowCrown false, so
  // any badge found here can only have come from the monthly-max ("diamond")
  // path.
  const { container } = renderWithLang({
    estAnnualYield: { [STOCK_ID]: { TWD: 5 } },
    maxAnnualYield: { TWD: 9 },
  });

  expect(screen.queryByRole('img')).not.toBeInTheDocument();
  const badges = container.querySelectorAll('.high-yield-badge');
  expect(badges.length).toBe(1);

  // The disclaimer text must land in the badge's tooltip, not just the
  // badge label itself.
  const tooltipTrigger = badges[0].closest('.tooltip-text');
  expect(tooltipTrigger).toHaveAttribute(
    'title',
    expect.stringContaining(translations.zh.high_yield_disclaimer)
  );
});
