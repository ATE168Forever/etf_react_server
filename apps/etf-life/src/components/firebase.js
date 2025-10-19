// Firebase integration for import/export of transaction history
//
// This module initializes the Firebase app using the provided
// configuration and exposes helper functions for saving and loading
// transaction history. The data is persisted to Firestore in a
// collection named "backups" with a single document called
// "inventory_backup". Each save stores the CSV content and a
// modifiedTime for easy comparison.

import { transactionsToCsv, transactionsFromCsv } from './utils/csvUtils';

// Firebase configuration
const firebaseConfig = {
  apiKey: 'AIzaSyAB9UhMZMhFJg-FSBdGkXNEVLWxK0-lBpY',
  authDomain: 'etf-app-85c54.firebaseapp.com',
  projectId: 'etf-app-85c54',
  storageBucket: 'etf-app-85c54.firebasestorage.app',
  messagingSenderId: '112489686453',
  appId: '1:112489686453:web:12c75c3bdc970e590b25fc',
  measurementId: 'G-6T6S0M2N6K'
};

let firebaseApp = null;
let firebaseModuleLoader = null;
let firebaseModulesPromise = null;

/**
 * Default loader that fetches Firebase modules from the official CDN.
 * Using dynamic imports removes the need for the firebase package to be
 * present in node_modules while still providing the real functionality
 * when running in the browser.
 */
async function defaultFirebaseModuleLoader() {
  const [appModule, firestoreModule] = await Promise.all([
    import(/* @vite-ignore */ 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js'),
    import(/* @vite-ignore */ 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js')
  ]);

  return {
    initializeApp: appModule.initializeApp,
    getFirestore: firestoreModule.getFirestore,
    doc: firestoreModule.doc,
    setDoc: firestoreModule.setDoc,
    getDoc: firestoreModule.getDoc
  };
}

/**
 * Allow tests to provide their own Firebase module loader. This keeps the
 * production bundle lean while offering deterministic behaviour in unit
 * tests.
 *
 * @param {() => Promise<Object>} loader - Async loader returning Firebase helpers
 */
export function __setFirebaseModuleLoader(loader) {
  firebaseModuleLoader = loader;
  firebaseModulesPromise = null;
  firebaseApp = null;
}

async function getFirebaseModules() {
  if (!firebaseModulesPromise) {
    const loader = firebaseModuleLoader ?? defaultFirebaseModuleLoader;
    firebaseModulesPromise = loader();
  }
  return firebaseModulesPromise;
}

/**
 * Initialise the Firebase app if it hasn't already been initialised.
 * Calling this repeatedly is safe as it returns the existing instance.
 */
async function initFirebase() {
  if (!firebaseApp) {
    const { initializeApp } = await getFirebaseModules();
    firebaseApp = initializeApp(firebaseConfig);
  }
  return firebaseApp;
}

/**
 * Export a list of transactions to Firebase. The list will be converted
 * to CSV and stored in Firestore along with a modification timestamp.
 *
 * @param {Array} list - Transaction history array
 */
export async function exportTransactionsToFirebase(list) {
  // Ensure Firebase is initialised
  await initFirebase();
  const { getFirestore, doc, setDoc } = await getFirebaseModules();
  const db = getFirestore();
  const csvContent = transactionsToCsv(list);
  const docRef = doc(db, 'backups', 'inventory_backup');
  await setDoc(docRef, {
    content: csvContent,
    modifiedTime: Date.now()
  });
}

/**
 * Import transactions from Firebase. Depending on the supplied options,
 * this will return the list of transactions, the modifiedTime or both.
 *
 * @param {Object} options
 * @param {boolean} options.includeMetadata - Whether to include metadata
 * @param {boolean} options.metadataOnly - Whether to return only metadata
 * @returns {Promise<null|Array|Object>}
 */
export async function importTransactionsFromFirebase(options = {}) {
  const { includeMetadata = false, metadataOnly = false } = options;
  await initFirebase();
  const { getFirestore, doc, getDoc } = await getFirebaseModules();
  const db = getFirestore();
  const docRef = doc(db, 'backups', 'inventory_backup');
  const snapshot = await getDoc(docRef);
  if (!snapshot.exists()) {
    return null;
  }
  const data = snapshot.data();
  const modifiedTime = Number.isFinite(data?.modifiedTime) ? data.modifiedTime : null;
  if (metadataOnly) {
    return { modifiedTime };
  }
  const csv = typeof data?.content === 'string' ? data.content : '';
  const transactions = transactionsFromCsv(csv);
  if (includeMetadata) {
    return { list: transactions, modifiedTime };
  }
  return transactions;
}
