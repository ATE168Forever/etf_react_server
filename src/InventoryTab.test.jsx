/* eslint-env jest */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Cookies from 'js-cookie';
import InventoryTab from './InventoryTab';
import { fetchWithCache } from './api';

jest.mock('./api');
jest.mock('./config', () => ({
  API_HOST: 'http://localhost'
}));

describe('InventoryTab interactions', () => {
  beforeEach(() => {
    localStorage.clear();
    Cookies.remove('my_transaction_history');
    fetchWithCache.mockImplementation((url) => {
      if (url.includes('/get_stock_list')) {
        return Promise.resolve({ data: [{ stock_id: '0050', stock_name: 'Test ETF', dividend_frequency: 1 }] });
      }
      if (url.includes('/get_dividend')) {
        return Promise.resolve({ data: [{ stock_id: '0050', dividend_date: '2024-01-02', last_close_price: 20 }] });
      }
      return Promise.resolve({ data: [] });
    });
  });

  test('opens add transaction modal', async () => {
    render(<InventoryTab />);
    const openBtn = await screen.findByRole('button', { name: '新增購買' });
    fireEvent.click(openBtn);
    await screen.findByRole('heading', { name: '新增購買紀錄' });
  });

  test('displays total investment amount and value', async () => {
    localStorage.setItem('my_transaction_history', JSON.stringify([
      { stock_id: '0050', date: '2024-01-01', quantity: 1000, type: 'buy', price: 10 }
    ]));
    render(<InventoryTab />);
    await screen.findByText('顯示：交易歷史');
    expect(await screen.findByText('總投資金額：10,000.00')).toBeInTheDocument();
    expect(await screen.findByText('目前總價值：20,000.00')).toBeInTheDocument();
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

});
