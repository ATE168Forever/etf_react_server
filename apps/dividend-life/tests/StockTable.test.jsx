/* eslint-env jest */
import { render, screen, fireEvent } from '@testing-library/react';
import StockTable from '../src/components/StockTable';
import { LanguageContext, translations } from '../src/i18n';

jest.mock('../config', () => ({
  API_HOST: 'http://localhost',
  HOST_URL: 'http://localhost',
}));

// jsdom has no native matchMedia implementation. StockTable gates its mobile
// card list behind a `window.matchMedia('(max-width: 720px)')` subscription
// (see StockTable.jsx's `isCardViewport` state), so tests that assert on
// card markup need a mock that reports a match for that specific query.
// TooltipText (rendered inside both the table and the cards) independently
// checks its own `(max-width: 768px)` query to pick desktop vs. mobile
// tooltip behavior — this mock must leave that query reporting "no match"
// (its jsdom-less default, which the existing tooltip assertions below
// depend on) or every tooltip's title attribute silently disappears.
// Default to "mobile" for the card-list query here so existing card-content
// assertions keep exercising that markup; the dedicated viewport-gate test
// overrides this to prove the desktop branch.
function installMatchMediaMock(cardViewportMatches) {
  window.matchMedia = jest.fn().mockImplementation((query) => ({
    media: query,
    matches: query === '(max-width: 720px)' ? cardViewportMatches : false,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  }));
}

beforeEach(() => {
  installMatchMediaMock(true);
});

afterEach(() => {
  delete window.matchMedia;
});

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

test('renders the card list when matchMedia reports a mobile viewport', () => {
  const { container } = renderWithLang();
  expect(container.querySelector('.table-responsive.stock-table-scroll')).toBeInTheDocument();
  expect(container.querySelector('.stock-table-cards')).toBeInTheDocument();
});

test('does not mount the card list when matchMedia reports a desktop viewport', () => {
  installMatchMediaMock(false);
  const { container } = renderWithLang();
  expect(container.querySelector('.table-responsive.stock-table-scroll')).toBeInTheDocument();
  expect(container.querySelector('.stock-table-cards')).not.toBeInTheDocument();
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

test('each card shows the payout frequency next to the stock code', () => {
  // Default fixture's freqMap sets STOCK_ID to 4 (quarterly).
  const { container } = renderWithLang();

  const card = container.querySelector('.stock-card');
  expect(card.querySelector('.stock-card__freq')).toHaveTextContent('季配');
});

test('a stock missing from freqMap shows the irregular label instead of a blank frequency', () => {
  const { container } = renderWithLang({ freqMap: {} });

  const card = container.querySelector('.stock-card');
  expect(card.querySelector('.stock-card__freq')).toHaveTextContent('不定期');
});

test('each visible month value shows its annualized yield', () => {
  // buildDividendTable's fixture sets perYield to 0.2 for every month, so the
  // annualized figure (perYield * 12) is 2.4%.
  const { container } = renderWithLang();

  const card = container.querySelector('.stock-card');
  const monthYield = card.querySelector('.stock-card__month-yield');
  expect(monthYield).toHaveTextContent('2.4%');
});

test('the annualized-yield hint is not duplicated when the per-yield display mode is already active', () => {
  const { container } = renderWithLang({ showPerYield: true });

  const card = container.querySelector('.stock-card');
  expect(card.querySelector('.stock-card__month-yield')).not.toBeInTheDocument();
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

describe('mobile card sort control', () => {
  const STOCK_ID_2 = '00878';
  const twoStockProps = {
    stocks: [
      { stock_id: STOCK_ID, stock_name: '元大台灣50' },
      { stock_id: STOCK_ID_2, stock_name: '國泰永續高股息' },
    ],
    dividendTable: { ...buildDividendTable(), [STOCK_ID_2]: buildDividendTable()[STOCK_ID] },
    totalPerStock: { [STOCK_ID]: { TWD: 10 }, [STOCK_ID_2]: { TWD: 10 } },
    yieldSum: { [STOCK_ID]: { TWD: 5 }, [STOCK_ID_2]: { TWD: 5 } },
    yieldCount: { [STOCK_ID]: { TWD: 4 }, [STOCK_ID_2]: { TWD: 4 } },
    // Distinct prices so sorting by price actually reorders the two cards.
    latestPrice: { [STOCK_ID]: { price: 35 }, [STOCK_ID_2]: { price: 20 } },
    latestYield: { [STOCK_ID]: { yield: 5 }, [STOCK_ID_2]: { yield: 5 } },
    estAnnualYield: { [STOCK_ID]: { TWD: 5 }, [STOCK_ID_2]: { TWD: 5 } },
    freqMap: { [STOCK_ID]: 4, [STOCK_ID_2]: 4 },
  };

  const cardStockIds = (container) =>
    Array.from(container.querySelectorAll('.stock-card__id')).map((el) => el.textContent);

  test('the sort select and direction toggle render in the mobile card view', () => {
    installMatchMediaMock(true);
    const { container } = renderWithLang(twoStockProps);
    expect(screen.getByLabelText('排序：')).toBeInTheDocument();
    expect(container.querySelector('.stock-card-sort-direction')).toBeInTheDocument();
  });

  test('the sort options use unambiguous labels, including the month for month-specific metrics', () => {
    // buildDefaultProps sets currentMonth: 3, i.e. '4月'.
    const { container } = renderWithLang(twoStockProps);
    const options = Array.from(container.querySelector('#stock-card-sort-select').options)
      .map(o => o.textContent);

    expect(options).toContain('4月配息金額');
    expect(options).toContain('全年預估殖利率');
    expect(options).toContain('年化殖利率（4月）');
    // The old bare-month-name label was the ambiguous one being fixed.
    expect(options).not.toContain('4月');
  });

  test('the sort select does not render in the desktop table view', () => {
    // isCardViewport is set once from matchMedia at mount time (see the
    // dedicated viewport-gate tests above for the table/card-list
    // equivalent) — a fresh render with matches:false is the correct way
    // to exercise the desktop branch, not a rerender of an already-mounted
    // mobile instance (isCardViewport wouldn't retroactively flip without
    // a real 'change' event, which this mock doesn't simulate).
    installMatchMediaMock(false);
    renderWithLang(twoStockProps);
    expect(screen.queryByLabelText('排序：')).not.toBeInTheDocument();
  });

  test('changing the sort select reorders the cards, defaulting to ascending', () => {
    const { container } = renderWithLang(twoStockProps);

    // Default sort is by stock_id ascending: '0050' < '00878' lexicographically.
    expect(cardStockIds(container)).toEqual([STOCK_ID, STOCK_ID_2]);

    fireEvent.change(screen.getByLabelText('排序：'), { target: { value: 'latest_price' } });

    // Ascending by price: 00878 (20) before 0050 (35) — a genuine reorder.
    expect(cardStockIds(container)).toEqual([STOCK_ID_2, STOCK_ID]);
  });

  test('the direction toggle reverses the current sort', () => {
    const { container } = renderWithLang(twoStockProps);

    fireEvent.change(screen.getByLabelText('排序：'), { target: { value: 'latest_price' } });
    expect(cardStockIds(container)).toEqual([STOCK_ID_2, STOCK_ID]);

    fireEvent.click(container.querySelector('.stock-card-sort-direction'));

    // Descending by price: 0050 (35) before 00878 (20).
    expect(cardStockIds(container)).toEqual([STOCK_ID, STOCK_ID_2]);
  });

  test('sorting by annualized yield uses this month\'s per-payment yield, not the aggregate estimate', () => {
    // Both stocks share the same estAnnualYield (5), so a genuine reorder
    // here can only come from the new per-cell metric (perYield * 12) at
    // the current month (idx 3), not the pre-existing aggregate. The
    // fixture's own stocks array is already [STOCK_ID, STOCK_ID_2] (its
    // natural/no-op order), so STOCK_ID gets the *higher* perYield here --
    // a comparator that silently falls through to a no-op (leaving the
    // original array order untouched) would fail this assertion, unlike a
    // same-order expectation that a no-op could pass by accident.
    const customDividendTable = {
      [STOCK_ID]: buildDividendTable()[STOCK_ID].map((cell, idx) =>
        idx === 3 ? { TWD: { ...cell.TWD, perYield: 0.5 } } : cell
      ),
      [STOCK_ID_2]: buildDividendTable()[STOCK_ID].map((cell, idx) =>
        idx === 3 ? { TWD: { ...cell.TWD, perYield: 0.1 } } : cell
      ),
    };
    const { container } = renderWithLang({ ...twoStockProps, dividendTable: customDividendTable });

    fireEvent.change(screen.getByLabelText('排序：'), { target: { value: 'annualized_yield' } });

    // Ascending: STOCK_ID_2 (perYield 0.1 -> 1.2%) before STOCK_ID (perYield 0.5 -> 6%).
    expect(cardStockIds(container)).toEqual([STOCK_ID_2, STOCK_ID]);
  });
});
