/* eslint-env jest */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import InventoryTab from '../src/InventoryTab';
import { fetchWithCache } from '../src/api';
import { fetchStockList } from '../src/stockApi';
import {
  importTransactionsFromDrive,
  exportTransactionsToDrive
} from '../src/googleDrive';

jest.mock('../src/api');
jest.mock('../config', () => ({
  API_HOST: 'http://localhost',
  HOST_URL: 'http://localhost'
}));
jest.mock('../src/googleDrive', () => ({
  exportTransactionsToDrive: jest.fn(() => Promise.resolve()),
  importTransactionsFromDrive: jest.fn(() => Promise.resolve(null)),
  exportDividendBankToDrive: jest.fn(() => Promise.resolve()),
  importDividendBankFromDrive: jest.fn(() => Promise.resolve(null)),
  isDriveAuthenticated: jest.fn(() => false)
}));
jest.mock('../src/stockApi', () => ({
  fetchStockList: jest.fn(() => Promise.resolve({ list: [], meta: null }))
}));

const STOCK_LIST_RESPONSE = {
  data: [
    { stock_id: '0050', stock_name: '元大台灣50', dividend_frequency: 1 },
    { stock_id: '2330', stock_name: '台積電', dividend_frequency: 2 }
  ]
};

function setupFetchMock() {
  fetchWithCache.mockImplementation(() => Promise.resolve({ data: [] }));
  fetchStockList.mockResolvedValue({
    list: STOCK_LIST_RESPONSE.data.map(item => ({ ...item, country: 'TW' })),
    meta: { cacheStatus: 'miss', timestamp: new Date().toISOString() }
  });
}

describe('InventoryTab data access UI', () => {
  let consoleErrorSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    setupFetchMock();
    window.alert = jest.fn();
    window.confirm = jest.fn(() => true);
  });

  afterEach(() => {
    if (consoleErrorSpy) {
      consoleErrorSpy.mockRestore();
      consoleErrorSpy = undefined;
    }
  });

  async function openDataMenu() {
    render(<InventoryTab />);
    const dataButton = await screen.findByRole('button', { name: '存取資料' });
    fireEvent.click(dataButton);
  }

  test('CSV mode shows import and export buttons', async () => {
    await openDataMenu();
    expect(await screen.findByRole('button', { name: '匯入 CSV' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '匯出 CSV' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '連接 Google Drive' })).not.toBeInTheDocument();
  });

  test('selecting Google Drive calls importTransactionsFromDrive and imports newer data', async () => {
    const remoteList = [
      { stock_id: '0050', stock_name: 'Drive 同步', date: '2024-02-01', quantity: 12, price: 25, type: 'buy' }
    ];
    importTransactionsFromDrive.mockResolvedValue({
      list: remoteList,
      modifiedTime: Date.now() + 5000
    });
    localStorage.setItem('my_transaction_history', JSON.stringify([
      { stock_id: '0050', stock_name: '舊資料', date: '2023-01-01', quantity: 5, price: 10, type: 'buy' }
    ]));
    localStorage.setItem('my_transaction_history_updated_at', '1000');

    await openDataMenu();
    const select = screen.getByLabelText('存取方式');
    fireEvent.change(select, { target: { value: 'googleDrive' } });

    await waitFor(() => {
      expect(importTransactionsFromDrive).toHaveBeenCalledWith({ includeMetadata: true, silent: false });
    });
    await waitFor(() => {
      const saved = JSON.parse(localStorage.getItem('my_transaction_history'));
      expect(saved).toEqual(remoteList);
    });
  });

  test('importing from Drive stores Drive\'s modifiedTime as local updatedAt, not the current time', async () => {
    const driveModifiedTime = Date.now() - 60 * 60 * 1000; // 1 hour ago — a stale-but-real Drive backup
    const remoteList = [
      { stock_id: '0050', stock_name: 'Drive 同步', date: '2024-02-01', quantity: 12, price: 25, type: 'buy' }
    ];
    importTransactionsFromDrive.mockResolvedValue({
      list: remoteList,
      modifiedTime: driveModifiedTime
    });
    localStorage.setItem('my_transaction_history', JSON.stringify([]));
    localStorage.setItem('my_transaction_history_updated_at', '1000');

    await openDataMenu();
    const select = screen.getByLabelText('存取方式');
    fireEvent.change(select, { target: { value: 'googleDrive' } });

    await waitFor(() => {
      const saved = JSON.parse(localStorage.getItem('my_transaction_history'));
      expect(saved).toEqual(remoteList);
    });

    expect(Number(localStorage.getItem('my_transaction_history_updated_at'))).toBe(driveModifiedTime);
  });

  test('reconnecting with newer local data pushes it to Drive instead of just marking synced', async () => {
    const driveModifiedTime = Date.now() - 60 * 60 * 1000; // Drive backup is 1 hour old
    const localUpdatedAt = Date.now() - 30 * 60 * 1000; // local is newer, but not "now"
    const localList = [
      { stock_id: '0050', stock_name: '本地資料', date: '2024-04-01', quantity: 8, price: 22, type: 'buy' }
    ];
    importTransactionsFromDrive.mockResolvedValue({
      list: [{ stock_id: '0050', stock_name: 'Drive 舊資料', date: '2024-01-01', quantity: 3, price: 20, type: 'buy' }],
      modifiedTime: driveModifiedTime
    });
    localStorage.setItem('my_transaction_history', JSON.stringify(localList));
    localStorage.setItem('my_transaction_history_updated_at', String(localUpdatedAt));

    await openDataMenu();
    const select = screen.getByLabelText('存取方式');
    fireEvent.change(select, { target: { value: 'googleDrive' } });

    await waitFor(() => {
      expect(exportTransactionsToDrive).toHaveBeenCalled();
    });
    const saved = JSON.parse(localStorage.getItem('my_transaction_history'));
    expect(saved).toEqual(localList);
  });

  test('Connect Google Drive button triggers import attempt after initial failure', async () => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    importTransactionsFromDrive.mockRejectedValueOnce(new Error('Auth failed'));
    importTransactionsFromDrive.mockResolvedValue({
      list: [{ stock_id: '0050', stock_name: '重新連接', date: '2024-03-01', quantity: 10, price: 30, type: 'buy' }],
      modifiedTime: Date.now() + 5000
    });

    await openDataMenu();
    const select = screen.getByLabelText('存取方式');
    fireEvent.change(select, { target: { value: 'googleDrive' } });

    const connectBtn = await screen.findByRole('button', { name: '連接 Google Drive' });
    importTransactionsFromDrive.mockClear();

    fireEvent.click(connectBtn);

    await waitFor(() => {
      expect(importTransactionsFromDrive).toHaveBeenCalledWith({ includeMetadata: true, silent: false });
    });
    expect(consoleErrorSpy).toHaveBeenCalledWith('Drive fetch failed', expect.any(Error));
  });
});
