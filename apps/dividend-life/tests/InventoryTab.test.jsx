/* eslint-env jest */
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import Cookies from 'js-cookie';
import InventoryTab from '../src/InventoryTab';
import { fetchWithCache } from '../src/api';
import { fetchStockList } from '../src/stockApi';

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

});
