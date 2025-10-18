import { jest } from '@jest/globals';
import { transactionsToCsv } from '../src/utils/csvUtils.js';

async function loadFirebaseModule({ snapshot } = {}) {
  jest.resetModules();
  const firebaseApp = await import('firebase/app');
  const firestore = await import('firebase/firestore');

  firebaseApp.initializeApp.mockClear();
  const firestoreInstance = { name: 'firestore' };
  firestore.getFirestore.mockClear();
  firestore.getFirestore.mockReturnValue(firestoreInstance);
  const docRef = { path: 'backups/inventory_backup' };
  firestore.doc.mockClear();
  firestore.doc.mockReturnValue(docRef);
  firestore.setDoc.mockClear();
  firestore.setDoc.mockResolvedValue();
  if (snapshot !== undefined) {
    firestore.getDoc.mockClear();
    firestore.getDoc.mockResolvedValue(snapshot);
  } else {
    firestore.getDoc.mockClear();
    firestore.getDoc.mockResolvedValue(undefined);
  }

  const module = await import('../src/components/firebase.js');
  return { module, firebaseApp, firestore, firestoreInstance, docRef };
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
});

test('exportTransactionsToFirebase saves CSV content with timestamp', async () => {
  const transactions = [
    { stock_id: '0050', stock_name: 'Taiwan 50', date: '2024-05-01', quantity: 10, price: 120, type: 'buy' }
  ];
  const expectedCsv = transactionsToCsv(transactions);
  const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(1729);

  const { module, firebaseApp, firestore, firestoreInstance, docRef } = await loadFirebaseModule();

  await module.exportTransactionsToFirebase(transactions);

  expect(firebaseApp.initializeApp).toHaveBeenCalledTimes(1);
  expect(firestore.getFirestore).toHaveBeenCalledTimes(1);
  expect(firestore.doc).toHaveBeenCalledWith(firestoreInstance, 'backups', 'inventory_backup');
  expect(firestore.setDoc).toHaveBeenCalledWith(docRef, { content: expectedCsv, modifiedTime: 1729 });

  nowSpy.mockRestore();
});

test('importTransactionsFromFirebase returns parsed transactions and metadata', async () => {
  const transactions = [
    { stock_id: '2330', stock_name: 'TSMC', date: '2024-06-01', quantity: 5, price: 580, type: 'buy' }
  ];
  const csv = transactionsToCsv(transactions);
  const snapshot = {
    exists: () => true,
    data: () => ({ content: csv, modifiedTime: 2468 })
  };

  const { module, firestore } = await loadFirebaseModule({ snapshot });

  const metadataOnly = await module.importTransactionsFromFirebase({ metadataOnly: true });
  expect(metadataOnly).toEqual({ modifiedTime: 2468 });

  const withMetadata = await module.importTransactionsFromFirebase({ includeMetadata: true });
  expect(withMetadata).toEqual({ list: transactions, modifiedTime: 2468 });
  expect(firestore.getDoc).toHaveBeenCalledTimes(2);
});

test('importTransactionsFromFirebase returns null when no backup exists', async () => {
  const snapshot = {
    exists: () => false
  };
  const { module, firestore } = await loadFirebaseModule({ snapshot });

  const result = await module.importTransactionsFromFirebase();
  expect(result).toBeNull();
  expect(firestore.getDoc).toHaveBeenCalledTimes(1);
});
