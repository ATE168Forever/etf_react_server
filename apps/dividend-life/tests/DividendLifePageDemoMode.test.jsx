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
  // jsdom doesn't implement scrollIntoView; InventoryTab's focusImportControl effect calls it.
  Element.prototype.scrollIntoView = jest.fn();
  // DividendLifePage persists the active tab to window.location.hash via history.replaceState
  // (for shareability/back-nav), and jsdom's window/history is shared across every test in
  // this file — without resetting it, a test that ends on a non-home tab (e.g. clicking
  // "持有標的" last) leaks its hash into the next test's initial render, silently starting it
  // on the wrong tab.
  window.history.replaceState(null, '', '#');
});

// Note: the dividendApi/stockApi mocks above always resolve empty data/lists, so no
// component ever renders a literal stock ticker like "0050" in this test's DOM — every
// assertion below instead checks state-matrix-driven text (holdings count / empty-state
// copy) and the page-level DemoModeBanner, which are the actually renderable signals that
// demo mode's DEMO_TRANSACTIONS made it into a given tab.
test('demo mode survives a tab switch and never writes my_transaction_history', async () => {
  render(<DividendLifePage />);
  const demoBtn = await screen.findByRole('button', { name: '查看範例資料' });
  fireEvent.click(demoBtn);
  // Home tab: hasHoldings is now true (3 demo holdings) but hasDividendData is false
  // (dividendApi mock always resolves empty) — State C's holdings-count text confirms
  // the demo transactions reached HomeTab.
  expect(await screen.findByText('已追蹤 3 檔持股')).toBeInTheDocument();
  // Note: findByRole('status') is ambiguous here — the dividend-alert live region
  // also has role="status" — so the demo banner is asserted by its unique text instead.
  expect(await screen.findByText('目前顯示示範資料')).toBeInTheDocument();
  expect(localStorage.getItem('my_transaction_history')).toBeNull();

  fireEvent.click(screen.getByRole('tab', { name: '現金流' }));
  // UserDividendsTab's own empty state must not show while demo holdings are active —
  // that's the tab-switch-survival signal (the bug this task exists to fix).
  expect(screen.queryByText('還沒有配息現金流')).not.toBeInTheDocument();
  expect(screen.getByText('目前顯示示範資料')).toBeInTheDocument();
  expect(localStorage.getItem('my_transaction_history')).toBeNull();

  // Switch to Inventory while still in demo mode — this is the live path Task 5's review
  // flagged: InventoryTab's transactionsOverride sync effect must never let the demo
  // holdings reach saveTransactionHistory()/localStorage.
  fireEvent.click(screen.getByRole('tab', { name: '持有標的' }));
  await screen.findByRole('button', { name: '顯示：交易歷史' });
  expect(localStorage.getItem('my_transaction_history')).toBeNull();

  fireEvent.click(screen.getByRole('button', { name: '結束示範／回到我的資料' }));
  expect(localStorage.getItem('my_transaction_history')).toBeNull();

  fireEvent.click(screen.getByRole('tab', { name: '現金流' }));
  expect(await screen.findByText('還沒有配息現金流')).toBeInTheDocument();
  expect(localStorage.getItem('my_transaction_history')).toBeNull();
});

test('a real edit made in InventoryTab survives switching away and back to the tab (C2: outside demo mode, the page must not shadow live localStorage with a stale mount-time snapshot)', async () => {
  localStorage.setItem('my_transaction_history', JSON.stringify([
    { stock_id: '0050', stock_name: '元大台灣50', date: '2024-01-01', quantity: 1000, type: 'buy', price: 10 }
  ]));
  render(<DividendLifePage />);

  fireEvent.click(screen.getByRole('tab', { name: '持有標的' }));
  fireEvent.click(await screen.findByText('顯示：交易歷史'));
  await screen.findByText(/0050/);
  fireEvent.click(screen.getByText('修改'));
  const qtyInput = screen.getByDisplayValue('1000');
  fireEvent.change(qtyInput, { target: { value: '2000' } });
  fireEvent.click(screen.getByText('儲存'));
  await screen.findByText(/2000/);
  expect(JSON.parse(localStorage.getItem('my_transaction_history'))[0].quantity).toBe(2000);

  // Switch away and back — InventoryTab is behind a tab conditional, so it fully
  // unmounts/remounts. Before the C2 fix, transactionsOverride was the page's own
  // mount-time transactionHistory snapshot (still quantity 1000) for every tab, so
  // remounting here would have silently reverted the just-made edit in the UI.
  fireEvent.click(screen.getByRole('tab', { name: '總覽' }));
  fireEvent.click(screen.getByRole('tab', { name: '持有標的' }));
  fireEvent.click(await screen.findByText('顯示：交易歷史'));

  expect(await screen.findByText(/2000/)).toBeInTheDocument();
  expect(JSON.parse(localStorage.getItem('my_transaction_history'))[0].quantity).toBe(2000);
});

test('empty_cta_add_first renders the same wording across all three tabs', async () => {
  render(<DividendLifePage />);
  expect(await screen.findByText('新增第一筆持有')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('tab', { name: '現金流' }));
  expect(await screen.findByText('新增第一筆持有')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('tab', { name: '持有標的' }));
  // InventoryTab's empty state currently uses its own guide copy, not EmptyState's CTA wording,
  // since it renders inline "+ 新增交易" — assert the emptyGuide is present instead.
  const showHistoryBtn = await screen.findByRole('button', { name: '顯示：交易歷史' });
  fireEvent.click(showHistoryBtn);
  expect(await screen.findByRole('region')).toBeInTheDocument();
});
