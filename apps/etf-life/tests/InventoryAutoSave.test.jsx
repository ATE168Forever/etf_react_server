/* eslint-env jest */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import InventoryTab from '../src/InventoryTab';
import { fetchWithCache } from '../src/api';
import { fetchDividendsByYears } from '../src/dividendApi';
import {
  exportTransactionsToDrive,
  importTransactionsFromDrive
} from '../src/googleDrive';
import {
  exportTransactionsToOneDrive,
  importTransactionsFromOneDrive
} from '../src/oneDrive';
import { exportTransactionsToICloud } from '../src/icloud';

jest.mock('../src/api');
jest.mock('../src/config', () => ({
  API_HOST: 'http://localhost',
  HOST_URL: 'http://localhost'
}));
jest.mock('../src/dividendApi', () => ({
  fetchDividendsByYears: jest.fn(() => Promise.resolve({ data: [] }))
}));
jest.mock('../src/googleDrive', () => ({
  exportTransactionsToDrive: jest.fn(() => Promise.resolve()),
  importTransactionsFromDrive: jest.fn(() => Promise.resolve(null))
}));
jest.mock('../src/oneDrive', () => ({
  exportTransactionsToOneDrive: jest.fn(() => Promise.resolve()),
  importTransactionsFromOneDrive: jest.fn(() => Promise.resolve(null))
}));
jest.mock('../src/icloud', () => ({
  exportTransactionsToICloud: jest.fn(() => Promise.resolve()),
  importTransactionsFromICloud: jest.fn(() => Promise.resolve([]))
}));

const STOCK_LIST_RESPONSE = {
  data: [
    { stock_id: '0050', stock_name: '元大台灣50', dividend_frequency: 1 },
    { stock_id: '2330', stock_name: '台積電', dividend_frequency: 2 }
  ]
};

function setupFetchMock() {
  fetchWithCache.mockImplementation(url => {
    if (url.includes('/get_stock_list')) {
      return Promise.resolve({
        data: STOCK_LIST_RESPONSE.data,
        cacheStatus: 'miss',
        timestamp: Date.now()
      });
    }
    if (url.includes('/get_dividend')) {
      return Promise.resolve({ data: [] });
    }
    return Promise.resolve({ data: [] });
  });
}

describe('InventoryTab auto-save providers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    setupFetchMock();
    fetchDividendsByYears.mockResolvedValue({ data: [] });
    window.alert = jest.fn();
    window.confirm = jest.fn(() => true);
  });

  afterEach(() => {
    delete window.showDirectoryPicker;
    delete window.showSaveFilePicker;
    delete window.showOpenFilePicker;
  });

  async function openDataMenu() {
    render(<InventoryTab />);
    const dataButton = await screen.findByRole('button', { name: '存取資料' });
    fireEvent.click(dataButton);
  }

  test('enabling CSV auto-save syncs newer backup and writes updated CSV', async () => {
    const olderHistory = [
      {
        stock_id: '0050',
        stock_name: '舊資料',
        date: '2023-01-01',
        quantity: 5,
        price: 10,
        type: 'buy'
      }
    ];
    localStorage.setItem('my_transaction_history', JSON.stringify(olderHistory));
    localStorage.setItem('my_transaction_history_updated_at', '1000');

    const csvContent = 'stock_id,stock_name,date,quantity,price,type\n0050,同步資料,2024-01-15,20,22,buy';
    const write = jest.fn().mockResolvedValue();
    const close = jest.fn().mockResolvedValue();
    const file = {
      name: 'inventory_backup.csv',
      lastModified: Date.now() + 10000,
      text: jest.fn().mockResolvedValue(csvContent)
    };
    const fileHandle = {
      name: 'inventory_backup.csv',
      queryPermission: jest.fn().mockResolvedValue('granted'),
      requestPermission: jest.fn().mockResolvedValue('granted'),
      getFile: jest.fn().mockResolvedValue(file),
      createWritable: jest.fn().mockResolvedValue({ write, close })
    };
    const directoryHandle = {
      name: 'Downloads',
      queryPermission: jest.fn().mockResolvedValue('granted'),
      requestPermission: jest.fn().mockResolvedValue('granted'),
      getFileHandle: jest.fn().mockResolvedValue(fileHandle),
      resolve: jest.fn().mockResolvedValue(['Downloads', 'inventory_backup.csv'])
    };
    window.showDirectoryPicker = jest.fn().mockResolvedValue(directoryHandle);

    await openDataMenu();
    const toggle = await screen.findByRole('button', { name: '已關閉' });
    fireEvent.click(toggle);

    await screen.findByRole('button', { name: '開啟中' });
    await waitFor(() => expect(file.text).toHaveBeenCalled());
    await waitFor(() => expect(write).toHaveBeenCalled());

    const savedHistory = JSON.parse(localStorage.getItem('my_transaction_history'));
    expect(savedHistory).toEqual([
      {
        stock_id: '0050',
        stock_name: '同步資料',
        date: '2024-01-15',
        quantity: 20,
        price: 22,
        type: 'buy'
      }
    ]);

    expect(write.mock.calls[0][0]).toContain('同步資料');
    await waitFor(() => {
      expect(screen.getByText(/自動儲存完成/)).toBeInTheDocument();
    });
  });

  test('Google Drive auto-save imports newer backup before exporting', async () => {
    const remoteList = [
      {
        stock_id: '0050',
        stock_name: 'Drive 同步',
        date: '2024-02-01',
        quantity: 12,
        price: 25,
        type: 'buy'
      }
    ];
    importTransactionsFromDrive.mockResolvedValue({
      list: remoteList,
      modifiedTime: Date.now() + 5000
    });
    localStorage.setItem(
      'my_transaction_history',
      JSON.stringify([
        { stock_id: '0050', stock_name: '舊資料', date: '2023-01-01', quantity: 5, price: 10, type: 'buy' }
      ])
    );
    localStorage.setItem('my_transaction_history_updated_at', '1000');

    await openDataMenu();
    const select = screen.getByLabelText('存取方式');
    fireEvent.change(select, { target: { value: 'googleDrive' } });

    const toggle = await screen.findByRole('button', { name: '已關閉' });
    fireEvent.click(toggle);

    await waitFor(() => {
      expect(importTransactionsFromDrive).toHaveBeenCalledWith({ includeMetadata: true });
    });
    await waitFor(() => expect(exportTransactionsToDrive).toHaveBeenCalled());

    expect(exportTransactionsToDrive.mock.calls[0][0]).toEqual(remoteList);
    const savedHistory = JSON.parse(localStorage.getItem('my_transaction_history'));
    expect(savedHistory).toEqual(remoteList);
    await waitFor(() => {
      expect(screen.getByText(/自動儲存完成 \(Google Drive\)/)).toBeInTheDocument();
    });
  });

  test('OneDrive auto-save exports current history after metadata check', async () => {
    const remoteList = [
      {
        stock_id: '2330',
        stock_name: 'OneDrive 同步',
        date: '2024-03-05',
        quantity: 3,
        price: 550,
        type: 'buy'
      }
    ];
    importTransactionsFromOneDrive.mockResolvedValue({
      list: remoteList,
      modifiedTime: Date.now() + 8000
    });
    localStorage.setItem('my_transaction_history', JSON.stringify([]));
    localStorage.setItem('my_transaction_history_updated_at', '500');

    await openDataMenu();
    const select = screen.getByLabelText('存取方式');
    fireEvent.change(select, { target: { value: 'oneDrive' } });

    const toggle = await screen.findByRole('button', { name: '已關閉' });
    fireEvent.click(toggle);

    await waitFor(() => {
      expect(importTransactionsFromOneDrive).toHaveBeenCalledWith({ includeMetadata: true });
    });
    await waitFor(() => expect(exportTransactionsToOneDrive).toHaveBeenCalled());

    expect(exportTransactionsToOneDrive.mock.calls[0][0]).toEqual(remoteList);
    await waitFor(() => {
      expect(screen.getByText(/自動儲存完成 \(OneDrive\)/)).toBeInTheDocument();
    });
  });

  test('iCloud Drive auto-save writes current history through integration', async () => {
    const history = [
      { stock_id: '0050', stock_name: '元大台灣50', date: '2024-04-01', quantity: 6, price: 30, type: 'buy' }
    ];
    localStorage.setItem('my_transaction_history', JSON.stringify(history));

    await openDataMenu();
    const select = screen.getByLabelText('存取方式');
    fireEvent.change(select, { target: { value: 'icloudDrive' } });

    const toggle = await screen.findByRole('button', { name: '已關閉' });
    fireEvent.click(toggle);

    await waitFor(() => expect(exportTransactionsToICloud).toHaveBeenCalled());
    expect(exportTransactionsToICloud.mock.calls[0][0]).toEqual(history);
    await waitFor(() => {
      expect(screen.getByText(/自動儲存完成 \(iCloudDrive\)/)).toBeInTheDocument();
    });
  });
});
