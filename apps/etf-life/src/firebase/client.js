const FIREBASE_SDK_VERSION = '11.0.2';

let appModule;
let authModule;
let firestoreModule;

const firebaseModuleUrls = [
  `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-app.js`,
  `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-auth.js`,
  `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-firestore.js`
];

async function loadFirebaseModules() {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const modules = await Promise.all(
      firebaseModuleUrls.map(url => import(/* @vite-ignore */ url))
    );
    return modules;
  } catch (error) {
    console.warn('Failed to load Firebase SDK modules, realtime sync disabled.', error);
    return [];
  }
}

if (typeof window !== 'undefined') {
  [appModule, authModule, firestoreModule] = await loadFirebaseModules();
}

const { initializeApp, getApps } = appModule ?? {};
const {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut: firebaseSignOut,
  onAuthStateChanged
} = authModule ?? {};
const {
  getFirestore,
  doc,
  onSnapshot,
  setDoc,
  enableIndexedDbPersistence,
  serverTimestamp
} = firestoreModule ?? {};

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
  if (typeof initializeApp !== 'function' || typeof getApps !== 'function') {
    console.warn('Firebase SDK is unavailable, realtime sync disabled.');
    return null;
  }
  if (getApps().length > 0) {
    return getApps()[0];
  }
  return initializeApp(firebaseConfig);
}

export const firebaseApp = createFirebaseApp();
export const auth =
  firebaseApp && typeof getAuth === 'function' ? getAuth(firebaseApp) : null;
export const db =
  firebaseApp && typeof getFirestore === 'function' ? getFirestore(firebaseApp) : null;

if (
  db &&
  typeof enableIndexedDbPersistence === 'function' &&
  typeof window !== 'undefined'
) {
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
  if (!auth || typeof GoogleAuthProvider !== 'function') {
    throw new Error('Firebase Auth has not been initialised');
  }
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  return provider;
}

export async function signInWithGoogle() {
  if (!auth || typeof signInWithPopup !== 'function') {
    throw new Error('Firebase Auth has not been initialised');
  }
  const provider = createGoogleAuthProvider();
  return signInWithPopup(auth, provider);
}

export function onAuthChange(callback) {
  if (!auth || typeof onAuthStateChanged !== 'function') {
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
}

export async function signOut() {
  if (!auth || typeof firebaseSignOut !== 'function') {
    return;
  }
  await firebaseSignOut(auth);
}

function getWorkspaceDocRef(workspaceId) {
  if (!db || typeof doc !== 'function') {
    throw new Error('Firebase Firestore has not been initialised');
  }
  if (!workspaceId) throw new Error('workspaceId is required');
  return doc(db, 'workspaces', workspaceId);
}

export function subscribeToWorkspaceTransactions(workspaceId, callback) {
  if (!db || !workspaceId || typeof onSnapshot !== 'function') return () => {};
  const workspaceRef = getWorkspaceDocRef(workspaceId);
  return onSnapshot(workspaceRef, snapshot => {
    const data = snapshot.data();
    callback(
      data
        ? {
            transactions: Array.isArray(data.transactions) ? data.transactions : [],
            updatedAt: data.updatedAt?.toMillis ? data.updatedAt.toMillis() : null,
            clientUpdatedAt: Number.isFinite(data.clientUpdatedAt)
              ? data.clientUpdatedAt
              : null
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
  if (
    !db ||
    typeof setDoc !== 'function' ||
    typeof serverTimestamp !== 'function'
  ) {
    throw new Error('Firebase Firestore has not been initialised');
  }
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
