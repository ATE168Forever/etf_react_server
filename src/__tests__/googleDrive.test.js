import { jest } from '@jest/globals';

function mockGapi({
  signedIn = true,
  token = { access_token: 'token' },
  listResult = { result: { files: [{ id: 'file1' }] } },
  fileResult = { body: '' }
} = {}) {
  const signedState = { value: signedIn };
  const isSignedIn = { get: jest.fn(() => signedState.value) };
  const signIn = jest.fn().mockImplementation(() => {
    signedState.value = true;
    return Promise.resolve();
  });
  const list = jest.fn().mockResolvedValue(listResult);
  const get = jest.fn().mockResolvedValue(fileResult);

  window.gapi = {
    load: jest.fn((modules, callback) => callback()),
    client: {
      init: jest.fn().mockResolvedValue(),
      drive: {
        files: { list, get }
      },
      getToken: jest.fn(() => token)
    },
    auth2: {
      getAuthInstance: jest.fn(() => ({ isSignedIn, signIn }))
    },
    auth: {
      getToken: jest.fn(() => token)
    }
  };

  return { list, get, signIn, isSignedIn };
}

beforeEach(() => {
  jest.resetModules();
  document.body.innerHTML = '<script id="gapi"></script>';
  global.fetch = jest.fn(() => Promise.resolve({ ok: true }));
});

afterEach(() => {
  delete window.gapi;
  delete global.fetch;
});

async function loadModule() {
  return import('../googleDrive.js');
}

test('exportTransactionsToDrive uploads CSV using client token', async () => {
  const { exportTransactionsToDrive } = await loadModule();
  mockGapi({ token: { access_token: 'client-token' } });

  await exportTransactionsToDrive([
    { stock_id: '2330', stock_name: 'TSMC', date: '2024-01-01', quantity: 10, price: 500, type: 'buy' }
  ]);

  expect(window.gapi.client.init).toHaveBeenCalled();
  expect(window.gapi.client.getToken).toHaveBeenCalled();
  expect(global.fetch).toHaveBeenCalledTimes(1);
  const [, options] = global.fetch.mock.calls[0];
  expect(options.method).toBe('POST');
  expect(options.headers.get('Authorization')).toBe('Bearer client-token');
  expect(options.body).toBeInstanceOf(FormData);
});

test('exportTransactionsToDrive falls back to legacy auth token', async () => {
  const { exportTransactionsToDrive } = await loadModule();
  mockGapi();
  window.gapi.client.getToken.mockReturnValue(null);
  window.gapi.auth.getToken.mockReturnValue({ access_token: 'legacy-token' });

  await exportTransactionsToDrive([
    { stock_id: '0050', stock_name: 'ETF', date: '2024-05-10', quantity: 5, price: 120, type: 'buy' }
  ]);

  const [, options] = global.fetch.mock.calls[0];
  expect(options.headers.get('Authorization')).toBe('Bearer legacy-token');
});

test('exportTransactionsToDrive requests sign-in when user is signed out', async () => {
  const { exportTransactionsToDrive } = await loadModule();
  const { signIn } = mockGapi({ signedIn: false, token: { access_token: 'signed-in-token' } });

  await exportTransactionsToDrive([
    { stock_id: '1101', stock_name: 'Cement', date: '2024-03-15', quantity: 3, price: 45, type: 'buy' }
  ]);

  expect(signIn).toHaveBeenCalled();
});

test('importTransactionsFromDrive parses CSV rows from Drive', async () => {
  const { importTransactionsFromDrive } = await loadModule();
  const csv = 'stock_id,stock_name,date,quantity,price,type\n2330,TSMC,2024-01-01,10,500,buy';
  const { list, get } = mockGapi({
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
  mockGapi({ listResult: { result: { files: [] } } });

  const rows = await importTransactionsFromDrive();

  expect(rows).toBeNull();
});
