/* eslint-env jest */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Cookies from 'js-cookie';
import InventoryTab from './InventoryTab';
import { fetchWithCache } from './api';

jest.mock('./api');
jest.mock('./config', () => ({
  API_HOST: 'http://localhost',
  DEFAULT_GSHEET_URL: 'https://example.com/sync'
}));

describe('InventoryTab interactions', () => {
  beforeEach(() => {
    localStorage.clear();
    Cookies.remove('my_transaction_history');
    fetchWithCache.mockResolvedValue({ data: [{ stock_id: '0050', stock_name: 'Test ETF', dividend_frequency: 1 }] });
    globalThis.fetch = jest.fn(() => Promise.resolve({ ok: true }));
  });

  test('edits existing transaction', async () => {
    localStorage.setItem('my_transaction_history', JSON.stringify([
      { stock_id: '0050', date: '2024-01-01', quantity: 1000, type: 'buy', price: 10 }
    ]));
    render(<InventoryTab />);
    await waitFor(() => screen.getByText('顯示：交易歷史'));
    fireEvent.click(screen.getByText('顯示：交易歷史'));
    await screen.findByText('0050');
    fireEvent.click(screen.getByText('修改'));
    const qtyInput = screen.getByDisplayValue('1000');
    fireEvent.change(qtyInput, { target: { value: '2000' } });
    fireEvent.click(screen.getByText('儲存'));
    await screen.findByText(/2000/);
    const saved = JSON.parse(localStorage.getItem('my_transaction_history'));
    expect(saved[0].quantity).toBe(2000);
  });

  test('syncs to Google Sheet', async () => {
    localStorage.setItem('my_transaction_history', JSON.stringify([
      { stock_id: '0050', date: '2024-01-01', quantity: 1000, type: 'buy', price: 10 }
    ]));
    render(<InventoryTab />);
    await waitFor(() => screen.getByText('顯示：交易歷史'));
    fireEvent.click(screen.getByText('一鍵匯出'));
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://example.com/sync',
      expect.objectContaining({ method: 'POST' })
    );
  });
});
