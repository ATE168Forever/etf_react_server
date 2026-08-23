# Dividend Life Phase 2（總覽 P0）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the total P0 content for `apps/dividend-life`'s HomeTab — monthly living-cost coverage, this-month dividend breakdown, next announced payment, future cashflow, and annual-goal insight — while keeping all existing HomeTab content working, just repositioned below the new content.

**Architecture:** Four new pure calculation utils in `apps/dividend-life/src/utils/` (no React, easy to unit test) feed eight new presentational components in `apps/dividend-life/src/components/`. `HomeTab.jsx` computes the new util outputs alongside its existing state and renders the new components above its four existing tiers, which are otherwise untouched.

**Tech Stack:** React (function components + hooks), CSS Modules, Jest + `@testing-library/react` (jsdom), the project's existing `i18n.js` (`LanguageContext`/`useLanguage()`, `zh`/`en` translation objects).

**Spec:** `docs/superpowers/specs/2026-08-23-dividend-life-phase2-home-p0-design.md` (design doc, references `../../../docs/CLAUDE_CODE_DIVIDEND_LIFE_INTEGRATED_REDESIGN_SPEC.md` §6.1/§10/§11/§15 as the source spec). This plan argues from both documents; read the design doc before executing any task below.

## Global Constraints

- 覆蓋率分子在 Phase 2 **只計台股（TWD）金額**；併入美股需要匯率換算，延後到 P1（設計文件規劃階段發現：codebase 沒有任何真正的匯率換算功能可重用）。
- 只要畫面上顯示任何美股（USD）金額，必須顯示稅前免責文案：「美股股息為稅前估算，實際入帳金額會扣除預扣稅。」（主規格書 §6.1.B 原文）。
- 未來現金流只計入 `dividendData` 裡已公告（有 `payment_date`）的事件，不做去年同月金額推估。沒有已公告資料的月份必須標示為「尚無公告資料」，不得當作低收入警示著色，也不得顯示成 `0` 而不加說明。
- 缺值一律顯示 `—`，不得顯示誤導性 `0%`（主規格書 §10.6）。
- 台幣金額格式 `NT$18,620`（無小數）；使用 `toLocaleString`，不手刻千分位。
- 生活費未設定（`0` 或未儲存）時不計算覆蓋率百分比，改顯示設定 CTA。
- 既有 `HomeTab.jsx` 四個 tier（收益 hero 卡片、投資目標卡、歷史配息長條圖、底部統計／消息／功能更新）與既有的 `utils/dividendUtils.js`、`utils/dividendGoalUtils.js`、`DividendLifePage.jsx` 頂部提醒 banner 的行為**不得改變**，只允許在 `HomeTab.jsx` 裡把它們的 JSX 位置往下移。
- 所有新文案（中／英）都必須加進 `apps/dividend-life/src/i18n.js` 的 `translations.zh` / `translations.en`，不得在元件裡寫死字串。
- 低收入月提醒（§10.3／§3.1 標為 P1）與美股併入覆蓋率換算（P1）在本次 Phase 2 **不實作邏輯**，只在對應元件留可選 prop，預設不啟用，避免擋住 P0（主規格書 §3.1「任何 P1/P2 項目都不可阻擋 P0」）。

---

### Task 1: `homeCurrencyFormat.js` — 共用格式化 util

多個新元件都需要「TWD 無小數千分位」與「缺值顯示 `—`」的格式化規則（主規格書 §10.6），先抽成共用小 util 避免重複程式碼。

**Files:**
- Create: `apps/dividend-life/src/utils/homeCurrencyFormat.js`
- Test: `apps/dividend-life/tests/homeCurrencyFormat.test.js`

**Interfaces:**
- Produces: `formatTwd(value, lang = 'zh')` → string，例如 `formatTwd(18620, 'zh')` → `'NT$18,620'`；`formatTwd(18620.4, 'en')` → `'NT$18,620'`（四捨五入、無小數）。非有限數字回傳 `'—'`。
- Produces: `formatMissingValue()` → `'—'`（給呼叫端在缺值情境直接使用，維持格式一致）。

- [ ] **Step 1: Write the failing test**

```js
// apps/dividend-life/tests/homeCurrencyFormat.test.js
import { formatTwd, formatMissingValue } from '../src/utils/homeCurrencyFormat';

describe('formatTwd', () => {
  test('formats a positive integer with NT$ prefix and thousands separator, no decimals', () => {
    expect(formatTwd(18620)).toBe('NT$18,620');
  });

  test('rounds fractional values instead of showing decimals', () => {
    expect(formatTwd(18620.6)).toBe('NT$18,621');
  });

  test('formats zero', () => {
    expect(formatTwd(0)).toBe('NT$0');
  });

  test('returns the missing-value placeholder for non-finite input', () => {
    expect(formatTwd(NaN)).toBe('—');
    expect(formatTwd(undefined)).toBe('—');
    expect(formatTwd(null)).toBe('—');
  });
});

describe('formatMissingValue', () => {
  test('returns an em dash', () => {
    expect(formatMissingValue()).toBe('—');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd etf_react_server && pnpm --filter dividend-life test --runTestsByPath tests/homeCurrencyFormat.test.js`
Expected: FAIL with "Cannot find module '../src/utils/homeCurrencyFormat'"

- [ ] **Step 3: Write minimal implementation**

```js
// apps/dividend-life/src/utils/homeCurrencyFormat.js
export function formatMissingValue() {
  return '—';
}

export function formatTwd(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return formatMissingValue();
  }
  return `NT$${Math.round(numericValue).toLocaleString('en-US')}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd etf_react_server && pnpm --filter dividend-life test --runTestsByPath tests/homeCurrencyFormat.test.js`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
cd etf_react_server
git add apps/dividend-life/src/utils/homeCurrencyFormat.js apps/dividend-life/tests/homeCurrencyFormat.test.js
git commit -m "feat(dividend-life): add shared TWD currency formatter for Phase 2 P0"
```

---

### Task 2: `livingCostStorage.js` — 每月生活費儲存

**Files:**
- Create: `apps/dividend-life/src/utils/livingCostStorage.js`
- Test: `apps/dividend-life/tests/livingCostStorage.test.js`

**Interfaces:**
- Produces: `loadLivingCost()` → number（≥ 0；未設定或解析失敗回傳 `0`）。
- Produces: `saveLivingCost(value)` → void；寫入前正規化（非有限或負數存為 `0`）。

- [ ] **Step 1: Write the failing test**

```js
// apps/dividend-life/tests/livingCostStorage.test.js
/* eslint-env jest */
import { loadLivingCost, saveLivingCost } from '../src/utils/livingCostStorage';

describe('livingCostStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('returns 0 when nothing is stored', () => {
    expect(loadLivingCost()).toBe(0);
  });

  test('round-trips a saved value', () => {
    saveLivingCost(25000);
    expect(loadLivingCost()).toBe(25000);
  });

  test('normalizes negative values to 0 on save', () => {
    saveLivingCost(-100);
    expect(loadLivingCost()).toBe(0);
  });

  test('normalizes non-finite values to 0 on save', () => {
    saveLivingCost(NaN);
    expect(loadLivingCost()).toBe(0);
  });

  test('treats corrupted stored data as 0', () => {
    localStorage.setItem('dividend_life_monthly_living_cost', 'not-a-number');
    expect(loadLivingCost()).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd etf_react_server && pnpm --filter dividend-life test --runTestsByPath tests/livingCostStorage.test.js`
Expected: FAIL with "Cannot find module '../src/utils/livingCostStorage'"

- [ ] **Step 3: Write minimal implementation**

```js
// apps/dividend-life/src/utils/livingCostStorage.js
const STORAGE_KEY = 'dividend_life_monthly_living_cost';

export function loadLivingCost() {
  if (typeof localStorage === 'undefined') return 0;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return 0;
    const value = Number(raw);
    return Number.isFinite(value) && value >= 0 ? value : 0;
  } catch {
    return 0;
  }
}

export function saveLivingCost(value) {
  if (typeof localStorage === 'undefined') return;
  const numericValue = Number(value);
  const safeValue = Number.isFinite(numericValue) && numericValue >= 0 ? numericValue : 0;
  try {
    localStorage.setItem(STORAGE_KEY, String(safeValue));
  } catch (e) {
    console.error('[storage] write failed:', e);
    throw e;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd etf_react_server && pnpm --filter dividend-life test --runTestsByPath tests/livingCostStorage.test.js`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
cd etf_react_server
git add apps/dividend-life/src/utils/livingCostStorage.js apps/dividend-life/tests/livingCostStorage.test.js
git commit -m "feat(dividend-life): add localStorage-backed monthly living cost setting"
```

---

### Task 3: `coverageUtils.js` — 本月配息拆解與覆蓋率計算

計算本月「預計／已入帳／未入帳」金額（僅台股，供 `MonthlyIncomeCard` 與 `CoverageProgress` 共用一次計算），以及覆蓋率百分比。掃描邏輯依現有持股（`inventoryList` 的 `total_quantity`，與 `HomeTab.jsx` 既有的 `goalSummary.inventoryList` 同一來源），不重建 `dividendGoalUtils.js` 內部未匯出的 holdings timeline。

**Files:**
- Create: `apps/dividend-life/src/utils/coverageUtils.js`
- Test: `apps/dividend-life/tests/coverageUtils.test.js`

**Interfaces:**
- Consumes: `dividendData` 事件陣列（欄位 `stock_id`、`dividend`、`dividend_date`、`payment_date`、`currency`，與 `dividendApi.fetchDividendsByYears` 回傳格式一致）；`inventoryList` 陣列（欄位 `stock_id`、`total_quantity`，與 `utils/inventoryUtils.js` 的 `summarizeInventory().inventoryList` 一致）。
- Produces: `calculateCoverage({ dividendData, inventoryList, monthlyLivingCost, asOfDate }) => { twScheduled, twReceived, twPending, usScheduled, hasUsAmount, isLivingCostSet, coveragePercent }`。
  - `twScheduled` = 當月台股事件金額總和（`dividend 每股金額 × 持股量`）。
  - `twReceived` = `twScheduled` 中 `payment_date` 已 ≤ `asOfDate` 的部分；`twPending` = 其餘部分。
  - `usScheduled` = 當月美股事件金額總和（不併入覆蓋率分子，只供顯示與觸發免責文案）。
  - `hasUsAmount` = `usScheduled > 0`。
  - `coveragePercent`：`isLivingCostSet` 為 `false` 時為 `null`；否則為 `Math.round(twScheduled / monthlyLivingCost * 100)`（可超過 100，不封頂）。

- [ ] **Step 1: Write the failing test**

```js
// apps/dividend-life/tests/coverageUtils.test.js
import { calculateCoverage } from '../src/utils/coverageUtils';

const asOfDate = new Date('2026-08-15T00:00:00');

describe('calculateCoverage', () => {
  test('splits this-month TWD dividends into received vs pending by payment_date', () => {
    const dividendData = [
      { stock_id: '0056', dividend: 1, dividend_date: '2026-08-05', payment_date: '2026-08-10', currency: 'TWD' },
      { stock_id: '0050', dividend: 2, dividend_date: '2026-08-06', payment_date: '2026-08-25', currency: 'TWD' }
    ];
    const inventoryList = [
      { stock_id: '0056', total_quantity: 1000 },
      { stock_id: '0050', total_quantity: 500 }
    ];
    const result = calculateCoverage({ dividendData, inventoryList, monthlyLivingCost: 0, asOfDate });
    expect(result.twScheduled).toBe(1000 + 1000);
    expect(result.twReceived).toBe(1000);
    expect(result.twPending).toBe(1000);
  });

  test('tracks USD amounts separately and flags hasUsAmount without adding to coverage', () => {
    const dividendData = [
      { stock_id: 'VOO', dividend: 1.5, dividend_date: '2026-08-05', payment_date: '2026-08-10', currency: 'USD' }
    ];
    const inventoryList = [{ stock_id: 'VOO', total_quantity: 10 }];
    const result = calculateCoverage({ dividendData, inventoryList, monthlyLivingCost: 0, asOfDate });
    expect(result.usScheduled).toBeCloseTo(15);
    expect(result.hasUsAmount).toBe(true);
    expect(result.twScheduled).toBe(0);
  });

  test('ignores events for stocks not currently held', () => {
    const dividendData = [
      { stock_id: '0056', dividend: 1, dividend_date: '2026-08-05', payment_date: '2026-08-10', currency: 'TWD' }
    ];
    const result = calculateCoverage({ dividendData, inventoryList: [], monthlyLivingCost: 0, asOfDate });
    expect(result.twScheduled).toBe(0);
  });

  test('ignores events outside the current month', () => {
    const dividendData = [
      { stock_id: '0056', dividend: 1, dividend_date: '2026-07-05', payment_date: '2026-07-10', currency: 'TWD' }
    ];
    const inventoryList = [{ stock_id: '0056', total_quantity: 1000 }];
    const result = calculateCoverage({ dividendData, inventoryList, monthlyLivingCost: 0, asOfDate });
    expect(result.twScheduled).toBe(0);
  });

  test('returns null coveragePercent and isLivingCostSet=false when living cost is 0', () => {
    const result = calculateCoverage({ dividendData: [], inventoryList: [], monthlyLivingCost: 0, asOfDate });
    expect(result.isLivingCostSet).toBe(false);
    expect(result.coveragePercent).toBeNull();
  });

  test('computes rounded coveragePercent when living cost is set, allowing over 100', () => {
    const dividendData = [
      { stock_id: '0056', dividend: 2, dividend_date: '2026-08-05', payment_date: '2026-08-10', currency: 'TWD' }
    ];
    const inventoryList = [{ stock_id: '0056', total_quantity: 1000 }];
    const result = calculateCoverage({ dividendData, inventoryList, monthlyLivingCost: 1000, asOfDate });
    expect(result.isLivingCostSet).toBe(true);
    expect(result.coveragePercent).toBe(200);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd etf_react_server && pnpm --filter dividend-life test --runTestsByPath tests/coverageUtils.test.js`
Expected: FAIL with "Cannot find module '../src/utils/coverageUtils'"

- [ ] **Step 3: Write minimal implementation**

```js
// apps/dividend-life/src/utils/coverageUtils.js
function buildHoldingsMap(inventoryList = []) {
  const holdings = new Map();
  (Array.isArray(inventoryList) ? inventoryList : []).forEach(item => {
    const stockId = item?.stock_id;
    const quantity = Number(item?.total_quantity);
    if (stockId && Number.isFinite(quantity) && quantity > 0) {
      holdings.set(stockId, quantity);
    }
  });
  return holdings;
}

function resolveCurrency(event) {
  return typeof event?.currency === 'string' && event.currency.trim()
    ? event.currency.trim().toUpperCase()
    : 'TWD';
}

export function calculateCoverage({
  dividendData = [],
  inventoryList = [],
  monthlyLivingCost = 0,
  asOfDate = new Date()
} = {}) {
  const holdings = buildHoldingsMap(inventoryList);
  const today = new Date(asOfDate);
  today.setHours(0, 0, 0, 0);
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();

  let twScheduled = 0;
  let twReceived = 0;
  let twPending = 0;
  let usScheduled = 0;

  (Array.isArray(dividendData) ? dividendData : []).forEach(event => {
    const stockId = event?.stock_id;
    const quantity = holdings.get(stockId);
    if (!quantity) return;

    const eventDateRaw = event?.dividend_date || event?.payment_date;
    const eventDate = eventDateRaw ? new Date(eventDateRaw) : null;
    if (!eventDate || Number.isNaN(eventDate.getTime())) return;
    if (eventDate.getFullYear() !== currentYear || eventDate.getMonth() !== currentMonth) return;

    const perShare = Number(event?.dividend);
    if (!Number.isFinite(perShare) || perShare <= 0) return;
    const amount = perShare * quantity;

    if (resolveCurrency(event) === 'USD') {
      usScheduled += amount;
      return;
    }

    twScheduled += amount;
    const paymentDateRaw = event?.payment_date;
    const paymentDate = paymentDateRaw ? new Date(paymentDateRaw) : null;
    if (paymentDate && !Number.isNaN(paymentDate.getTime()) && paymentDate <= today) {
      twReceived += amount;
    } else {
      twPending += amount;
    }
  });

  const isLivingCostSet = Number(monthlyLivingCost) > 0;
  const coveragePercent = isLivingCostSet
    ? Math.round((twScheduled / Number(monthlyLivingCost)) * 100)
    : null;

  return {
    twScheduled,
    twReceived,
    twPending,
    usScheduled,
    hasUsAmount: usScheduled > 0,
    isLivingCostSet,
    coveragePercent
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd etf_react_server && pnpm --filter dividend-life test --runTestsByPath tests/coverageUtils.test.js`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
cd etf_react_server
git add apps/dividend-life/src/utils/coverageUtils.js apps/dividend-life/tests/coverageUtils.test.js
git commit -m "feat(dividend-life): add this-month coverage/scheduled-received-pending calculator"
```

---

### Task 4: `nextPaymentUtils.js` — 下一筆已公告入帳

包裝既有 `utils/dividendUtils.js` 的 `getTomorrowDividendAlerts`，不修改它的既有行為或簽名（`DividendLifePage.jsx` 頂部提醒 banner 仍照舊呼叫），只是用一個遠超過任何實際配息週期的視窗天數呼叫它，取最近的一筆「已入帳」(`type: 'pay'`) 事件。

**Files:**
- Create: `apps/dividend-life/src/utils/nextPaymentUtils.js`
- Test: `apps/dividend-life/tests/nextPaymentUtils.test.js`

**Interfaces:**
- Consumes: `getTomorrowDividendAlerts(dividendData, history, daysAhead)` from `./dividendUtils`（既有，回傳 `{ stock_id, stock_name, type, dividend, quantity, total, date, daysUntil }[]`，依 `daysUntil` 遞增排序）。
- Produces: `getNextAnnouncedPayment(dividendData, transactionHistory)` → 上述 alert 物件的其中一筆（`type: 'pay'` 且 `daysUntil` 最小），或 `null`（沒有已公告入帳事件時）。

- [ ] **Step 1: Write the failing test**

```js
// apps/dividend-life/tests/nextPaymentUtils.test.js
import { getNextAnnouncedPayment } from '../src/utils/nextPaymentUtils';

function daysFromToday(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

describe('getNextAnnouncedPayment', () => {
  test('returns null when there are no announced payment events', () => {
    expect(getNextAnnouncedPayment([], [])).toBeNull();
  });

  test('returns null when the only announced events are ex-dividend, not payment', () => {
    const dividendData = [
      { stock_id: '0056', stock_name: 'ETF A', dividend: 1, dividend_date: daysFromToday(5), payment_date: null }
    ];
    const history = [{ stock_id: '0056', date: '2020-01-01', type: 'buy', quantity: 1000 }];
    expect(getNextAnnouncedPayment(dividendData, history)).toBeNull();
  });

  test('picks the soonest upcoming payment event among multiple holdings', () => {
    const dividendData = [
      { stock_id: '0056', stock_name: 'ETF A', dividend: 1, dividend_date: null, payment_date: daysFromToday(40) },
      { stock_id: '0050', stock_name: 'ETF B', dividend: 2, dividend_date: null, payment_date: daysFromToday(12) }
    ];
    const history = [
      { stock_id: '0056', date: '2020-01-01', type: 'buy', quantity: 1000 },
      { stock_id: '0050', date: '2020-01-01', type: 'buy', quantity: 500 }
    ];
    const result = getNextAnnouncedPayment(dividendData, history);
    expect(result.stock_id).toBe('0050');
    expect(result.type).toBe('pay');
    expect(result.total).toBeCloseTo(1000);
  });

  test('is not limited to a short lookahead window (finds payments months out)', () => {
    const dividendData = [
      { stock_id: '0056', stock_name: 'ETF A', dividend: 1, dividend_date: null, payment_date: daysFromToday(180) }
    ];
    const history = [{ stock_id: '0056', date: '2020-01-01', type: 'buy', quantity: 1000 }];
    const result = getNextAnnouncedPayment(dividendData, history);
    expect(result).not.toBeNull();
    expect(result.stock_id).toBe('0056');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd etf_react_server && pnpm --filter dividend-life test --runTestsByPath tests/nextPaymentUtils.test.js`
Expected: FAIL with "Cannot find module '../src/utils/nextPaymentUtils'"

- [ ] **Step 3: Write minimal implementation**

```js
// apps/dividend-life/src/utils/nextPaymentUtils.js
import { getTomorrowDividendAlerts } from './dividendUtils';

// Wide enough to cover any realistic dividend announcement horizon without
// modifying getTomorrowDividendAlerts's own default 7-day window (used
// unchanged by DividendLifePage.jsx's top-of-page alert banner).
const NEXT_PAYMENT_LOOKAHEAD_DAYS = 3650;

export function getNextAnnouncedPayment(dividendData, transactionHistory) {
  const alerts = getTomorrowDividendAlerts(dividendData, transactionHistory, NEXT_PAYMENT_LOOKAHEAD_DAYS);
  const payAlerts = alerts.filter(alert => alert.type === 'pay');
  if (!payAlerts.length) return null;
  return payAlerts.reduce((earliest, alert) =>
    alert.daysUntil < earliest.daysUntil ? alert : earliest
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd etf_react_server && pnpm --filter dividend-life test --runTestsByPath tests/nextPaymentUtils.test.js`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
cd etf_react_server
git add apps/dividend-life/src/utils/nextPaymentUtils.js apps/dividend-life/tests/nextPaymentUtils.test.js
git commit -m "feat(dividend-life): add next-announced-payment lookup for HomeTab"
```

---

### Task 5: `futureCashflowUtils.js` — 未來現金流（僅已公告事件）

**Files:**
- Create: `apps/dividend-life/src/utils/futureCashflowUtils.js`
- Test: `apps/dividend-life/tests/futureCashflowUtils.test.js`

**Interfaces:**
- Consumes: 同 Task 3 的 `dividendData` / `inventoryList` 形狀。
- Produces: `calculateFutureCashflow({ dividendData, inventoryList, baseCurrency, monthlyLivingCost, monthsAhead, asOfDate }) => { currency, months }`，其中：
  - `baseCurrency` 預設 `'TWD'`（呼叫端傳入 `dividendSummary.baseCurrency`，維持單一幣別呈現，不做未說明的加總）。
  - `months` 為長度 `monthsAhead`（預設 `6`）的陣列，從 `asOfDate` 所在月份開始（含當月），每筆為 `{ year, month, amount, hasAnnouncedData, isBelowLivingCost }`。
  - 只加總 `payment_date` 嚴格晚於 `asOfDate`（不含今天已發生的）、幣別等於 `baseCurrency` 的事件；`hasAnnouncedData` 標示該月是否至少有一筆已公告事件。
  - `isBelowLivingCost`：僅在 `monthlyLivingCost > 0` 且 `hasAnnouncedData` 為真時，才可能為 `true`（沒有公告資料的月份不得標記為低於目標）。

- [ ] **Step 1: Write the failing test**

```js
// apps/dividend-life/tests/futureCashflowUtils.test.js
import { calculateFutureCashflow } from '../src/utils/futureCashflowUtils';

const asOfDate = new Date('2026-08-15T00:00:00');

describe('calculateFutureCashflow', () => {
  test('buckets future announced TWD events by month, starting with the current month', () => {
    const dividendData = [
      { stock_id: '0056', dividend: 1, payment_date: '2026-09-05', currency: 'TWD' },
      { stock_id: '0056', dividend: 1, payment_date: '2026-11-10', currency: 'TWD' }
    ];
    const inventoryList = [{ stock_id: '0056', total_quantity: 1000 }];
    const result = calculateFutureCashflow({
      dividendData, inventoryList, baseCurrency: 'TWD', monthlyLivingCost: 0, monthsAhead: 6, asOfDate
    });
    expect(result.months).toHaveLength(6);
    expect(result.months[0]).toMatchObject({ year: 2026, month: 7, amount: 0, hasAnnouncedData: false }); // Aug (0-indexed)
    expect(result.months[1]).toMatchObject({ year: 2026, month: 8, amount: 1000, hasAnnouncedData: true }); // Sep
    expect(result.months[3]).toMatchObject({ year: 2026, month: 10, amount: 1000, hasAnnouncedData: true }); // Nov
  });

  test('ignores events already paid on or before asOfDate', () => {
    const dividendData = [{ stock_id: '0056', dividend: 1, payment_date: '2026-08-15', currency: 'TWD' }];
    const inventoryList = [{ stock_id: '0056', total_quantity: 1000 }];
    const result = calculateFutureCashflow({ dividendData, inventoryList, baseCurrency: 'TWD', asOfDate });
    expect(result.months.every(m => m.amount === 0)).toBe(true);
  });

  test('ignores events in a currency other than baseCurrency', () => {
    const dividendData = [{ stock_id: 'VOO', dividend: 1, payment_date: '2026-09-05', currency: 'USD' }];
    const inventoryList = [{ stock_id: 'VOO', total_quantity: 10 }];
    const result = calculateFutureCashflow({ dividendData, inventoryList, baseCurrency: 'TWD', asOfDate });
    expect(result.months.every(m => m.amount === 0 && !m.hasAnnouncedData)).toBe(true);
  });

  test('flags isBelowLivingCost only for months with announced data below the target', () => {
    const dividendData = [{ stock_id: '0056', dividend: 1, payment_date: '2026-09-05', currency: 'TWD' }];
    const inventoryList = [{ stock_id: '0056', total_quantity: 1000 }];
    const result = calculateFutureCashflow({
      dividendData, inventoryList, baseCurrency: 'TWD', monthlyLivingCost: 5000, asOfDate
    });
    const sept = result.months[1];
    expect(sept.amount).toBe(1000);
    expect(sept.isBelowLivingCost).toBe(true);
    const aug = result.months[0];
    expect(aug.hasAnnouncedData).toBe(false);
    expect(aug.isBelowLivingCost).toBe(false);
  });

  test('respects a custom monthsAhead length', () => {
    const result = calculateFutureCashflow({ dividendData: [], inventoryList: [], monthsAhead: 12, asOfDate });
    expect(result.months).toHaveLength(12);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd etf_react_server && pnpm --filter dividend-life test --runTestsByPath tests/futureCashflowUtils.test.js`
Expected: FAIL with "Cannot find module '../src/utils/futureCashflowUtils'"

- [ ] **Step 3: Write minimal implementation**

```js
// apps/dividend-life/src/utils/futureCashflowUtils.js
function buildHoldingsMap(inventoryList = []) {
  const holdings = new Map();
  (Array.isArray(inventoryList) ? inventoryList : []).forEach(item => {
    const stockId = item?.stock_id;
    const quantity = Number(item?.total_quantity);
    if (stockId && Number.isFinite(quantity) && quantity > 0) {
      holdings.set(stockId, quantity);
    }
  });
  return holdings;
}

function resolveCurrency(event) {
  return typeof event?.currency === 'string' && event.currency.trim()
    ? event.currency.trim().toUpperCase()
    : 'TWD';
}

export function calculateFutureCashflow({
  dividendData = [],
  inventoryList = [],
  baseCurrency = 'TWD',
  monthlyLivingCost = 0,
  monthsAhead = 6,
  asOfDate = new Date()
} = {}) {
  const holdings = buildHoldingsMap(inventoryList);
  const today = new Date(asOfDate);
  today.setHours(0, 0, 0, 0);

  const monthBuckets = [];
  const bucketIndex = new Map();
  for (let i = 0; i < monthsAhead; i += 1) {
    const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    bucketIndex.set(key, monthBuckets.length);
    monthBuckets.push({ year: d.getFullYear(), month: d.getMonth(), amount: 0, hasAnnouncedData: false });
  }

  (Array.isArray(dividendData) ? dividendData : []).forEach(event => {
    const stockId = event?.stock_id;
    const quantity = holdings.get(stockId);
    if (!quantity) return;
    if (resolveCurrency(event) !== baseCurrency) return;

    const paymentDateRaw = event?.payment_date;
    if (!paymentDateRaw) return;
    const paymentDate = new Date(paymentDateRaw);
    if (Number.isNaN(paymentDate.getTime()) || paymentDate <= today) return;

    const perShare = Number(event?.dividend);
    if (!Number.isFinite(perShare) || perShare <= 0) return;

    const key = `${paymentDate.getFullYear()}-${paymentDate.getMonth()}`;
    const idx = bucketIndex.get(key);
    if (idx === undefined) return;

    monthBuckets[idx].amount += perShare * quantity;
    monthBuckets[idx].hasAnnouncedData = true;
  });

  const isLivingCostSet = Number(monthlyLivingCost) > 0;
  const months = monthBuckets.map(bucket => ({
    ...bucket,
    isBelowLivingCost: isLivingCostSet && bucket.hasAnnouncedData && bucket.amount < Number(monthlyLivingCost)
  }));

  return { currency: baseCurrency, months };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd etf_react_server && pnpm --filter dividend-life test --runTestsByPath tests/futureCashflowUtils.test.js`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
cd etf_react_server
git add apps/dividend-life/src/utils/futureCashflowUtils.js apps/dividend-life/tests/futureCashflowUtils.test.js
git commit -m "feat(dividend-life): add future-cashflow calculator (announced events only)"
```

---

### Task 6: `SummaryHero` component

生活化摘要文案（主規格書 §6.1.A），純粹由 `coverageUtils` 的輸出組字串，不隨機變化。

**Files:**
- Create: `apps/dividend-life/src/components/SummaryHero.jsx`
- Create: `apps/dividend-life/src/components/SummaryHero.module.css`
- Modify: `apps/dividend-life/src/i18n.js` (insert after `  zh: {` on line 4, and after `  en: {` — line number shifts each task, search for the literal `  en: {` line)
- Test: `apps/dividend-life/tests/SummaryHero.test.jsx`

**Interfaces:**
- Consumes: `formatTwd` from `../utils/homeCurrencyFormat` (Task 1).
- Produces: `<SummaryHero monthLabel={string} twScheduled={number} coveragePercent={number|null} lang={'zh'|'en'} t={(key)=>string} />`. Exported as default.

- [ ] **Step 1: Write the failing test**

```jsx
// apps/dividend-life/tests/SummaryHero.test.jsx
/* eslint-env jest */
import { render, screen } from '@testing-library/react';
import SummaryHero from '../src/components/SummaryHero';
import { translations } from '../src/i18n';

const t = (key) => translations.zh[key] || key;

test('shows amount and coverage percent when living cost is set', () => {
  render(<SummaryHero monthLabel="8月" twScheduled={18620} coveragePercent={74} lang="zh" t={t} />);
  expect(screen.getByText(/NT\$18,620/)).toBeInTheDocument();
  expect(screen.getByText(/74%/)).toBeInTheDocument();
});

test('falls back to a no-coverage message when coveragePercent is null', () => {
  render(<SummaryHero monthLabel="8月" twScheduled={18620} coveragePercent={null} lang="zh" t={t} />);
  expect(screen.getByText(/NT\$18,620/)).toBeInTheDocument();
  expect(screen.queryByText(/%/)).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd etf_react_server && pnpm --filter dividend-life test --runTestsByPath tests/SummaryHero.test.jsx`
Expected: FAIL with "Cannot find module '../src/components/SummaryHero'"

- [ ] **Step 3: Add i18n keys**

In `apps/dividend-life/src/i18n.js`, find the exact line `  zh: {` (appears once, line 4) and insert directly after it:

```js
  zh: {
    home_greeting_headline: '{month}的配息生活很平穩 ☀️',
    home_greeting_detail: '本月預計收到 {amount}，約可負擔 {percent}% 的基本生活費。',
    home_greeting_detail_no_coverage: '本月預計收到 {amount}。設定每月生活費，即可看到覆蓋率。',
```

Find the exact line `  en: {` (appears once) and insert directly after it:

```js
  en: {
    home_greeting_headline: 'Your dividend life in {month} looks steady ☀️',
    home_greeting_detail: 'You are set to receive {amount} this month, covering about {percent}% of your basic living costs.',
    home_greeting_detail_no_coverage: 'You are set to receive {amount} this month. Set a monthly living cost to see your coverage.',
```

- [ ] **Step 4: Write minimal implementation**

```jsx
// apps/dividend-life/src/components/SummaryHero.jsx
import styles from './SummaryHero.module.css';
import { formatTwd } from '../utils/homeCurrencyFormat';

export default function SummaryHero({ monthLabel, twScheduled, coveragePercent, lang, t }) {
  const amount = formatTwd(twScheduled);
  const headline = t('home_greeting_headline').replace('{month}', monthLabel);
  const detail = coveragePercent === null
    ? t('home_greeting_detail_no_coverage').replace('{amount}', amount)
    : t('home_greeting_detail')
        .replace('{amount}', amount)
        .replace('{percent}', String(coveragePercent));

  return (
    <section className={styles.hero} aria-label={lang === 'en' ? 'Summary' : '生活化摘要'}>
      <p className={styles.headline}>{headline}</p>
      <p className={styles.detail}>{detail}</p>
    </section>
  );
}
```

```css
/* apps/dividend-life/src/components/SummaryHero.module.css */
.hero {
  padding: 20px 24px;
  border-radius: var(--radius-card, 18px);
  background: var(--surface, #fff);
}

.headline {
  font-family: var(--font-display, serif);
  font-size: 22px;
  margin: 0 0 6px;
  color: var(--ink, #2d2a22);
}

.detail {
  font-size: 16px;
  margin: 0;
  color: var(--ink-soft, #55503f);
  font-variant-numeric: tabular-nums;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd etf_react_server && pnpm --filter dividend-life test --runTestsByPath tests/SummaryHero.test.jsx`
Expected: PASS (2 tests)

- [ ] **Step 6: Commit**

```bash
cd etf_react_server
git add apps/dividend-life/src/components/SummaryHero.jsx apps/dividend-life/src/components/SummaryHero.module.css apps/dividend-life/src/i18n.js apps/dividend-life/tests/SummaryHero.test.jsx
git commit -m "feat(dividend-life): add SummaryHero component for HomeTab Phase 2"
```

---

### Task 7: `MonthlyIncomeCard` component

主規格書 §6.1.B 的「本月預計配息、已入帳、尚未入帳」，以及美股稅前免責文案（畫面顯示美股金額時）。

**Files:**
- Create: `apps/dividend-life/src/components/MonthlyIncomeCard.jsx`
- Create: `apps/dividend-life/src/components/MonthlyIncomeCard.module.css`
- Modify: `apps/dividend-life/src/i18n.js` (same insertion points as Task 6, after `  zh: {` and after `  en: {`)
- Test: `apps/dividend-life/tests/MonthlyIncomeCard.test.jsx`

**Interfaces:**
- Consumes: `formatTwd` from `../utils/homeCurrencyFormat`.
- Produces: `<MonthlyIncomeCard twScheduled twReceived twPending hasUsAmount usScheduled lang t />`. Default export.

- [ ] **Step 1: Write the failing test**

```jsx
// apps/dividend-life/tests/MonthlyIncomeCard.test.jsx
/* eslint-env jest */
import { render, screen } from '@testing-library/react';
import MonthlyIncomeCard from '../src/components/MonthlyIncomeCard';
import { translations } from '../src/i18n';

const t = (key) => translations.zh[key] || key;

test('shows scheduled, received, and pending amounts', () => {
  render(
    <MonthlyIncomeCard
      twScheduled={2000} twReceived={1000} twPending={1000}
      hasUsAmount={false} usScheduled={0} lang="zh" t={t}
    />
  );
  expect(screen.getByText('NT$2,000')).toBeInTheDocument();
  expect(screen.getByText('NT$1,000')).toBeInTheDocument();
});

test('shows the US pre-tax disclaimer only when a US amount is present', () => {
  const { rerender } = render(
    <MonthlyIncomeCard
      twScheduled={2000} twReceived={2000} twPending={0}
      hasUsAmount={false} usScheduled={0} lang="zh" t={t}
    />
  );
  expect(screen.queryByText(t('us_dividend_pretax_disclaimer'))).not.toBeInTheDocument();

  rerender(
    <MonthlyIncomeCard
      twScheduled={2000} twReceived={2000} twPending={0}
      hasUsAmount usScheduled={450} lang="zh" t={t}
    />
  );
  expect(screen.getByText(t('us_dividend_pretax_disclaimer'))).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd etf_react_server && pnpm --filter dividend-life test --runTestsByPath tests/MonthlyIncomeCard.test.jsx`
Expected: FAIL with "Cannot find module '../src/components/MonthlyIncomeCard'"

- [ ] **Step 3: Add i18n keys**

Insert after `  zh: {`:

```js
    monthly_income_card_title: '本月配息',
    monthly_income_scheduled_label: '本月預計',
    monthly_income_received_label: '已入帳',
    monthly_income_pending_label: '未入帳',
    us_dividend_pretax_disclaimer: '美股股息為稅前估算，實際入帳金額會扣除預扣稅。',
```

Insert after `  en: {`:

```js
    monthly_income_card_title: 'This Month’s Dividends',
    monthly_income_scheduled_label: 'Scheduled',
    monthly_income_received_label: 'Received',
    monthly_income_pending_label: 'Pending',
    us_dividend_pretax_disclaimer: 'US dividends are pre-tax estimates; actual payouts will have withholding tax deducted.',
```

- [ ] **Step 4: Write minimal implementation**

```jsx
// apps/dividend-life/src/components/MonthlyIncomeCard.jsx
import styles from './MonthlyIncomeCard.module.css';
import { formatTwd } from '../utils/homeCurrencyFormat';

export default function MonthlyIncomeCard({
  twScheduled, twReceived, twPending, hasUsAmount, usScheduled, lang, t
}) {
  return (
    <section className={styles.card} aria-label={t('monthly_income_card_title')}>
      <h3 className={styles.title}>{t('monthly_income_card_title')}</h3>
      <dl className={styles.grid}>
        <div className={styles.row}>
          <dt>{t('monthly_income_scheduled_label')}</dt>
          <dd>{formatTwd(twScheduled)}</dd>
        </div>
        <div className={styles.row}>
          <dt>{t('monthly_income_received_label')}</dt>
          <dd>{formatTwd(twReceived)}</dd>
        </div>
        <div className={styles.row}>
          <dt>{t('monthly_income_pending_label')}</dt>
          <dd>{formatTwd(twPending)}</dd>
        </div>
      </dl>
      {hasUsAmount && (
        <p className={styles.disclaimer}>{t('us_dividend_pretax_disclaimer')}</p>
      )}
    </section>
  );
}
```

```css
/* apps/dividend-life/src/components/MonthlyIncomeCard.module.css */
.card {
  padding: 20px 24px;
  border-radius: var(--radius-card, 18px);
  background: var(--surface, #fff);
  border: 1px solid var(--border, #e4dcc8);
}

.title {
  margin: 0 0 12px;
  font-size: 16px;
  color: var(--ink, #2d2a22);
}

.grid {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.row {
  display: flex;
  justify-content: space-between;
  font-variant-numeric: tabular-nums;
}

.row dt {
  color: var(--muted, #948a72);
}

.row dd {
  margin: 0;
  font-weight: 600;
}

.disclaimer {
  margin: 12px 0 0;
  font-size: 13px;
  color: var(--terracotta, #be6a4c);
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd etf_react_server && pnpm --filter dividend-life test --runTestsByPath tests/MonthlyIncomeCard.test.jsx`
Expected: PASS (2 tests)

- [ ] **Step 6: Commit**

```bash
cd etf_react_server
git add apps/dividend-life/src/components/MonthlyIncomeCard.jsx apps/dividend-life/src/components/MonthlyIncomeCard.module.css apps/dividend-life/src/i18n.js apps/dividend-life/tests/MonthlyIncomeCard.test.jsx
git commit -m "feat(dividend-life): add MonthlyIncomeCard component for HomeTab Phase 2"
```

---

### Task 8: `CoverageProgress` component

覆蓋率 progress bar + 生活費設定 CTA／inline 編輯表單。是唯一會寫入 `livingCostStorage` 的元件。

**Files:**
- Create: `apps/dividend-life/src/components/CoverageProgress.jsx`
- Create: `apps/dividend-life/src/components/CoverageProgress.module.css`
- Modify: `apps/dividend-life/src/i18n.js` (same insertion points)
- Test: `apps/dividend-life/tests/CoverageProgress.test.jsx`

**Interfaces:**
- Consumes: `formatTwd` from `../utils/homeCurrencyFormat`; `saveLivingCost` from `../utils/livingCostStorage` (Task 2).
- Produces: `<CoverageProgress monthlyLivingCost={number} isLivingCostSet={bool} coveragePercent={number|null} twScheduled={number} hasUsAmount={bool} lang t onLivingCostSaved={(value:number)=>void} />`. Default export. `onLivingCostSaved` is called by the parent-supplied callback after a successful save so `HomeTab.jsx` can refresh its own `monthlyLivingCost` state (the component itself persists via `saveLivingCost` and then calls this callback with the new value — it does not own the source-of-truth state).

- [ ] **Step 1: Write the failing test**

```jsx
// apps/dividend-life/tests/CoverageProgress.test.jsx
/* eslint-env jest */
import { render, screen, fireEvent } from '@testing-library/react';
import CoverageProgress from '../src/components/CoverageProgress';
import { translations } from '../src/i18n';
import { loadLivingCost } from '../src/utils/livingCostStorage';

const t = (key) => translations.zh[key] || key;

beforeEach(() => {
  localStorage.clear();
});

test('shows a setup CTA and input when living cost is not set', () => {
  render(
    <CoverageProgress
      monthlyLivingCost={0} isLivingCostSet={false} coveragePercent={null}
      twScheduled={5000} hasUsAmount={false} lang="zh" t={t} onLivingCostSaved={() => {}}
    />
  );
  expect(screen.getByText(t('coverage_living_cost_cta'))).toBeInTheDocument();
  expect(screen.queryByText(/%/)).not.toBeInTheDocument();
});

test('shows the coverage percent and progress bar when living cost is set', () => {
  render(
    <CoverageProgress
      monthlyLivingCost={10000} isLivingCostSet coveragePercent={50}
      twScheduled={5000} hasUsAmount={false} lang="zh" t={t} onLivingCostSaved={() => {}}
    />
  );
  expect(screen.getByText('50%')).toBeInTheDocument();
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50');
});

test('shows the US pre-tax disclaimer when hasUsAmount is true', () => {
  render(
    <CoverageProgress
      monthlyLivingCost={10000} isLivingCostSet coveragePercent={50}
      twScheduled={5000} hasUsAmount lang="zh" t={t} onLivingCostSaved={() => {}}
    />
  );
  expect(screen.getByText(t('us_dividend_pretax_disclaimer'))).toBeInTheDocument();
});

test('saving a new living cost persists it and calls onLivingCostSaved', () => {
  const onLivingCostSaved = jest.fn();
  render(
    <CoverageProgress
      monthlyLivingCost={0} isLivingCostSet={false} coveragePercent={null}
      twScheduled={5000} hasUsAmount={false} lang="zh" t={t} onLivingCostSaved={onLivingCostSaved}
    />
  );
  fireEvent.click(screen.getByText(t('coverage_living_cost_cta')));
  fireEvent.change(screen.getByPlaceholderText(t('coverage_living_cost_placeholder')), { target: { value: '25000' } });
  fireEvent.click(screen.getByText(t('coverage_living_cost_save')));
  expect(loadLivingCost()).toBe(25000);
  expect(onLivingCostSaved).toHaveBeenCalledWith(25000);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd etf_react_server && pnpm --filter dividend-life test --runTestsByPath tests/CoverageProgress.test.jsx`
Expected: FAIL with "Cannot find module '../src/components/CoverageProgress'"

- [ ] **Step 3: Add i18n keys**

Insert after `  zh: {`:

```js
    coverage_card_title: '本月生活覆蓋率',
    coverage_living_cost_label: '每月生活費',
    coverage_living_cost_cta: '設定每月生活費',
    coverage_living_cost_save: '儲存',
    coverage_living_cost_placeholder: '輸入每月生活費金額',
```

Insert after `  en: {`:

```js
    coverage_card_title: 'This Month’s Living Cost Coverage',
    coverage_living_cost_label: 'Monthly living cost',
    coverage_living_cost_cta: 'Set monthly living cost',
    coverage_living_cost_save: 'Save',
    coverage_living_cost_placeholder: 'Enter your monthly living cost',
```

- [ ] **Step 4: Write minimal implementation**

```jsx
// apps/dividend-life/src/components/CoverageProgress.jsx
import { useState } from 'react';
import styles from './CoverageProgress.module.css';
import { formatTwd } from '../utils/homeCurrencyFormat';
import { saveLivingCost } from '../utils/livingCostStorage';

export default function CoverageProgress({
  monthlyLivingCost, isLivingCostSet, coveragePercent, twScheduled, hasUsAmount, lang, t, onLivingCostSaved
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftValue, setDraftValue] = useState(String(monthlyLivingCost || ''));

  const handleSave = () => {
    const numericValue = Number(draftValue);
    const safeValue = Number.isFinite(numericValue) && numericValue >= 0 ? numericValue : 0;
    saveLivingCost(safeValue);
    setIsEditing(false);
    onLivingCostSaved(safeValue);
  };

  const clampedPercent = coveragePercent === null ? 0 : Math.max(0, Math.min(100, coveragePercent));

  return (
    <section className={styles.card} aria-label={t('coverage_card_title')}>
      <h3 className={styles.title}>{t('coverage_card_title')}</h3>

      {!isLivingCostSet && !isEditing && (
        <button type="button" className={styles.ctaButton} onClick={() => setIsEditing(true)}>
          {t('coverage_living_cost_cta')}
        </button>
      )}

      {isEditing && (
        <div className={styles.editRow}>
          <input
            type="number"
            min="0"
            value={draftValue}
            placeholder={t('coverage_living_cost_placeholder')}
            onChange={(e) => setDraftValue(e.target.value)}
          />
          <button type="button" onClick={handleSave}>{t('coverage_living_cost_save')}</button>
        </div>
      )}

      {isLivingCostSet && (
        <>
          <div
            className={styles.progressBar}
            role="progressbar"
            aria-valuenow={clampedPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={t('coverage_card_title')}
          >
            <div className={styles.progressFill} style={{ width: `${clampedPercent}%` }} />
          </div>
          <p className={styles.percentLabel}>{coveragePercent}%</p>
          <p className={styles.livingCostLine}>
            {t('coverage_living_cost_label')}: {formatTwd(monthlyLivingCost)}
          </p>
        </>
      )}

      {hasUsAmount && (
        <p className={styles.disclaimer}>{t('us_dividend_pretax_disclaimer')}</p>
      )}
    </section>
  );
}
```

```css
/* apps/dividend-life/src/components/CoverageProgress.module.css */
.card {
  padding: 20px 24px;
  border-radius: var(--radius-card, 18px);
  background: var(--surface, #fff);
  border: 1px solid var(--border, #e4dcc8);
}

.title {
  margin: 0 0 12px;
  font-size: 16px;
}

.ctaButton {
  background: var(--sage, #6e8062);
  color: #fff;
  border: none;
  border-radius: var(--radius-control, 10px);
  padding: 8px 16px;
  cursor: pointer;
}

.editRow {
  display: flex;
  gap: 8px;
}

.progressBar {
  height: 10px;
  border-radius: 999px;
  background: var(--sage-soft, #dce6d5);
  overflow: hidden;
}

.progressFill {
  height: 100%;
  background: var(--sage, #6e8062);
}

.percentLabel {
  font-size: 28px;
  font-variant-numeric: tabular-nums;
  margin: 8px 0 0;
}

.livingCostLine {
  color: var(--muted, #948a72);
  margin: 4px 0 0;
}

.disclaimer {
  margin: 12px 0 0;
  font-size: 13px;
  color: var(--terracotta, #be6a4c);
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd etf_react_server && pnpm --filter dividend-life test --runTestsByPath tests/CoverageProgress.test.jsx`
Expected: PASS (4 tests)

- [ ] **Step 6: Commit**

```bash
cd etf_react_server
git add apps/dividend-life/src/components/CoverageProgress.jsx apps/dividend-life/src/components/CoverageProgress.module.css apps/dividend-life/src/i18n.js apps/dividend-life/tests/CoverageProgress.test.jsx
git commit -m "feat(dividend-life): add CoverageProgress component with inline living-cost setup"
```

---

### Task 9: `NextPaymentCard` component

**Files:**
- Create: `apps/dividend-life/src/components/NextPaymentCard.jsx`
- Create: `apps/dividend-life/src/components/NextPaymentCard.module.css`
- Modify: `apps/dividend-life/src/i18n.js` (same insertion points)
- Test: `apps/dividend-life/tests/NextPaymentCard.test.jsx`

**Interfaces:**
- Consumes: `formatTwd` from `../utils/homeCurrencyFormat`; the `nextPayment` shape produced by Task 4's `getNextAnnouncedPayment` (`{ stock_id, stock_name, dividend, quantity, total, date, daysUntil }` or `null`).
- Produces: `<NextPaymentCard nextPayment={object|null} lang t calendarAction={ReactNode?} />`. Default export. `calendarAction` is an optional slot for the future `.ics` download button (§6.1.C, P1) — Phase 2 never passes it, so it renders nothing by default. This satisfies the spec's "leave the mount point, don't implement the button" requirement without a separate stub file.

- [ ] **Step 1: Write the failing test**

```jsx
// apps/dividend-life/tests/NextPaymentCard.test.jsx
/* eslint-env jest */
import { render, screen } from '@testing-library/react';
import NextPaymentCard from '../src/components/NextPaymentCard';
import { translations } from '../src/i18n';

const t = (key) => translations.zh[key] || key;

test('shows the empty-state message when there is no announced payment', () => {
  render(<NextPaymentCard nextPayment={null} lang="zh" t={t} />);
  expect(screen.getByText(t('next_payment_empty'))).toBeInTheDocument();
});

test('shows stock, amount, and days-until when a payment is announced', () => {
  const nextPayment = {
    stock_id: '0050', stock_name: '元大台灣50', dividend: 2, quantity: 500,
    total: 1000, date: '2026-09-01', daysUntil: 5
  };
  render(<NextPaymentCard nextPayment={nextPayment} lang="zh" t={t} />);
  expect(screen.getByText(/0050/)).toBeInTheDocument();
  expect(screen.getByText('NT$1,000')).toBeInTheDocument();
  expect(screen.getByText(t('next_payment_days_in_n').replace('{days}', '5'))).toBeInTheDocument();
});

test('renders the optional calendarAction slot when provided', () => {
  const nextPayment = { stock_id: '0050', stock_name: '元大台灣50', dividend: 2, quantity: 500, total: 1000, date: '2026-09-01', daysUntil: 5 };
  render(<NextPaymentCard nextPayment={nextPayment} lang="zh" t={t} calendarAction={<button type="button">ics</button>} />);
  expect(screen.getByText('ics')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd etf_react_server && pnpm --filter dividend-life test --runTestsByPath tests/NextPaymentCard.test.jsx`
Expected: FAIL with "Cannot find module '../src/components/NextPaymentCard'"

- [ ] **Step 3: Add i18n keys**

Insert after `  zh: {`:

```js
    next_payment_card_title: '下一筆入帳',
    next_payment_empty: '目前沒有已公告的入帳資料',
    next_payment_days_today: '今天',
    next_payment_days_tomorrow: '明天',
    next_payment_days_in_n: '還有 {days} 天',
    next_payment_estimated_amount_label: '預估入帳金額',
```

Insert after `  en: {`:

```js
    next_payment_card_title: 'Next Payment',
    next_payment_empty: 'No announced payment yet',
    next_payment_days_today: 'today',
    next_payment_days_tomorrow: 'tomorrow',
    next_payment_days_in_n: 'in {days} days',
    next_payment_estimated_amount_label: 'Estimated amount',
```

- [ ] **Step 4: Write minimal implementation**

```jsx
// apps/dividend-life/src/components/NextPaymentCard.jsx
import styles from './NextPaymentCard.module.css';
import { formatTwd } from '../utils/homeCurrencyFormat';

function formatCountdown(daysUntil, t) {
  if (daysUntil === 0) return t('next_payment_days_today');
  if (daysUntil === 1) return t('next_payment_days_tomorrow');
  return t('next_payment_days_in_n').replace('{days}', String(daysUntil));
}

export default function NextPaymentCard({ nextPayment, lang, t, calendarAction = null }) {
  return (
    <section className={styles.card} aria-label={t('next_payment_card_title')}>
      <h3 className={styles.title}>{t('next_payment_card_title')}</h3>
      {!nextPayment ? (
        <p className={styles.empty}>{t('next_payment_empty')}</p>
      ) : (
        <>
          <p className={styles.stockLine}>{nextPayment.stock_id} {nextPayment.stock_name}</p>
          <p className={styles.countdown}>{formatCountdown(nextPayment.daysUntil, t)}</p>
          <p className={styles.amountLine}>
            <span>{t('next_payment_estimated_amount_label')}</span>
            <strong>{formatTwd(nextPayment.total)}</strong>
          </p>
          {calendarAction}
        </>
      )}
    </section>
  );
}
```

```css
/* apps/dividend-life/src/components/NextPaymentCard.module.css */
.card {
  padding: 20px 24px;
  border-radius: var(--radius-card, 18px);
  background: var(--surface, #fff);
  border: 1px solid var(--border, #e4dcc8);
}

.title {
  margin: 0 0 12px;
  font-size: 16px;
}

.empty {
  color: var(--muted, #948a72);
  margin: 0;
}

.stockLine {
  margin: 0;
  font-weight: 600;
}

.countdown {
  color: var(--gold, #a9813b);
  margin: 4px 0;
}

.amountLine {
  display: flex;
  justify-content: space-between;
  margin: 8px 0 0;
  font-variant-numeric: tabular-nums;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd etf_react_server && pnpm --filter dividend-life test --runTestsByPath tests/NextPaymentCard.test.jsx`
Expected: PASS (3 tests)

- [ ] **Step 6: Commit**

```bash
cd etf_react_server
git add apps/dividend-life/src/components/NextPaymentCard.jsx apps/dividend-life/src/components/NextPaymentCard.module.css apps/dividend-life/src/i18n.js apps/dividend-life/tests/NextPaymentCard.test.jsx
git commit -m "feat(dividend-life): add NextPaymentCard component for HomeTab Phase 2"
```

---

### Task 10: `CashflowChart` component

主規格書 §6.1.E 要求「圖表提供 accessible summary，不只依賴 tooltip」。Phase 2 用完全文字化、可存取的月份清單呈現（每一列都是真實 DOM 文字，天生可存取），不引入 SVG／canvas 圖表函式庫或複雜繪圖邏輯——資料正確性與可存取性是 P0 要求，視覺化繪圖可在後續 phase 加強。

**Files:**
- Create: `apps/dividend-life/src/components/CashflowChart.jsx`
- Create: `apps/dividend-life/src/components/CashflowChart.module.css`
- Modify: `apps/dividend-life/src/i18n.js` (same insertion points)
- Test: `apps/dividend-life/tests/CashflowChart.test.jsx`

**Interfaces:**
- Consumes: `formatTwd` from `../utils/homeCurrencyFormat`; `months` array shape from Task 5 (`{ year, month, amount, hasAnnouncedData, isBelowLivingCost }[]`).
- Produces: `<CashflowChart months={array} lang t />`. Default export.

- [ ] **Step 1: Write the failing test**

```jsx
// apps/dividend-life/tests/CashflowChart.test.jsx
/* eslint-env jest */
import { render, screen } from '@testing-library/react';
import CashflowChart from '../src/components/CashflowChart';
import { translations } from '../src/i18n';

const t = (key) => translations.zh[key] || key;

test('renders an amount row per month', () => {
  const months = [
    { year: 2026, month: 7, amount: 1000, hasAnnouncedData: true, isBelowLivingCost: false },
    { year: 2026, month: 8, amount: 0, hasAnnouncedData: false, isBelowLivingCost: false }
  ];
  render(<CashflowChart months={months} lang="zh" t={t} />);
  expect(screen.getByText('NT$1,000')).toBeInTheDocument();
  expect(screen.getByText(t('cashflow_month_no_data'))).toBeInTheDocument();
});

test('marks months below the living cost target', () => {
  const months = [
    { year: 2026, month: 7, amount: 500, hasAnnouncedData: true, isBelowLivingCost: true }
  ];
  render(<CashflowChart months={months} lang="zh" t={t} />);
  expect(screen.getByText(t('cashflow_below_living_cost'))).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd etf_react_server && pnpm --filter dividend-life test --runTestsByPath tests/CashflowChart.test.jsx`
Expected: FAIL with "Cannot find module '../src/components/CashflowChart'"

- [ ] **Step 3: Add i18n keys**

Insert after `  zh: {`:

```js
    cashflow_chart_title: '未來現金流',
    cashflow_month_no_data: '尚無公告資料',
    cashflow_below_living_cost: '低於生活費目標',
```

Insert after `  en: {`:

```js
    cashflow_chart_title: 'Future Cashflow',
    cashflow_month_no_data: 'No announced data yet',
    cashflow_below_living_cost: 'Below living cost target',
```

- [ ] **Step 4: Write minimal implementation**

```jsx
// apps/dividend-life/src/components/CashflowChart.jsx
import styles from './CashflowChart.module.css';
import { formatTwd } from '../utils/homeCurrencyFormat';

function formatMonthLabel(year, month, lang) {
  const formatter = new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'zh-TW', { year: 'numeric', month: 'short' });
  return formatter.format(new Date(year, month, 1));
}

export default function CashflowChart({ months, lang, t }) {
  const list = Array.isArray(months) ? months : [];
  return (
    <section className={styles.card} aria-label={t('cashflow_chart_title')}>
      <h3 className={styles.title}>{t('cashflow_chart_title')}</h3>
      <ul className={styles.list}>
        {list.map((item) => (
          <li
            key={`${item.year}-${item.month}`}
            className={item.isBelowLivingCost ? `${styles.row} ${styles.rowLow}` : styles.row}
          >
            <span className={styles.monthLabel}>{formatMonthLabel(item.year, item.month, lang)}</span>
            {item.hasAnnouncedData ? (
              <span className={styles.amount}>{formatTwd(item.amount)}</span>
            ) : (
              <span className={styles.noData}>{t('cashflow_month_no_data')}</span>
            )}
            {item.isBelowLivingCost && (
              <span className={styles.lowBadge}>{t('cashflow_below_living_cost')}</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
```

```css
/* apps/dividend-life/src/components/CashflowChart.module.css */
.card {
  padding: 20px 24px;
  border-radius: var(--radius-card, 18px);
  background: var(--surface, #fff);
  border: 1px solid var(--border, #e4dcc8);
}

.title {
  margin: 0 0 12px;
  font-size: 16px;
}

.list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-variant-numeric: tabular-nums;
}

.rowLow .amount {
  color: var(--terracotta, #be6a4c);
}

.noData {
  color: var(--muted, #948a72);
}

.lowBadge {
  font-size: 12px;
  color: var(--terracotta, #be6a4c);
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd etf_react_server && pnpm --filter dividend-life test --runTestsByPath tests/CashflowChart.test.jsx`
Expected: PASS (2 tests)

- [ ] **Step 6: Commit**

```bash
cd etf_react_server
git add apps/dividend-life/src/components/CashflowChart.jsx apps/dividend-life/src/components/CashflowChart.module.css apps/dividend-life/src/i18n.js apps/dividend-life/tests/CashflowChart.test.jsx
git commit -m "feat(dividend-life): add CashflowChart component (accessible list, announced-only)"
```

---

### Task 11: `InsightCard` component

主規格書 §6.1.D 的年度進度。**範圍澄清**：低收入月提醒屬於 §10.3／§3.1 標記的 P1 項目，Phase 2 不實作偵測邏輯，只留 `lowIncomeMonthMessage` 這個可選 prop（`HomeTab.jsx` 在 Phase 2 不會傳入，元件在該值缺席時不渲染該區塊）。年度達成率直接複用 `HomeTab.jsx` 既有的 `buildDividendGoalViewModel` 輸出（`goalMetrics` 陣列裡 `id === 'achievement'` 的項目），不是新計算。

**Files:**
- Create: `apps/dividend-life/src/components/InsightCard.jsx`
- Create: `apps/dividend-life/src/components/InsightCard.module.css`
- Modify: `apps/dividend-life/src/i18n.js` (same insertion points)
- Test: `apps/dividend-life/tests/InsightCard.test.jsx`

**Interfaces:**
- Consumes: nothing beyond its own props (no new util).
- Produces: `<InsightCard achievementLabel={string|null} achievementPercent={number} lowIncomeMonthMessage={string|null} lang t />`. Default export. `achievementLabel`/`achievementPercent` come from the existing `goalMetrics` entry with `id === 'achievement'` (`value` and the raw `achievementPercentValue` respectively, as already computed by `buildDividendGoalViewModel` in `HomeTab.jsx`); when there is no goal set, pass `achievementLabel={null}`.

- [ ] **Step 1: Write the failing test**

```jsx
// apps/dividend-life/tests/InsightCard.test.jsx
/* eslint-env jest */
import { render, screen } from '@testing-library/react';
import InsightCard from '../src/components/InsightCard';
import { translations } from '../src/i18n';

const t = (key) => translations.zh[key] || key;

test('shows the achievement label and percent when a goal is set', () => {
  render(<InsightCard achievementLabel="62%" achievementPercent={0.62} lowIncomeMonthMessage={null} lang="zh" t={t} />);
  expect(screen.getByText('62%')).toBeInTheDocument();
});

test('shows a no-goal message when achievementLabel is null', () => {
  render(<InsightCard achievementLabel={null} achievementPercent={0} lowIncomeMonthMessage={null} lang="zh" t={t} />);
  expect(screen.getByText(t('insight_card_no_goal'))).toBeInTheDocument();
});

test('does not render a low-income section when lowIncomeMonthMessage is not provided', () => {
  render(<InsightCard achievementLabel="62%" achievementPercent={0.62} lowIncomeMonthMessage={null} lang="zh" t={t} />);
  expect(screen.queryByTestId('insight-low-income')).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd etf_react_server && pnpm --filter dividend-life test --runTestsByPath tests/InsightCard.test.jsx`
Expected: FAIL with "Cannot find module '../src/components/InsightCard'"

- [ ] **Step 3: Add i18n keys**

Insert after `  zh: {`:

```js
    insight_card_title: '年度進度',
    insight_card_no_goal: '尚未設定年度目標',
```

Insert after `  en: {`:

```js
    insight_card_title: 'Annual Progress',
    insight_card_no_goal: 'No annual goal set yet',
```

- [ ] **Step 4: Write minimal implementation**

```jsx
// apps/dividend-life/src/components/InsightCard.jsx
import styles from './InsightCard.module.css';

export default function InsightCard({ achievementLabel, lowIncomeMonthMessage, t }) {
  return (
    <section className={styles.card} aria-label={t('insight_card_title')}>
      <h3 className={styles.title}>{t('insight_card_title')}</h3>
      {achievementLabel === null ? (
        <p className={styles.empty}>{t('insight_card_no_goal')}</p>
      ) : (
        <p className={styles.achievement}>{achievementLabel}</p>
      )}
      {lowIncomeMonthMessage && (
        <p className={styles.lowIncome} data-testid="insight-low-income">{lowIncomeMonthMessage}</p>
      )}
    </section>
  );
}
```

```css
/* apps/dividend-life/src/components/InsightCard.module.css */
.card {
  padding: 20px 24px;
  border-radius: var(--radius-card, 18px);
  background: var(--surface, #fff);
  border: 1px solid var(--border, #e4dcc8);
}

.title {
  margin: 0 0 12px;
  font-size: 16px;
}

.achievement {
  font-size: 28px;
  font-variant-numeric: tabular-nums;
  margin: 0;
  color: var(--gold, #a9813b);
}

.empty {
  color: var(--muted, #948a72);
  margin: 0;
}

.lowIncome {
  margin: 8px 0 0;
  font-size: 13px;
  color: var(--terracotta, #be6a4c);
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd etf_react_server && pnpm --filter dividend-life test --runTestsByPath tests/InsightCard.test.jsx`
Expected: PASS (3 tests)

- [ ] **Step 6: Commit**

```bash
cd etf_react_server
git add apps/dividend-life/src/components/InsightCard.jsx apps/dividend-life/src/components/InsightCard.module.css apps/dividend-life/src/i18n.js apps/dividend-life/tests/InsightCard.test.jsx
git commit -m "feat(dividend-life): add InsightCard component (annual achievement, low-income deferred to P1)"
```

---

### Task 12: `EmptyPortfolioState` component

主規格書 §6.2 無資料狀態。**範圍澄清**：`onCtaClick` 為可選 prop；若未提供（`HomeTab.jsx` 目前沒有從 `DividendLifePage.jsx` 收到切換分頁的 callback，接線需要改動本次規格範圍外的檔案），CTA 降級為純文字提示而非按鈕，仍滿足「不要用一排 `NT$0.00`」與提供指引文字的要求。

**Files:**
- Create: `apps/dividend-life/src/components/EmptyPortfolioState.jsx`
- Create: `apps/dividend-life/src/components/EmptyPortfolioState.module.css`
- Modify: `apps/dividend-life/src/i18n.js` (same insertion points)
- Test: `apps/dividend-life/tests/EmptyPortfolioState.test.jsx`

**Interfaces:**
- Produces: `<EmptyPortfolioState onCtaClick={function?} lang t />`. Default export.

- [ ] **Step 1: Write the failing test**

```jsx
// apps/dividend-life/tests/EmptyPortfolioState.test.jsx
/* eslint-env jest */
import { render, screen, fireEvent } from '@testing-library/react';
import EmptyPortfolioState from '../src/components/EmptyPortfolioState';
import { translations } from '../src/i18n';

const t = (key) => translations.zh[key] || key;

test('renders guidance text without a 0.00 amount', () => {
  render(<EmptyPortfolioState lang="zh" t={t} />);
  expect(screen.getByText(t('empty_portfolio_title'))).toBeInTheDocument();
  expect(screen.queryByText(/0\.00/)).not.toBeInTheDocument();
});

test('renders a clickable CTA when onCtaClick is provided', () => {
  const onCtaClick = jest.fn();
  render(<EmptyPortfolioState onCtaClick={onCtaClick} lang="zh" t={t} />);
  fireEvent.click(screen.getByText(t('empty_portfolio_cta')));
  expect(onCtaClick).toHaveBeenCalled();
});

test('renders the CTA text as non-interactive when onCtaClick is not provided', () => {
  render(<EmptyPortfolioState lang="zh" t={t} />);
  expect(screen.queryByRole('button', { name: t('empty_portfolio_cta') })).not.toBeInTheDocument();
  expect(screen.getByText(t('empty_portfolio_cta'))).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd etf_react_server && pnpm --filter dividend-life test --runTestsByPath tests/EmptyPortfolioState.test.jsx`
Expected: FAIL with "Cannot find module '../src/components/EmptyPortfolioState'"

- [ ] **Step 3: Add i18n keys**

Insert after `  zh: {`:

```js
    empty_portfolio_title: '還沒有任何持股紀錄',
    empty_portfolio_description: '新增你的第一筆交易，開始追蹤配息現金流。',
    empty_portfolio_cta: '前往新增持股',
```

Insert after `  en: {`:

```js
    empty_portfolio_title: 'No holdings yet',
    empty_portfolio_description: 'Add your first transaction to start tracking dividend cashflow.',
    empty_portfolio_cta: 'Go add a holding',
```

- [ ] **Step 4: Write minimal implementation**

```jsx
// apps/dividend-life/src/components/EmptyPortfolioState.jsx
import styles from './EmptyPortfolioState.module.css';

export default function EmptyPortfolioState({ onCtaClick, t }) {
  return (
    <section className={styles.card}>
      <h3 className={styles.title}>{t('empty_portfolio_title')}</h3>
      <p className={styles.description}>{t('empty_portfolio_description')}</p>
      {onCtaClick ? (
        <button type="button" className={styles.ctaButton} onClick={onCtaClick}>
          {t('empty_portfolio_cta')}
        </button>
      ) : (
        <p className={styles.ctaText}>{t('empty_portfolio_cta')}</p>
      )}
    </section>
  );
}
```

```css
/* apps/dividend-life/src/components/EmptyPortfolioState.module.css */
.card {
  padding: 32px 24px;
  border-radius: var(--radius-card, 18px);
  background: var(--surface-2, #fbf6ec);
  text-align: center;
}

.title {
  margin: 0 0 8px;
  font-family: var(--font-display, serif);
}

.description {
  color: var(--ink-soft, #55503f);
  margin: 0 0 16px;
}

.ctaButton {
  background: var(--sage, #6e8062);
  color: #fff;
  border: none;
  border-radius: var(--radius-control, 10px);
  padding: 10px 20px;
  cursor: pointer;
}

.ctaText {
  color: var(--sage, #6e8062);
  font-weight: 600;
  margin: 0;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd etf_react_server && pnpm --filter dividend-life test --runTestsByPath tests/EmptyPortfolioState.test.jsx`
Expected: PASS (3 tests)

- [ ] **Step 6: Commit**

```bash
cd etf_react_server
git add apps/dividend-life/src/components/EmptyPortfolioState.jsx apps/dividend-life/src/components/EmptyPortfolioState.module.css apps/dividend-life/src/i18n.js apps/dividend-life/tests/EmptyPortfolioState.test.jsx
git commit -m "feat(dividend-life): add EmptyPortfolioState component for HomeTab Phase 2"
```

---

### Task 13: `DemoModeBanner` stub component

主規格書 §6.2 附帶概念，Phase 5 才啟用。Phase 2 只建立元件殼與 prop 介面，不接入任何邏輯、不在 `HomeTab.jsx` 掛載。

**Files:**
- Create: `apps/dividend-life/src/components/DemoModeBanner.jsx`
- Create: `apps/dividend-life/src/components/DemoModeBanner.module.css`
- Modify: `apps/dividend-life/src/i18n.js` (same insertion points)
- Test: `apps/dividend-life/tests/DemoModeBanner.test.jsx`

**Interfaces:**
- Produces: `<DemoModeBanner isVisible={bool} onExit={function} t />`. Default export. Renders `null` when `isVisible` is falsy.

- [ ] **Step 1: Write the failing test**

```jsx
// apps/dividend-life/tests/DemoModeBanner.test.jsx
/* eslint-env jest */
import { render, screen, fireEvent } from '@testing-library/react';
import DemoModeBanner from '../src/components/DemoModeBanner';
import { translations } from '../src/i18n';

const t = (key) => translations.zh[key] || key;

test('renders nothing when isVisible is false', () => {
  const { container } = render(<DemoModeBanner isVisible={false} onExit={() => {}} t={t} />);
  expect(container).toBeEmptyDOMElement();
});

test('renders the banner and exit button when isVisible is true', () => {
  const onExit = jest.fn();
  render(<DemoModeBanner isVisible onExit={onExit} t={t} />);
  expect(screen.getByText(t('demo_mode_banner_text'))).toBeInTheDocument();
  fireEvent.click(screen.getByText(t('demo_mode_banner_exit')));
  expect(onExit).toHaveBeenCalled();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd etf_react_server && pnpm --filter dividend-life test --runTestsByPath tests/DemoModeBanner.test.jsx`
Expected: FAIL with "Cannot find module '../src/components/DemoModeBanner'"

- [ ] **Step 3: Add i18n keys**

Insert after `  zh: {`:

```js
    demo_mode_banner_text: '目前顯示示範資料',
    demo_mode_banner_exit: '結束示範／回到我的資料',
```

Insert after `  en: {`:

```js
    demo_mode_banner_text: 'Showing demo data',
    demo_mode_banner_exit: 'Exit demo / back to my data',
```

- [ ] **Step 4: Write minimal implementation**

```jsx
// apps/dividend-life/src/components/DemoModeBanner.jsx
import styles from './DemoModeBanner.module.css';

export default function DemoModeBanner({ isVisible, onExit, t }) {
  if (!isVisible) return null;
  return (
    <div className={styles.banner} role="status">
      <span>{t('demo_mode_banner_text')}</span>
      <button type="button" className={styles.exitButton} onClick={onExit}>
        {t('demo_mode_banner_exit')}
      </button>
    </div>
  );
}
```

```css
/* apps/dividend-life/src/components/DemoModeBanner.module.css */
.banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  border-radius: var(--radius-control, 10px);
  background: var(--gold-soft, #efe0be);
  color: var(--ink, #2d2a22);
}

.exitButton {
  background: transparent;
  border: 1px solid currentColor;
  border-radius: var(--radius-control, 10px);
  padding: 4px 12px;
  cursor: pointer;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd etf_react_server && pnpm --filter dividend-life test --runTestsByPath tests/DemoModeBanner.test.jsx`
Expected: PASS (2 tests)

- [ ] **Step 6: Commit**

```bash
cd etf_react_server
git add apps/dividend-life/src/components/DemoModeBanner.jsx apps/dividend-life/src/components/DemoModeBanner.module.css apps/dividend-life/src/i18n.js apps/dividend-life/tests/DemoModeBanner.test.jsx
git commit -m "feat(dividend-life): add DemoModeBanner stub component (unwired, P5)"
```

---

### Task 14: Wire everything into `HomeTab.jsx`

把 Task 1–12 的元件（Task 13 的 `DemoModeBanner` 依設計不掛載）接進 `HomeTab.jsx`，插在既有四個 tier 之上；現有四個 tier 的 JSX 完全不改內容，只整段往下移。

**Files:**
- Modify: `apps/dividend-life/src/HomeTab.jsx`
- Modify: `apps/dividend-life/tests/HomeTab.test.jsx` (add new coverage; keep every existing test passing unchanged)

**Interfaces:**
- Consumes every export from Tasks 1–5 (`formatTwd`/`formatMissingValue`, `loadLivingCost`/`saveLivingCost`, `calculateCoverage`, `getNextAnnouncedPayment`, `calculateFutureCashflow`) and every component from Tasks 6–12.

- [ ] **Step 1: Write failing tests for the new HomeTab sections**

Append to `apps/dividend-life/tests/HomeTab.test.jsx` (keep every existing test in the file unchanged):

```jsx
test('shows the empty portfolio state when there are no holdings', async () => {
  renderWithLang();
  expect(await screen.findByText(translations.zh.empty_portfolio_title)).toBeInTheDocument();
});

test('shows the coverage setup CTA when living cost is not set', async () => {
  localStorage.setItem(
    'my_transaction_history',
    JSON.stringify([{ stock_id: '0050', date: '2023-01-01', type: 'buy', quantity: 1000 }])
  );
  renderWithLang();
  expect(await screen.findByText(translations.zh.coverage_living_cost_cta)).toBeInTheDocument();
});

test('shows the next payment empty message when no payment is announced', async () => {
  localStorage.setItem(
    'my_transaction_history',
    JSON.stringify([{ stock_id: '0050', date: '2023-01-01', type: 'buy', quantity: 1000 }])
  );
  renderWithLang();
  expect(await screen.findByText(translations.zh.next_payment_empty)).toBeInTheDocument();
});

test('still renders the existing investment goals card below the new Phase 2 content', async () => {
  renderWithLang();
  await screen.findByText(translations.zh.empty_portfolio_title);
  expect(await screen.findByText(translations.zh.investment_goals)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `cd etf_react_server && pnpm --filter dividend-life test --runTestsByPath tests/HomeTab.test.jsx`
Expected: the 4 new tests FAIL (new text not rendered yet); the pre-existing tests in the file still PASS.

- [ ] **Step 3: Wire the new pieces into `HomeTab.jsx`**

Add imports at the top of `apps/dividend-life/src/HomeTab.jsx` (after the existing `useStorageListener` import on line 20):

```js
import { loadLivingCost } from './utils/livingCostStorage';
import { calculateCoverage } from './utils/coverageUtils';
import { getNextAnnouncedPayment } from './utils/nextPaymentUtils';
import { calculateFutureCashflow } from './utils/futureCashflowUtils';
import SummaryHero from './components/SummaryHero';
import MonthlyIncomeCard from './components/MonthlyIncomeCard';
import CoverageProgress from './components/CoverageProgress';
import NextPaymentCard from './components/NextPaymentCard';
import CashflowChart from './components/CashflowChart';
import InsightCard from './components/InsightCard';
import EmptyPortfolioState from './components/EmptyPortfolioState';
```

Add state and derived values inside `HomeTab`, right after the existing `const [dividendExclusions, ...]` line (around line 235, before `const { t, lang } = useLanguage();`):

```js
  const [monthlyLivingCost, setMonthlyLivingCost] = useState(() => loadLivingCost());
```

After the existing `dividendSummary` `useMemo` block (right after it closes, before `const goalMessages = ...`), add:

```js
  const coverage = useMemo(
    () => calculateCoverage({
      dividendData,
      inventoryList: goalSummary.inventoryList,
      monthlyLivingCost
    }),
    [dividendData, goalSummary.inventoryList, monthlyLivingCost]
  );

  const nextPayment = useMemo(
    () => getNextAnnouncedPayment(dividendData, transactionHistory),
    [dividendData, transactionHistory]
  );

  const futureCashflow = useMemo(
    () => calculateFutureCashflow({
      dividendData,
      inventoryList: goalSummary.inventoryList,
      baseCurrency: dividendSummary.baseCurrency,
      monthlyLivingCost
    }),
    [dividendData, goalSummary.inventoryList, dividendSummary.baseCurrency, monthlyLivingCost]
  );

  const hasHoldings = goalSummary.inventoryList.length > 0;
  const currentMonthLabel = useMemo(() => {
    const formatter = new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'zh-TW', { month: 'long' });
    return formatter.format(new Date());
  }, [lang]);

  const achievementMetric = Array.isArray(goalMetrics)
    ? goalMetrics.find((metric) => metric.id === 'achievement')
    : null;
```

Note: `achievementMetric` must be added after `goalMetrics` is computed (after the existing `buildDividendGoalViewModel` `useMemo` block), not before — place that one line directly after that block instead of grouping it with the others above.

Replace the opening of the returned JSX — find:

```jsx
  return (
    <div className="dashboard-container">

      {/* ═══ TIER 1: INCOME HERO ═══ */}
```

Replace with:

```jsx
  return (
    <div className="dashboard-container">

      {/* ═══ PHASE 2 P0: TOTAL OVERVIEW ═══ */}
      {!hasHoldings ? (
        <EmptyPortfolioState lang={lang} t={t} />
      ) : (
        <>
          <SummaryHero
            monthLabel={currentMonthLabel}
            twScheduled={coverage.twScheduled}
            coveragePercent={coverage.coveragePercent}
            lang={lang}
            t={t}
          />
          <MonthlyIncomeCard
            twScheduled={coverage.twScheduled}
            twReceived={coverage.twReceived}
            twPending={coverage.twPending}
            hasUsAmount={coverage.hasUsAmount}
            usScheduled={coverage.usScheduled}
            lang={lang}
            t={t}
          />
          <CoverageProgress
            monthlyLivingCost={monthlyLivingCost}
            isLivingCostSet={coverage.isLivingCostSet}
            coveragePercent={coverage.coveragePercent}
            twScheduled={coverage.twScheduled}
            hasUsAmount={coverage.hasUsAmount}
            lang={lang}
            t={t}
            onLivingCostSaved={setMonthlyLivingCost}
          />
          <NextPaymentCard nextPayment={nextPayment} lang={lang} t={t} />
          <CashflowChart months={futureCashflow.months} lang={lang} t={t} />
          <InsightCard
            achievementLabel={achievementMetric ? achievementMetric.value : null}
            lowIncomeMonthMessage={null}
            lang={lang}
            t={t}
          />
        </>
      )}

      {/* ═══ TIER 1: INCOME HERO ═══ */}
```

- [ ] **Step 4: Run the HomeTab test file and confirm everything passes**

Run: `cd etf_react_server && pnpm --filter dividend-life test --runTestsByPath tests/HomeTab.test.jsx`
Expected: PASS — all pre-existing tests (from before this task) plus the 4 new ones from Step 1.

- [ ] **Step 5: Run the full dividend-life test suite to confirm no regressions elsewhere**

Run: `cd etf_react_server && pnpm --filter dividend-life test`
Expected: PASS, 0 failures. Pay particular attention to any test file that renders `HomeTab` or `DividendLifePage` indirectly.

- [ ] **Step 6: Run lint, typecheck (if configured), and build**

Run: `cd etf_react_server && pnpm lint && pnpm --filter dividend-life build`
Expected: both succeed with no new errors.

- [ ] **Step 7: Commit**

```bash
cd etf_react_server
git add apps/dividend-life/src/HomeTab.jsx apps/dividend-life/tests/HomeTab.test.jsx
git commit -m "feat(dividend-life): wire Phase 2 P0 overview content into HomeTab above existing tiers"
```

---

## Self-Review Notes

- **Spec coverage:** 每個 §15 Phase 2 bullet 都對應到至少一個 task——有資料／無資料狀態（Task 12、14）、生活費設定（Task 2、8）、覆蓋率／本月配息（Task 3、7、8）、下一筆入帳（Task 4、9）、未來現金流（Task 5、10）、年度進度（Task 11）、單元測試（每個 util/元件 task 都有）。
- **範圍修正記錄：** 美股併入覆蓋率的匯率換算（規劃階段發現 codebase 無此功能）與低收入月提醒（§10.3/§3.1 本就標為 P1）都明確延後，對應元件留 prop 介面不啟用，寫在 Task 8/Task 11 與 Global Constraints 裡，不是遺漏。
- **型別一致性檢查：** `dividendData`/`inventoryList` 的欄位命名（`stock_id`、`total_quantity`、`dividend`、`payment_date`、`currency`）在 Task 3、4、5、14 全部一致；`coverage`/`futureCashflow` 的回傳欄位名稱在 Task 14 wiring 與 Task 3/5 的定義逐一核對過，沒有 `twAmount` vs `twScheduled` 這類命名不一致的殘留。
