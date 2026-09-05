/* eslint-env jest */
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import Cookies from 'js-cookie';
import InventoryTab from '../src/InventoryTab';
import { fetchWithCache } from '../src/api';
import { fetchStockList } from '../src/stockApi';
import { getTransactionHistoryUpdatedAt } from '../src/utils/transactionStorage';

jest.mock('../src/api');
jest.mock('../src/stockApi', () => ({
  fetchStockList: jest.fn(() => Promise.resolve({ list: [], meta: null }))
}));
jest.mock('../config', () => ({
  API_HOST: 'http://localhost'
}));

describe('InventoryTab interactions', () => {
  const currentYear = new Date().getFullYear();
  const previousYear = currentYear - 1;

  beforeEach(() => {
    localStorage.clear();
    Cookies.remove('my_transaction_history');
    Cookies.remove('inventory_last_backup');
    // jsdom does not implement scrollIntoView; InventoryTab's focus-import effect calls it.
    window.HTMLElement.prototype.scrollIntoView = jest.fn();
    fetchStockList.mockReset();
    fetchWithCache.mockImplementation((url) => {
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
          return Promise.resolve({ data: [{ stock_id: '0050', dividend_date: '2024-01-02', last_close_price: 20 }] });
        }
      }
      return Promise.resolve({ data: [] });
    });
    fetchStockList.mockResolvedValue({
      list: [{ stock_id: '0050', stock_name: 'Test ETF', dividend_frequency: 1, country: 'TW' }],
      meta: { cacheStatus: 'fresh', timestamp: new Date().toISOString() }
    });
  });

  test('opens add transaction modal', async () => {
    render(<InventoryTab />);
    const openBtn = await screen.findByRole('button', { name: '新增購買' });
    fireEvent.click(openBtn);
    await screen.findByRole('heading', { name: '新增購買紀錄' });
  });

  test('renders investment goal section with inputs', async () => {
    render(<InventoryTab />);
    expect(await screen.findByText('預期的股息目標')).toBeInTheDocument();
    expect(screen.getByText('累積股息')).toBeInTheDocument();
    expect(screen.queryByLabelText('幫目標取個名字')).not.toBeInTheDocument();
    const toggle = screen.getByRole('button', { name: '設定或更新目標' });
    fireEvent.click(toggle);
    expect(screen.getByLabelText('幫目標取個名字')).toBeInTheDocument();
    expect(screen.getByText('還沒有設定現金流目標，按「新增現金流目標」開始。')).toBeInTheDocument();
    const addCashflowButton = screen.getByRole('button', { name: '新增現金流目標' });
    fireEvent.click(addCashflowButton);
    const goalTypeSelect = screen.getByLabelText('選擇目標類型');
    expect(goalTypeSelect).toHaveValue('annual');
    const currencySelect = screen.getByLabelText('目標幣別');
    expect(currencySelect).toHaveValue('TWD');
    expect(screen.getByPlaceholderText('例：50000')).toBeInTheDocument();
    fireEvent.change(goalTypeSelect, { target: { value: 'minimum' } });
    expect(screen.getByPlaceholderText('例：5000')).toBeInTheDocument();
  });

  test('allows adding share accumulation goals', async () => {
    render(<InventoryTab />);
    const toggle = await screen.findByRole('button', { name: '設定或更新目標' });
    fireEvent.click(toggle);

    const codeInput = screen.getByLabelText('股票代碼 / 名稱');
    fireEvent.change(codeInput, { target: { value: '0056' } });
    fireEvent.keyDown(codeInput, { key: 'Enter', code: 'Enter', charCode: 13 });
    const lotsInput = screen.getByPlaceholderText('例：100');
    fireEvent.change(lotsInput, { target: { value: '100' } });
    fireEvent.click(screen.getByRole('button', { name: '新增存股目標' }));

    fireEvent.click(screen.getByRole('button', { name: '儲存' }));

    await screen.findByText('目標張數：100 張');
    const saved = JSON.parse(localStorage.getItem('investment_goals'));
    expect(saved.goalType).toBe('shares');
    expect(saved.cashflowGoals).toEqual([]);
    expect(saved.shareTargets).toEqual([
      { stockId: '0056', stockName: '', targetQuantity: 100 }
    ]);
  });

  test('displays total investment amount and value', async () => {
    localStorage.setItem('my_transaction_history', JSON.stringify([
      { stock_id: '0050', date: '2024-01-01', quantity: 1000, type: 'buy', price: 10 }
    ]));
    render(<InventoryTab stockListPriceMap={{ '0050': 20 }} />);
    await screen.findByText('顯示：交易歷史');
    await screen.findByText('預期的股息目標');
    expect(await screen.findByText('總投資金額：10,000.00')).toBeInTheDocument();
    expect(await screen.findByText('目前總價值：20,000.00')).toBeInTheDocument();
  });

  test('omits lot information for US ETF holdings', async () => {
    localStorage.setItem('my_transaction_history', JSON.stringify([
      { stock_id: 'VOO', date: '2024-01-01', quantity: 10, type: 'buy', price: 1 }
    ]));
    fetchStockList.mockResolvedValue({
      list: [
        { stock_id: 'VOO', stock_name: 'Vanguard S&P 500', dividend_frequency: '季配', country: 'US' }
      ],
      meta: { cacheStatus: 'fresh', timestamp: new Date().toISOString() }
    });

    render(<InventoryTab />);

    const link = await screen.findByRole('link', { name: /VOO Vanguard S&P 500/ });
    const row = link.closest('tr');
    expect(row).not.toBeNull();
    const cells = row.querySelectorAll('td');
    expect(cells[3].textContent).toContain('10');
    expect(cells[3].textContent).not.toMatch(/張/);
    expect(cells[3].textContent).not.toMatch(/lots/i);
  });

  test('edits existing transaction', async () => {
    localStorage.setItem('my_transaction_history', JSON.stringify([
      { stock_id: '0050', date: '2024-01-01', quantity: 1000, type: 'buy', price: 10 }
    ]));
    render(<InventoryTab />);
    await waitFor(() => screen.getByText('顯示：交易歷史'));
    fireEvent.click(screen.getByText('顯示：交易歷史'));
    await screen.findByText(/0050/);
    fireEvent.click(screen.getByText('修改'));
    const qtyInput = screen.getByDisplayValue('1000');
    fireEvent.change(qtyInput, { target: { value: '2000' } });
    fireEvent.click(screen.getByText('儲存'));
    await screen.findByText(/2000/);
    const saved = JSON.parse(localStorage.getItem('my_transaction_history'));
    expect(saved[0].quantity).toBe(2000);
  });

  test('inventory table shows stocks sorted by code ascending by default', async () => {
    localStorage.setItem('my_transaction_history', JSON.stringify([
      { stock_id: '0056', date: '2024-01-01', quantity: 1000, type: 'buy', price: 10 },
      { stock_id: '0050', date: '2024-01-01', quantity: 1000, type: 'buy', price: 10 },
      { stock_id: '00878', date: '2024-01-01', quantity: 1000, type: 'buy', price: 10 },
    ]));
    fetchStockList.mockResolvedValue({
      list: [
        { stock_id: '0050', stock_name: 'ETF A', dividend_frequency: 1, country: 'TW' },
        { stock_id: '0056', stock_name: 'ETF B', dividend_frequency: 1, country: 'TW' },
        { stock_id: '00878', stock_name: 'ETF C', dividend_frequency: 1, country: 'TW' },
      ],
      meta: null
    });
    render(<InventoryTab />);
    await screen.findByText('顯示：交易歷史');
    const table = screen.getByRole('table', { name: '目前庫存' });
    const rows = within(table).getAllByRole('row');
    expect(rows[1]).toHaveTextContent('0050');
    expect(rows[2]).toHaveTextContent('0056');
    expect(rows[3]).toHaveTextContent('00878');
  });

  test('inventory table toggles to descending when stock code header is clicked', async () => {
    localStorage.setItem('my_transaction_history', JSON.stringify([
      { stock_id: '0056', date: '2024-01-01', quantity: 1000, type: 'buy', price: 10 },
      { stock_id: '0050', date: '2024-01-01', quantity: 1000, type: 'buy', price: 10 },
      { stock_id: '00878', date: '2024-01-01', quantity: 1000, type: 'buy', price: 10 },
    ]));
    fetchStockList.mockResolvedValue({
      list: [
        { stock_id: '0050', stock_name: 'ETF A', dividend_frequency: 1, country: 'TW' },
        { stock_id: '0056', stock_name: 'ETF B', dividend_frequency: 1, country: 'TW' },
        { stock_id: '00878', stock_name: 'ETF C', dividend_frequency: 1, country: 'TW' },
      ],
      meta: null
    });
    render(<InventoryTab />);
    await screen.findByText('顯示：交易歷史');
    fireEvent.click(screen.getByRole('button', { name: /依股票代碼排序/ }));
    const table = screen.getByRole('table', { name: '目前庫存' });
    const rows = within(table).getAllByRole('row');
    expect(rows[1]).toHaveTextContent('00878');
    expect(rows[2]).toHaveTextContent('0056');
    expect(rows[3]).toHaveTextContent('0050');
  });

  test('transaction history table defaults to date descending', async () => {
    localStorage.setItem('my_transaction_history', JSON.stringify([
      { stock_id: '0050', date: '2024-01-15', quantity: 1000, type: 'buy', price: 10 },
      { stock_id: '0050', date: '2024-03-01', quantity: 1000, type: 'buy', price: 10 },
      { stock_id: '0050', date: '2024-02-10', quantity: 1000, type: 'buy', price: 10 },
    ]));
    render(<InventoryTab />);
    await screen.findByText('顯示：交易歷史');
    fireEvent.click(screen.getByText('顯示：交易歷史'));
    const table = await screen.findByRole('table', { name: '交易紀錄' });
    const rows = within(table).getAllByRole('row');
    expect(rows[1]).toHaveTextContent('2024-03-01');
    expect(rows[2]).toHaveTextContent('2024-02-10');
    expect(rows[3]).toHaveTextContent('2024-01-15');
  });

  test('transaction history table sorts ascending when date header is clicked', async () => {
    localStorage.setItem('my_transaction_history', JSON.stringify([
      { stock_id: '0050', date: '2024-01-15', quantity: 1000, type: 'buy', price: 10 },
      { stock_id: '0050', date: '2024-03-01', quantity: 1000, type: 'buy', price: 10 },
      { stock_id: '0050', date: '2024-02-10', quantity: 1000, type: 'buy', price: 10 },
    ]));
    render(<InventoryTab />);
    await screen.findByText('顯示：交易歷史');
    fireEvent.click(screen.getByText('顯示：交易歷史'));
    await screen.findByRole('table', { name: '交易紀錄' });
    fireEvent.click(screen.getByRole('button', { name: /依交易日期排序/ }));
    const table = screen.getByRole('table', { name: '交易紀錄' });
    const rows = within(table).getAllByRole('row');
    expect(rows[1]).toHaveTextContent('2024-01-15');
    expect(rows[2]).toHaveTextContent('2024-02-10');
    expect(rows[3]).toHaveTextContent('2024-03-01');
  });

  test('renders saved custom goal name', async () => {
    localStorage.setItem('investment_goals', JSON.stringify({
      goalName: '退休旅遊基金',
      totalTarget: 360000,
      monthlyTarget: 30000
    }));
    render(<InventoryTab />);
    expect(await screen.findByText('退休旅遊基金')).toBeInTheDocument();
  });

  test('empty state: TransactionHistoryTable is absent, emptyGuide is present', async () => {
    render(<InventoryTab />);
    // InventoryTab defaults to the inventory-list view (showInventory=true); the
    // TransactionHistoryTable lives behind the "顯示：交易歷史" (msg.showHistory) toggle.
    const showHistoryBtn = await screen.findByRole('button', { name: '顯示：交易歷史' });
    fireEvent.click(showHistoryBtn);
    expect(await screen.findByRole('region', { name: '開始記錄你的投資組合' })).toBeInTheDocument();
    expect(screen.queryByRole('table', { name: /目前庫存|交易紀錄/ })).not.toBeInTheDocument();
  });

  test('a genuine edit after mounting with transactionsOverride still stamps updatedAt (skipTimestampRef must not stick)', async () => {
    // Keep stockList empty so the unrelated name-enrichment effect (keyed off
    // stockList) never runs its own body and can't incidentally reset
    // skipTimestampRef on our behalf — isolating the transactionsOverride-sync
    // effect's own responsibility for correctly releasing the ref.
    fetchStockList.mockResolvedValue({ list: [], meta: null });
    const override = [
      { stock_id: '0050', stock_name: 'Test ETF', date: '2024-01-01', quantity: 1000, type: 'buy', price: 10 }
    ];
    render(<InventoryTab transactionsOverride={override} />);
    await waitFor(() => screen.getByText('顯示：交易歷史'));
    fireEvent.click(screen.getByText('顯示：交易歷史'));
    await screen.findByText(/0050/);
    fireEvent.click(screen.getByText('修改'));
    const qtyInput = screen.getByDisplayValue('1000');
    fireEvent.change(qtyInput, { target: { value: '2000' } });
    fireEvent.click(screen.getByText('儲存'));
    await screen.findByText(/2000/);
    // If the transactionsOverride-sync effect left skipTimestampRef stuck at `true`,
    // this genuine edit would be silently treated as a system change and the
    // updated-at timestamp would never be written (corrupting Drive sync comparisons).
    expect(getTransactionHistoryUpdatedAt()).toEqual(expect.any(Number));
  });

  test('demo mode blocks an edit from ever reaching saveTransactionHistory/localStorage (C1)', async () => {
    // Reviewer-flagged Critical finding: an edit handler builds a NEW array from the
    // override (e.g. an updated copy of the demo row), which the persistence effect's
    // referential-equality guard alone cannot catch — isDemoMode must block the handler
    // itself, before any setTransactionHistory/saveTransactionHistory call happens.
    fetchStockList.mockResolvedValue({ list: [], meta: null });
    const demoRow = [
      { stock_id: '0050', stock_name: '元大台灣50', date: '2025-02-10', type: 'buy', quantity: 1000, price: 130 }
    ];
    render(<InventoryTab transactionsOverride={demoRow} isDemoMode />);
    await waitFor(() => screen.getByText('顯示：交易歷史'));
    // Confirm nothing was written just from mounting with a demo override active.
    expect(localStorage.getItem('my_transaction_history')).toBeNull();

    fireEvent.click(screen.getByText('顯示：交易歷史'));
    await screen.findByText(/0050/);
    fireEvent.click(screen.getByText('修改'));
    const qtyInput = screen.getByDisplayValue('1000');
    fireEvent.change(qtyInput, { target: { value: '2000' } });
    fireEvent.click(screen.getByText('儲存'));

    // The edit must be rejected outright: the demo row is unchanged, and nothing was
    // ever written to localStorage or timestamped.
    expect(screen.queryByText(/2000/)).not.toBeInTheDocument();
    expect(localStorage.getItem('my_transaction_history')).toBeNull();
    expect(getTransactionHistoryUpdatedAt()).toBeNull();
  });

  test('the top-level add/quick-add controls are disabled while isDemoMode is true', async () => {
    const demoRow = [
      { stock_id: '0050', stock_name: '元大台灣50', date: '2025-02-10', type: 'buy', quantity: 1000, price: 130 }
    ];
    render(<InventoryTab transactionsOverride={demoRow} isDemoMode />);
    expect(await screen.findByRole('button', { name: '新增購買' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '快速購買' })).toBeDisabled();
  });

  test('exiting demo mode while InventoryTab stays mounted re-syncs real data without writing to localStorage (C1/C2 exit transition)', async () => {
    // Regression for the fix's own intermediate bug: re-hydrating transactionHistory from
    // real storage after transactionsOverride goes from non-null back to null must be a
    // pure re-hydration, not a write — even when the user has zero real transactions (a
    // brand-new user), which would otherwise seed 'my_transaction_history' to "[]" purely
    // as a side effect of having glanced at demo mode.
    fetchStockList.mockResolvedValue({ list: [], meta: null });
    const demoData = [
      { stock_id: '0050', stock_name: '元大台灣50', date: '2025-02-10', type: 'buy', quantity: 1000, price: 130 }
    ];
    const { rerender } = render(<InventoryTab transactionsOverride={demoData} isDemoMode />);
    await waitFor(() => screen.getByText('顯示：交易歷史'));
    expect(localStorage.getItem('my_transaction_history')).toBeNull();

    // Exit demo: the page passes transactionsOverride=null and isDemoMode=false once
    // demoMode flips off, exactly as DividendLifePage does.
    rerender(<InventoryTab transactionsOverride={null} isDemoMode={false} />);
    fireEvent.click(screen.getByText('顯示：交易歷史'));
    expect(await screen.findByRole('region', { name: '開始記錄你的投資組合' })).toBeInTheDocument();
    expect(localStorage.getItem('my_transaction_history')).toBeNull();
  });

  test('mounting without a transactionsOverride still migrates a legacy cookie-based history (I1)', async () => {
    // Task 6 originally made transactionsOverride non-null for every page-mounted render,
    // which silently made this cookie-migration path (InventoryTab's own
    // migrateTransactionHistory() call in its lazy initializer) unreachable. Confirms it's
    // reachable again now that the page only injects an override during demo mode.
    Cookies.set('my_transaction_history', JSON.stringify([
      { stock_id: '0050', date: '2024-01-01', quantity: 1000, type: 'buy', price: 10 }
    ]));
    render(<InventoryTab />);
    await waitFor(() => screen.getByText('顯示：交易歷史'));
    fireEvent.click(screen.getByText('顯示：交易歷史'));
    await screen.findByText(/0050/);
    const migrated = JSON.parse(localStorage.getItem('my_transaction_history'));
    expect(migrated[0].stock_id).toBe('0050');
  });

  test('focusImportControl scrolls to and focuses the data-access button', async () => {
    const onImportFocusHandled = jest.fn();
    render(<InventoryTab focusImportControl onImportFocusHandled={onImportFocusHandled} />);
    const dataBtn = await screen.findByRole('button', { name: '存取資料' });
    await waitFor(() => expect(dataBtn).toHaveFocus());
    expect(onImportFocusHandled).toHaveBeenCalledTimes(1);
  });

  describe('Finding 1: demo mode must not leak into the real backup-reminder cookie/export', () => {
    // jsdom does not implement Blob URL creation; stub it so a would-be CSV export
    // (which the fix should prevent from ever running in these tests) can't crash
    // the test with an unrelated "not implemented" error instead of failing on the
    // actual assertion below.
    beforeEach(() => {
      if (!URL.createObjectURL) URL.createObjectURL = jest.fn(() => 'blob:mock');
      if (!URL.revokeObjectURL) URL.revokeObjectURL = jest.fn();
    });

    test('does not silently arm the 365-day backup cookie for a first-time user in demo mode', async () => {
      const demoRow = [
        { stock_id: '0050', stock_name: '元大台灣50', date: '2025-02-10', type: 'buy', quantity: 1000, price: 130 }
      ];
      expect(Cookies.get('inventory_last_backup')).toBeUndefined();
      render(<InventoryTab transactionsOverride={demoRow} isDemoMode />);
      await waitFor(() => screen.getByText('顯示：交易歷史'));
      // Give the (buggy, pre-fix) effect a chance to run and write the cookie.
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(Cookies.get('inventory_last_backup')).toBeUndefined();
    });

    test('does not trigger the 30-day backup reminder confirm/export while in demo mode', async () => {
      const oldTimestamp = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString();
      Cookies.set('inventory_last_backup', oldTimestamp, { expires: 365 });
      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
      const demoRow = [
        { stock_id: '0050', stock_name: '元大台灣50', date: '2025-02-10', type: 'buy', quantity: 1000, price: 130 }
      ];
      render(<InventoryTab transactionsOverride={demoRow} isDemoMode />);
      await waitFor(() => screen.getByText('顯示：交易歷史'));
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(confirmSpy).not.toHaveBeenCalled();
      // Cookie must remain exactly as seeded — never reset as if a real backup happened.
      expect(Cookies.get('inventory_last_backup')).toBe(oldTimestamp);
      confirmSpy.mockRestore();
    });

    test('blocks a direct CSV export click during demo mode instead of exporting fabricated rows', async () => {
      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
      const demoRow = [
        { stock_id: '0050', stock_name: '元大台灣50', date: '2025-02-10', type: 'buy', quantity: 1000, price: 130 }
      ];
      render(<InventoryTab transactionsOverride={demoRow} isDemoMode />);
      await waitFor(() => screen.getByText('顯示：交易歷史'));
      fireEvent.click(screen.getByRole('button', { name: '存取資料' }));
      fireEvent.click(screen.getByText('匯出 CSV'));
      expect(Cookies.get('inventory_last_backup')).toBeUndefined();
      confirmSpy.mockRestore();
    });
  });

  test('Finding 5: connectAndSyncDrive does not get stuck on "connecting" when clicked during demo mode', async () => {
    localStorage.setItem('inventory_data_source', 'googleDrive');
    const demoRow = [
      { stock_id: '0050', stock_name: '元大台灣50', date: '2025-02-10', type: 'buy', quantity: 1000, price: 130 }
    ];
    render(<InventoryTab transactionsOverride={demoRow} isDemoMode />);
    await waitFor(() => screen.getByText('顯示：交易歷史'));
    fireEvent.click(screen.getByRole('button', { name: '存取資料' }));
    // On-mount silent Drive auth resolves (isDemoMode blocks it) and settles the
    // dropdown into its "not connected" state, showing the Connect button.
    const connectButton = await screen.findByText('連接 Google Drive');
    fireEvent.click(connectButton);
    // DataDropdown's handleAction closes the menu right after firing the action, so
    // reopen it to inspect the resulting (post-click) Drive status state.
    fireEvent.click(screen.getByRole('button', { name: '存取資料' }));
    // Must never show the permanent "connecting…" spinner with no way out — the
    // Connect button should be reachable again instead.
    await waitFor(() => {
      expect(screen.queryByText('連接中…')).not.toBeInTheDocument();
      expect(screen.getByText('連接 Google Drive')).toBeInTheDocument();
    });
  });

});
