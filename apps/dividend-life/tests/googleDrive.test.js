import { jest } from '@jest/globals';

jest.mock('../config', () => ({
  GOOGLE_API_KEY: '',
  GOOGLE_CLIENT_ID: ''
}));

function mockGoogleApis({
  tokenResponse = { access_token: 'token' },
  listResult = { result: { files: [{ id: 'file1' }] } },
  fileResult = { body: '' }
} = {}) {
  const list = jest.fn().mockResolvedValue(listResult);
  const get = jest.fn().mockResolvedValue(fileResult);

  window.gapi = {
    load: jest.fn((modules, options) => {
      if (typeof options === 'function') {
        options();
      } else {
        options?.callback?.();
      }
    }),
    client: {
      init: jest.fn().mockResolvedValue(),
      setToken: jest.fn(),
      drive: {
        files: { list, get }
      }
    }
  };

  const tokenClient = {
    callback: () => {},
    requestAccessToken: jest.fn(() => {
      tokenClient.callback(typeof tokenResponse === 'function' ? tokenResponse() : tokenResponse);
    })
  };

  window.google = {
    accounts: {
      oauth2: {
        initTokenClient: jest.fn((config) => {
          tokenClient.callback = config.callback;
          return tokenClient;
        })
      }
    }
  };

  return {
    list,
    get,
    tokenClient,
    setToken: window.gapi.client.setToken,
    initTokenClient: window.google.accounts.oauth2.initTokenClient
  };
}

beforeEach(() => {
  jest.resetModules();
  document.body.innerHTML = '<script id="gapi"></script><script id="gis"></script>';
  globalThis.fetch = jest.fn(() => Promise.resolve({ ok: true }));
});

afterEach(() => {
  delete window.gapi;
  delete window.google;
  delete globalThis.fetch;
});

async function loadModule() {
  return import('../src/googleDrive.js');
}

test('exportTransactionsToDrive uploads CSV using client token', async () => {
  const { exportTransactionsToDrive } = await loadModule();
  const { tokenClient, setToken } = mockGoogleApis({ tokenResponse: { access_token: 'client-token' } });

  await exportTransactionsToDrive([
    { stock_id: '2330', stock_name: 'TSMC', date: '2024-01-01', quantity: 10, price: 500, type: 'buy' }
  ]);

  expect(window.gapi.client.init).toHaveBeenCalled();
  expect(tokenClient.requestAccessToken).toHaveBeenCalled();
  expect(setToken).toHaveBeenCalledWith({ access_token: 'client-token' });
  expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  const [, options] = globalThis.fetch.mock.calls[0];
  expect(options.method).toBe('POST');
  expect(options.headers.get('Authorization')).toBe('Bearer client-token');
  expect(options.body).toBeInstanceOf(FormData);
});

test('subsequent exports reuse cached GIS token', async () => {
  const { exportTransactionsToDrive } = await loadModule();
  const { tokenClient } = mockGoogleApis({ tokenResponse: { access_token: 'cached-token' } });

  await exportTransactionsToDrive([
    { stock_id: '0050', stock_name: 'ETF', date: '2024-05-10', quantity: 5, price: 120, type: 'buy' }
  ]);
  await exportTransactionsToDrive([
    { stock_id: '00878', stock_name: 'Div ETF', date: '2024-05-11', quantity: 2, price: 20, type: 'buy' }
  ]);

  expect(tokenClient.requestAccessToken).toHaveBeenCalledTimes(1);
});

test('importTransactionsFromDrive parses CSV rows from Drive', async () => {
  const { importTransactionsFromDrive } = await loadModule();
  const csv = 'stock_id,stock_name,date,quantity,price,type\n2330,TSMC,2024-01-01,10,500,buy';
  const { list, get } = mockGoogleApis({
    listResult: { result: { files: [{ id: 'file-id' }] } },
    fileResult: { body: csv }
  });

  const rows = await importTransactionsFromDrive();

  expect(list).toHaveBeenCalled();
  expect(get).toHaveBeenCalledWith({ fileId: 'file-id', alt: 'media' });
  expect(rows).toEqual([
    {
      stock_id: '2330',
      stock_name: 'TSMC',
      date: '2024-01-01',
      quantity: 10,
      price: 500,
      type: 'buy'
    }
  ]);
});

test('importTransactionsFromDrive returns null when no backup exists', async () => {
  const { importTransactionsFromDrive } = await loadModule();
  mockGoogleApis({ listResult: { result: { files: [] } } });

  const rows = await importTransactionsFromDrive();

  expect(rows).toBeNull();
});
