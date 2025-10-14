import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  onSnapshot,
  setDoc,
  enableIndexedDbPersistence,
  serverTimestamp
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

function createFirebaseApp() {
  if (typeof window === 'undefined') {
    return null;
  }
  if (!firebaseConfig.projectId) {
    console.warn('Firebase project ID is missing, realtime sync disabled.');
    return null;
  }
  if (getApps().length > 0) {
    return getApps()[0];
  }
  return initializeApp(firebaseConfig);
}

export const firebaseApp = createFirebaseApp();
export const auth = firebaseApp ? getAuth(firebaseApp) : null;
export const db = firebaseApp ? getFirestore(firebaseApp) : null;

if (db && typeof window !== 'undefined') {
  enableIndexedDbPersistence(db).catch(error => {
    if (error?.code === 'failed-precondition') {
      console.warn('IndexedDB persistence can only be enabled in one tab at a time.');
    } else if (error?.code === 'unimplemented') {
      console.warn('IndexedDB persistence is not available in this browser.');
    } else {
      console.warn('Failed to enable IndexedDB persistence', error);
    }
  });
}

export function createGoogleAuthProvider() {
  if (!auth) throw new Error('Firebase Auth has not been initialised');
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  return provider;
}

export async function signInWithGoogle() {
  if (!auth) throw new Error('Firebase Auth has not been initialised');
  const provider = createGoogleAuthProvider();
  return signInWithPopup(auth, provider);
}

export function onAuthChange(callback) {
  if (!auth) return () => {};
  return onAuthStateChanged(auth, callback);
}

export async function signOut() {
  if (!auth) return;
  await firebaseSignOut(auth);
}

function getWorkspaceDocRef(workspaceId) {
  if (!db) throw new Error('Firebase Firestore has not been initialised');
  if (!workspaceId) throw new Error('workspaceId is required');
  return doc(db, 'workspaces', workspaceId);
}

export function subscribeToWorkspaceTransactions(workspaceId, callback) {
  if (!db || !workspaceId) return () => {};
  const workspaceRef = getWorkspaceDocRef(workspaceId);
  return onSnapshot(workspaceRef, snapshot => {
    const data = snapshot.data();
    callback(
      data
        ? {
            transactions: Array.isArray(data.transactions) ? data.transactions : [],
            updatedAt: data.updatedAt?.toMillis ? data.updatedAt.toMillis() : null,
            clientUpdatedAt: Number.isFinite(data.clientUpdatedAt) ? data.clientUpdatedAt : null
          }
        : {
            transactions: [],
            updatedAt: null,
            clientUpdatedAt: null
          }
    );
  });
}

export async function saveWorkspaceTransactions(workspaceId, transactions, clientUpdatedAt) {
  if (!db) throw new Error('Firebase Firestore has not been initialised');
  const workspaceRef = getWorkspaceDocRef(workspaceId);
  const payload = {
    transactions: Array.isArray(transactions) ? transactions : [],
    ownerUid: workspaceId,
    updatedAt: serverTimestamp()
  };
  if (Number.isFinite(clientUpdatedAt)) {
    payload.clientUpdatedAt = clientUpdatedAt;
  }
  await setDoc(workspaceRef, payload, { merge: true });
  return payload;
}
