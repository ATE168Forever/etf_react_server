# Explore ETFs 範圍拆分 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 讓 Explore ETFs 分頁的配息資料抓取預設為 `'all'`（全市場），並且完全獨立於 Home／Cash Flow／Holdings／頂部提醒橫幅目前共用的 `'purchased'`-優先抓取，同時不觸發任何額外的全市場 fetch，除非使用者真的造訪過 Explore ETFs 分頁。

**Architecture:** 在 `useDividendData` hook 加一個 `enabled`（預設 `true`）參數，讓呼叫端可以短路掉主要的配息資料 fetch。`DividendLifePage.jsx` 呼叫這個 hook兩次：第一次維持現狀（`'purchased'`-優先，餵 Home／Cash Flow／Holdings／提醒橫幅）；第二次是新的獨立實例（`exploreScope` 預設 `'all'`，`enabled` 綁定「是否已造訪過 Explore ETFs 分頁」的旗標），只餵 Explore ETFs 分頁既有的篩選／月曆／觀察組合邏輯——這些既有邏輯本身不搬動，只是把讀取來源從第一份 hook 的輸出改成第二份。

**Tech Stack:** React（function components + hooks）、Jest + `@testing-library/react`（`renderHook`／`render`／`act`／`waitFor`／`fireEvent`）、既有的 `useDividendData` hook 與 `DividendLifePage.jsx`。

**Spec:** `docs/superpowers/specs/2026-08-28-explore-etf-scope-split-design.md`。這份計畫直接照 spec 的欄位對照表與程式碼片段展開成逐行修改，執行前建議先讀過 spec 的「現況」與「方案」兩節。

## Global Constraints

- Home／Cash Flow／Holdings／頂部「明天配息提醒」橫幅目前的資料抓取行為（`'purchased'` 為主、使用者沒有持股才退回 `'all'`）完全不得改變。
- `loadStockList()`（`useEffectOnce`）與 visibility-change 監聽**不得**加 `enabled` 短路——`useEffectOnce` 的 callback 只在 mount 當下執行一次，若被 `enabled=false` 擋下就永遠不會再執行，會讓 explore hook 的 `freqMap`／`stockListPriceMap` 永久是空物件（詳見 spec）。
- `purchasedStockIds`、`custodianMap` 不建立 explore 版本，兩個 hook 實例算出來的 `purchasedStockIds` 必然相同，`custodianMap` 只有頂部橫幅在用。
- `stockListPriceMap`、`dividendCacheInfo` 需要兩份：主要 hook 的版本繼續餵 Holdings（`InventoryTab`），不得被覆蓋或搬走。
- 不把 Explore ETFs 分頁抽成獨立元件檔案；不重寫 `useDividendData.js` 既有的資料計算邏輯（`dividendTable`／`filteredData` 等既有 memo 完全不動，只加一個 `enabled` 短路）。
- 每個任務結束時，`pnpm --filter dividend-life test` 與 `pnpm --filter dividend-life lint` 都必須維持全綠。

---

### Task 1: `useDividendData` 加 `enabled` 參數

**Files:**
- Modify: `apps/dividend-life/src/hooks/useDividendData.js`
- Test: `apps/dividend-life/tests/useDividendData.test.js`（新建，目前沒有這個 hook 的獨立測試檔）

**Interfaces:**
- Produces: `useDividendData({ dividendScope, setDividendScope, transactionHistory, transactionHistoryLoaded, enabled = true })`。`enabled=false` 時，負責呼叫 `fetchDividendsByYears` 的 effect 直接短路，不發送請求，`data`／`years` 等維持初始值；`enabled` 從 `false` 變 `true` 後立刻觸發一次 fetch。`fetchStockList()` 與 visibility 監聽不受 `enabled` 影響，維持原樣。不傳 `enabled` 時行為與改動前完全一致。

- [ ] **Step 1: Write the failing test**

```js
// apps/dividend-life/tests/useDividendData.test.js
/* eslint-env jest */
import { renderHook, act, waitFor } from '@testing-library/react';
import useDividendData from '../src/hooks/useDividendData';

const mockFetchDividendsByYears = jest.fn();
const mockFetchStockList = jest.fn();

jest.mock('../src/dividendApi', () => ({
  fetchDividendsByYears: (...args) => mockFetchDividendsByYears(...args),
}));

jest.mock('../src/stockApi', () => ({
  fetchStockList: (...args) => mockFetchStockList(...args),
}));

const baseProps = {
  dividendScope: 'purchased',
  setDividendScope: () => {},
  transactionHistory: [],
  transactionHistoryLoaded: true,
};

beforeEach(() => {
  mockFetchDividendsByYears.mockReset();
  mockFetchDividendsByYears.mockResolvedValue({ data: [], meta: null });
  mockFetchStockList.mockReset();
  mockFetchStockList.mockResolvedValue({ list: [] });
});

test('enabled defaults to true and fetches dividend data', async () => {
  renderHook(() => useDividendData(baseProps));

  await waitFor(() => expect(mockFetchDividendsByYears).toHaveBeenCalledTimes(1));
});

test('enabled: false skips the dividend data fetch', async () => {
  renderHook(() => useDividendData({ ...baseProps, enabled: false }));

  await act(async () => {
    await Promise.resolve();
  });

  expect(mockFetchDividendsByYears).not.toHaveBeenCalled();
});

test('flipping enabled from false to true triggers the fetch exactly once', async () => {
  const { rerender } = renderHook(
    ({ enabled }) => useDividendData({ ...baseProps, enabled }),
    { initialProps: { enabled: false } }
  );

  await act(async () => {
    await Promise.resolve();
  });
  expect(mockFetchDividendsByYears).not.toHaveBeenCalled();

  rerender({ enabled: true });

  await waitFor(() => expect(mockFetchDividendsByYears).toHaveBeenCalledTimes(1));
});

test('fetchStockList still runs even when enabled is false', async () => {
  renderHook(() => useDividendData({ ...baseProps, enabled: false }));

  await waitFor(() => expect(mockFetchStockList).toHaveBeenCalledTimes(1));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd etf_react_server && pnpm --filter dividend-life test --runTestsByPath tests/useDividendData.test.js`
Expected: the `'enabled: false skips the dividend data fetch'` test FAILs (`mockFetchDividendsByYears` gets called even though `enabled: false` was passed, because the hook doesn't read `enabled` yet). The other three tests pass already (current behavior already fetches by default).

- [ ] **Step 3: Write minimal implementation**

In `apps/dividend-life/src/hooks/useDividendData.js`, change the function signature (currently line 20):

```js
export default function useDividendData({ dividendScope, setDividendScope, transactionHistory, transactionHistoryLoaded }) {
```

to:

```js
export default function useDividendData({
  dividendScope,
  setDividendScope,
  transactionHistory,
  transactionHistoryLoaded,
  enabled = true,
}) {
```

Then in the effect that fetches dividend data (currently starts at line 52 with `useEffect(() => {` and ends at line 160 with `}, [dividendScope, purchasedStockIds, transactionHistoryLoaded, refreshTrigger]);`), add the short-circuit as the very first line of the effect body and add `enabled` to the dependency array:

```js
  useEffect(() => {
    if (!enabled) {
      return;
    }
    if (!transactionHistoryLoaded) {
      return;
    }

    const hasPurchasedIds = purchasedStockIds.length > 0;
    // ...rest of the existing effect body is unchanged...
  }, [enabled, dividendScope, purchasedStockIds, transactionHistoryLoaded, refreshTrigger]);
```

Do **not** touch the `useEffectOnce(() => { loadStockList()... })` block or the `visibilitychange` listener `useEffect` — both stay exactly as they are (see Global Constraints for why).

- [ ] **Step 4: Run test to verify it passes**

Run: `cd etf_react_server && pnpm --filter dividend-life test --runTestsByPath tests/useDividendData.test.js`
Expected: PASS (4 tests)

- [ ] **Step 5: Run the full test suite and lint**

Run: `cd etf_react_server && pnpm --filter dividend-life test && pnpm --filter dividend-life lint`
Expected: all existing tests still PASS (the default `enabled = true` makes this a no-op change for every existing caller), lint clean.

- [ ] **Step 6: Commit**

```bash
cd etf_react_server
git add apps/dividend-life/src/hooks/useDividendData.js apps/dividend-life/tests/useDividendData.test.js
git commit -m "feat(dividend-life): add enabled param to useDividendData for lazy fetching"
```

---

### Task 2: 讓 Explore ETFs 分頁使用獨立、預設 `'all'`、惰性載入的資料來源

**Files:**
- Modify: `apps/dividend-life/src/DividendLifePage.jsx`
- Test: `apps/dividend-life/tests/AppExploreScopeSplit.test.jsx`（新建）

**Interfaces:**
- Consumes: Task 1 的 `useDividendData({ ..., enabled })`。
- Produces: 無下游任務依賴——這是本計畫最後一個功能性任務。

- [ ] **Step 1: Write the failing integration tests**

```jsx
// apps/dividend-life/tests/AppExploreScopeSplit.test.jsx
/* eslint-env jest */
import { render, screen, act, waitFor, fireEvent } from '@testing-library/react';

jest.mock('@shared/assets/dividend-life.svg', () => 'data:image/svg+xml;base64,PHN2Zy8+');
jest.mock('@shared/assets/dividend-life-light.svg', () => 'data:image/svg+xml;base64,PHN2Zy8+');

jest.mock('../src/api', () => ({
  fetchWithCache: jest.fn(() => Promise.resolve({ data: [] })),
  clearCache: jest.fn(),
}));

const mockFetchStockList = jest.fn();
jest.mock('../src/stockApi', () => ({
  fetchStockList: (...args) => mockFetchStockList(...args),
}));

const mockFetchDividendsByYears = jest.fn();
jest.mock('../src/dividendApi', () => ({
  fetchDividendsByYears: (...args) => mockFetchDividendsByYears(...args),
  clearDividendsCache: jest.fn(),
  clearEmptyDividendCaches: jest.fn(),
}));

jest.mock('../config', () => ({ API_HOST: '' }));

import App from '../src/App';
import { RouterProvider } from '@shared/router';

const scopesRequested = () => mockFetchDividendsByYears.mock.calls.map(call => call[2]?.stockIds);

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  localStorage.setItem('lang', 'zh');
  localStorage.setItem(
    'my_transaction_history',
    JSON.stringify([{ stock_id: '0050', date: '2024-01-01', type: 'buy', quantity: 1000, price: 100 }])
  );
  mockFetchStockList.mockReset();
  mockFetchStockList.mockResolvedValue({ list: [], meta: null });
  mockFetchDividendsByYears.mockReset();
  mockFetchDividendsByYears.mockResolvedValue({ data: [], meta: null });
  globalThis.fetch = jest.fn(() => Promise.resolve({}));
});

async function renderApp() {
  await act(async () => {
    render(
      <RouterProvider>
        <App />
      </RouterProvider>
    );
  });
}

test('does not fetch the full-market ("all") dataset before the Explore ETFs tab is visited', async () => {
  await renderApp();

  await waitFor(() => expect(mockFetchDividendsByYears).toHaveBeenCalledTimes(1));

  expect(scopesRequested()).not.toContainEqual('all');
  expect(scopesRequested()).toContainEqual(['0050']);
});

test('Explore ETFs tab defaults to the "all" scope independently of the purchased-scoped main data', async () => {
  await renderApp();
  await waitFor(() => expect(mockFetchDividendsByYears).toHaveBeenCalledTimes(1));

  const dividendTab = screen.getByRole('tab', { name: '探索 ETF' });
  await act(async () => {
    fireEvent.click(dividendTab);
  });

  await waitFor(() => expect(mockFetchDividendsByYears).toHaveBeenCalledTimes(2));
  expect(scopesRequested()).toContainEqual('all');
  expect(scopesRequested()).toContainEqual(['0050']);

  const allPill = await screen.findByRole('button', { name: '全部 ETF' });
  expect(allPill).toHaveClass('filter-bar__pill--active');
});

test('switching the Explore ETFs scope pill does not trigger another fetch for the main data', async () => {
  await renderApp();
  await waitFor(() => expect(mockFetchDividendsByYears).toHaveBeenCalledTimes(1));

  const dividendTab = screen.getByRole('tab', { name: '探索 ETF' });
  await act(async () => {
    fireEvent.click(dividendTab);
  });
  await waitFor(() => expect(mockFetchDividendsByYears).toHaveBeenCalledTimes(2));

  const purchasedPill = await screen.findByRole('button', { name: '已購買 ETF' });
  await act(async () => {
    fireEvent.click(purchasedPill);
  });

  await waitFor(() => expect(purchasedPill).toHaveClass('filter-bar__pill--active'));
  // exactly one new call (the explore hook re-fetching its own scope) — the
  // main hook must not have refetched too.
  expect(mockFetchDividendsByYears).toHaveBeenCalledTimes(3);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd etf_react_server && pnpm --filter dividend-life test --runTestsByPath tests/AppExploreScopeSplit.test.jsx`
Expected: all three tests FAIL — today there is only one `useDividendData` instance, so visiting the Explore ETFs tab never triggers a second, independent fetch (`toHaveBeenCalledTimes(2)`/`(3)` assertions fail; `scopesRequested()` never contains `'all'` while purchased holdings exist).

- [ ] **Step 3: Add the lazy-visit flag and the second `useDividendData` instance**

In `apps/dividend-life/src/DividendLifePage.jsx`, immediately after the existing hook call (currently lines 92-110, ending with `} = useDividendData({ dividendScope, setDividendScope, transactionHistory, transactionHistoryLoaded });`), insert:

```jsx
  const [exploreScope, setExploreScope] = useState('all');
  const [hasVisitedExploreTab, setHasVisitedExploreTab] = useState(tab === 'dividend');

  useEffect(() => {
    if (tab === 'dividend') setHasVisitedExploreTab(true);
  }, [tab]);

  const {
    loading: exploreLoading,
    error: exploreError,
    dividendCacheInfo: exploreDividendCacheInfo,
    years: exploreYears,
    selectedYear: exploreSelectedYear,
    setSelectedYear: setExploreSelectedYear,
    filteredData: exploreFilteredData,
    stocks: exploreStocks,
    stockCurrencyMap: exploreStockCurrencyMap,
    stockOptions: exploreStockOptions,
    dividendTable: exploreDividendTable,
    availableCurrencies: exploreAvailableCurrencies,
    freqMap: exploreFreqMap,
    stockListPriceMap: exploreStockListPriceMap,
  } = useDividendData({
    dividendScope: exploreScope,
    setDividendScope: setExploreScope,
    transactionHistory,
    transactionHistoryLoaded,
    enabled: hasVisitedExploreTab,
  });
```

The original hook call above this is untouched.

- [ ] **Step 4: Point `useCurrencyView` and the scope-change handler at the explore state**

Change (currently lines 282-289):

```js
  const {
    viewMode,
    hasTwd,
    hasUsd,
    activeCurrencies,
    viewDescriptionContent,
    handleViewModeChange,
  } = useCurrencyView({ availableCurrencies, lang });
```

to:

```js
  const {
    viewMode,
    hasTwd,
    hasUsd,
    activeCurrencies,
    viewDescriptionContent,
    handleViewModeChange,
  } = useCurrencyView({ availableCurrencies: exploreAvailableCurrencies, lang });
```

Change (currently lines 267-270) — this function has no other callers besides the two Explore ETFs scope-pill buttons, so its body is edited in place rather than adding a parallel function:

```js
  const handleDividendScopeChange = (scope) => {
    setDividendScope(scope);
    setShowAllStocks(false);
  };
```

to:

```js
  const handleDividendScopeChange = (scope) => {
    setExploreScope(scope);
    setShowAllStocks(false);
  };
```

- [ ] **Step 5: Rewire the derived memos that back the Explore ETFs table/calendar**

These memos are untouched in structure — only the hook-output variable names they read change. In `filteredStocks` (currently lines 296-380):

- `stocks.filter(...)` → `exploreStocks.filter(...)`
- line 300: `const isPurchasedStock = dividendScope === 'purchased' && purchasedStockIds.includes(stock.stock_id);` → `const isPurchasedStock = exploreScope === 'purchased' && purchasedStockIds.includes(stock.stock_id);` (`purchasedStockIds` stays as-is, per Global Constraints)
- line 301: `dividendTable[stock.stock_id]` → `exploreDividendTable[stock.stock_id]`
- lines 312, 317: `stockCurrencyMap[stock.stock_id]` → `exploreStockCurrencyMap[stock.stock_id]`
- lines 323, 332, 338, 350, 362: `dividendTable[...]` / `freqMap[...]` → `exploreDividendTable[...]` / `exploreFreqMap[...]`
- dependency array (line 380): `[stocks, selectedStockIds, dividendScope, purchasedStockIds, dividendTable, monthHasValue, viewMode, stockCurrencyMap, extraFilters, activeCurrencies, freqMap]` → `[exploreStocks, selectedStockIds, exploreScope, purchasedStockIds, exploreDividendTable, monthHasValue, viewMode, exploreStockCurrencyMap, extraFilters, activeCurrencies, exploreFreqMap]`

In `maxYieldPerMonth` (currently lines 382-402):
- line 383: `availableCurrencies` → `exploreAvailableCurrencies`
- lines 390: `dividendTable[...]` → `exploreDividendTable[...]`
- dependency array (line 402): `[filteredStocks, dividendTable, availableCurrencies]` → `[filteredStocks, exploreDividendTable, exploreAvailableCurrencies]`

In `displayStocks` (currently lines 404-422):
- line 407: `dividendTable[...]` → `exploreDividendTable[...]`
- (dependency array line 422 already lists `dividendTable` → change to `exploreDividendTable`; `activeCurrencies`/`maxYieldPerMonth`/`filteredStocks`/`extraFilters.*` stay unchanged)

In the totals block (`totalPerStock`/`yieldSum`/`yieldCount`/`latestPrice`/`latestYield`/`estAnnualYield`/`maxAnnualYield`, currently lines 424-509):
- line 433: `availableCurrencies` → `exploreAvailableCurrencies`
- line 446: `dividendTable[stock.stock_id]` → `exploreDividendTable[stock.stock_id]`
- line 481: `stockListPriceMap[stock.stock_id]` → `exploreStockListPriceMap[stock.stock_id]`
- line 499: `freqMap[id]` → `exploreFreqMap[id]`
- dependency array (line 509): `[displayStocks, dividendTable, availableCurrencies, stockListPriceMap, freqMap]` → `[displayStocks, exploreDividendTable, exploreAvailableCurrencies, exploreStockListPriceMap, exploreFreqMap]`

In `calendarEvents` (currently lines 512-555):
- line 512: `filteredData.filter(...)` → `exploreFilteredData.filter(...)`
- dependency array (line 555): `[filteredData, selectedStockIds, extraFilters.currencies, activeCurrencies]` → `[exploreFilteredData, selectedStockIds, extraFilters.currencies, activeCurrencies]`

`filteredCalendarEvents` (line 557-559) is unchanged — it only reads `calendarEvents` and `calendarFilter`, both already fixed above.

- [ ] **Step 6: Rewire the Explore ETFs tab JSX**

Inside the `{tab === 'dividend' && (...)}` block (currently lines 690-949):

Year `<select>` (currently lines 699-711):
- line 705: `value={selectedYear}` → `value={exploreSelectedYear}`
- line 706: `onChange={e => setSelectedYear(Number(e.target.value))}` → `onChange={e => setExploreSelectedYear(Number(e.target.value))}`
- line 708: `{years.map(...)}` → `{exploreYears.map(...)}`

Scope pills (currently lines 743-766) — the `onClick` handlers already call `handleDividendScopeChange`, which Step 4 pointed at `setExploreScope`, so only the active-state reads change:
- line 750: `` `filter-bar__pill${dividendScope === 'purchased' ? ...}` `` → `exploreScope === 'purchased'`
- line 753: `aria-pressed={dividendScope === 'purchased'}` → `aria-pressed={exploreScope === 'purchased'}`
- line 759: `` `filter-bar__pill${dividendScope === 'all' ? ...}` `` → `exploreScope === 'all'`
- line 761: `aria-pressed={dividendScope === 'all'}` → `aria-pressed={exploreScope === 'all'}`

Advanced filter dropdown (line 818): `availableCurrencies={availableCurrencies}` → `availableCurrencies={exploreAvailableCurrencies}`

Cache-freshness indicator (currently lines 831-839): every `dividendCacheInfo` reference → `exploreDividendCacheInfo`

Calendar-panel guard and calendar props (currently lines 853, 872-881):
- line 853: `{showCalendar && !loading && !error && (` → `{showCalendar && !exploreLoading && !exploreError && (`
- line 873: `year={selectedYear}` → `year={exploreSelectedYear}`
- line 877: `availableYears={years}` → `availableYears={exploreYears}`
- line 878: `onYearChange={setSelectedYear}` → `onYearChange={setExploreSelectedYear}`

Table loading/error/skeleton (currently lines 902, 914, 916):
- line 902: `{loading ? (` → `{exploreLoading ? (`
- line 914: `) : error ? (` → `) : exploreError ? (`
- line 916: `{error.message}` → `{exploreError.message}`

`StockTable` props (currently lines 919-945):
- `dividendTable={dividendTable}` → `dividendTable={exploreDividendTable}`
- `stockOptions={stockOptions}` → `stockOptions={exploreStockOptions}`
- `freqMap={freqMap}` → `freqMap={exploreFreqMap}`
- every other prop (`stocks={displayStocks}`, `totalPerStock`, `yieldSum`, `yieldCount`, `latestPrice`, `latestYield`, `estAnnualYield`, `maxAnnualYield`, `maxYieldPerMonth`, `selectedStockIds`, `setSelectedStockIds`, `monthHasValue`, `setMonthHasValue`, `showDividendYield`, `showPerYield`, `currentMonth`, `monthlyIncomeGoal`, `showAllStocks`, `setShowAllStocks`, `showInfoAxis`, `getIncomeGoalInfo`, `activeCurrencies`) is unchanged — they're all locally-derived values already fixed in Step 5, or state untouched by this refactor.

Everything **outside** the `tab === 'dividend'` block — `HomeTab` (line 687, still `dividendData={data} dividendLoading={loading}`), `InventoryTab` (lines 954-958, still `allDividendData={data} dividendCacheInfo={dividendCacheInfo} stockListPriceMap={stockListPriceMap}`), `UserDividendsTab` (lines 967-970, still `allDividendData={data} availableYears={years}`), and the top alert banner (`upcomingAlerts`/`custodianMap`, lines 658-683) — is **not touched**.

- [ ] **Step 7: Run the new tests to verify they pass**

Run: `cd etf_react_server && pnpm --filter dividend-life test --runTestsByPath tests/AppExploreScopeSplit.test.jsx`
Expected: PASS (3 tests)

- [ ] **Step 8: Run the full test suite and lint**

Run: `cd etf_react_server && pnpm --filter dividend-life test && pnpm --filter dividend-life lint`
Expected: all tests PASS, including `tests/AppYearSelection.test.jsx`, `tests/AppCalendarFilter.test.jsx`, `tests/AppCalendarVisibility.test.jsx`, `tests/UserDividendsTabCalendarVisibility.test.jsx` (these exercise Explore ETFs / Cash Flow behavior and are the most likely to regress); lint clean.

- [ ] **Step 9: Commit**

```bash
cd etf_react_server
git add apps/dividend-life/src/DividendLifePage.jsx apps/dividend-life/tests/AppExploreScopeSplit.test.jsx
git commit -m "feat(dividend-life): give Explore ETFs its own default-all, lazy-loaded dividend scope"
```

---

### Task 3: 收尾驗證

**Files:** 無新增／修改，只跑既有驗證指令與手動確認。

**Interfaces:** 無。

- [ ] **Step 1: Full regression**

Run: `cd etf_react_server && pnpm --filter dividend-life test && pnpm --filter dividend-life lint`
Expected: 全綠。

- [ ] **Step 2: 手動瀏覽器確認（比照 demo 模式那次的驗證方式）**

啟動 `pnpm dev:dividend-life`（`http://localhost:5174`），`localStorage` 放入至少一筆持股：

1. 首頁載入時，開瀏覽器 DevTools Network 分頁，確認只有一次 `/get_dividend` 請求（`stockIds` 對應持股清單，不是 `all`）。
2. 切到「探索 ETF」分頁，確認觸發了新的一次 `/get_dividend` 請求，且範圍是全市場（無 `stock_id` 篩選或涵蓋比持股清單更多的股票）；範圍切換按鈕預設停在「全部 ETF」。
3. 在「探索 ETF」分頁把範圍切成「已購買 ETF」，切回「總覽」分頁，確認首頁摘要卡片數字沒有變化（沒有被 Explore ETFs 的範圍切換影響）。
4. 關掉 dev server（比照先前 demo 模式那次的關閉方式，用 `ps`/`kill` 而非 `pkill -f` 誤殺其他 process）。

- [ ] **Step 3: 更新 memory**

把 `project_dividend_life_redesign_checklist.md` 裡「1. 探索ETF頁預設查詢範圍」的狀態從「decided NOT to change / deferred」更新成「DONE」，附上這次的 commit SHA 與簡短說明（做法是加 `useDividendData` 的 `enabled` 參數 + 第二份 hook 實例，不是抽元件）。
