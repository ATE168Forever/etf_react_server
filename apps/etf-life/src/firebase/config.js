/* global __APP_ENV__ */
import { initializeApp } from 'firebase/app';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager
} from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const envSource =
  (typeof __APP_ENV__ !== 'undefined' && __APP_ENV__) ||
  (typeof globalThis !== 'undefined' && globalThis.__APP_ENV__) ||
  (typeof process !== 'undefined' && process.env) ||
  {};

const firebaseConfig = {
  apiKey: envSource.VITE_FIREBASE_API_KEY || '',
  authDomain: envSource.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: envSource.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: envSource.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: envSource.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: envSource.VITE_FIREBASE_APP_ID || ''
};

const app = initializeApp(firebaseConfig);

const firestore = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});

const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export { app, auth, googleProvider, firestore };
