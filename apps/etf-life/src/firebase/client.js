const FIREBASE_SDK_VERSION = '11.0.2';

const isBrowser = typeof window !== 'undefined';
const globalProcess = typeof globalThis !== 'undefined' ? globalThis.process : undefined;
const isTestEnvironment =
  typeof globalProcess !== 'undefined' && typeof globalProcess.env?.JEST_WORKER_ID !== 'undefined';
const shouldAttemptSdkLoad = isBrowser && !isTestEnvironment;

const firebaseModuleUrls = [
  `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-app.js`,
  `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-auth.js`,
  `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-firestore.js`
];

let importMetaEnv;
try {
  importMetaEnv = (0, eval)('import.meta.env');
} catch {
  importMetaEnv = undefined;
}

const envSource =
  importMetaEnv ?? (typeof globalProcess !== 'undefined' && globalProcess?.env ? globalProcess.env : {});

function readEnv(key) {
  const value = envSource?.[key];
  return typeof value === 'string' ? value : undefined;
}

const baseFirebaseConfig = {
  apiKey: readEnv('VITE_FIREBASE_API_KEY'),
  authDomain: readEnv('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: readEnv('VITE_FIREBASE_PROJECT_ID'),
  storageBucket: readEnv('VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: readEnv('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: readEnv('VITE_FIREBASE_APP_ID')
};

const optionalFirebaseConfig = {};
const measurementId = readEnv('VITE_FIREBASE_MEASUREMENT_ID');
if (measurementId) {
  optionalFirebaseConfig.measurementId = measurementId;
}

const firebaseConfig = Object.freeze({
  ...baseFirebaseConfig,
  ...optionalFirebaseConfig
});

const firebaseConfigEnvVarMap = Object.freeze({
  apiKey: 'VITE_FIREBASE_API_KEY',
  authDomain: 'VITE_FIREBASE_AUTH_DOMAIN',
  projectId: 'VITE_FIREBASE_PROJECT_ID',
  storageBucket: 'VITE_FIREBASE_STORAGE_BUCKET',
  messagingSenderId: 'VITE_FIREBASE_MESSAGING_SENDER_ID',
  appId: 'VITE_FIREBASE_APP_ID'
});

const missingFirebaseConfigKeys = Object.keys(firebaseConfigEnvVarMap).filter(
  key => !baseFirebaseConfig[key]
);

export const missingFirebaseConfigEnvVars = Object.freeze(
  missingFirebaseConfigKeys.map(key => firebaseConfigEnvVarMap[key] || key)
);

export const isFirebaseConfigured = missingFirebaseConfigKeys.length === 0;

export let firebaseSdkLoadError = null;

let appModule;
let authModule;
let firestoreModule;

let getAuthFn;
let GoogleAuthProviderCtor;
let signInWithPopupFn;
let firebaseSignOutFn;
let onAuthStateChangedFn;

let getFirestoreFn;
let docFn;
let onSnapshotFn;
let setDocFn;
let enableIndexedDbPersistenceFn;
let serverTimestampFn;

let firebaseAppInstance = null;
let authInstance = null;
let dbInstance = null;

let modulesLoaded = false;
let initializationPromise = null;

const firebaseStatusListeners = new Set();

function buildFirebaseStatus() {
  return {
    app: firebaseAppInstance,
    auth: authInstance,
    db: dbInstance,
    sdkLoadError: firebaseSdkLoadError,
    modulesLoaded,
    isConfigured: isFirebaseConfigured
  };
}

export function getFirebaseStatus() {
  return buildFirebaseStatus();
}

function notifyFirebaseStatusChange() {
  const status = buildFirebaseStatus();
  firebaseStatusListeners.forEach(listener => {
    try {
      listener(status);
    } catch (error) {
      console.error('Error in Firebase status listener', error);
    }
  });
}

async function loadFirebaseModules() {
  if (!shouldAttemptSdkLoad) {
    return [];
  }

  try {
    return await Promise.all(
      firebaseModuleUrls.map(url => import(/* @vite-ignore */ url))
    );
  } catch (error) {
    firebaseSdkLoadError = error;
    console.warn('Failed to load Firebase SDK modules, realtime sync disabled.', error);
    return [];
  }
}

async function initialiseFirebaseInstances() {
  if (!shouldAttemptSdkLoad) {
    modulesLoaded = true;
    return;
  }

  if (modulesLoaded) {
    return initializationPromise;
  }

  if (!initializationPromise) {
    initializationPromise = loadFirebaseModules()
      .then(modules => {
        const [appMod, authMod, firestoreMod] = modules;

        appModule = appMod;
        authModule = authMod;
        firestoreModule = firestoreMod;

        if (!appModule || !authModule || !firestoreModule) {
          modulesLoaded = true;
          notifyFirebaseStatusChange();
          return;
        }

        getAuthFn = typeof authModule.getAuth === 'function' ? authModule.getAuth : undefined;
        GoogleAuthProviderCtor =
          typeof authModule.GoogleAuthProvider === 'function'
            ? authModule.GoogleAuthProvider
            : undefined;
        signInWithPopupFn =
          typeof authModule.signInWithPopup === 'function' ? authModule.signInWithPopup : undefined;
        firebaseSignOutFn =
          typeof authModule.signOut === 'function' ? authModule.signOut : undefined;
        onAuthStateChangedFn =
          typeof authModule.onAuthStateChanged === 'function'
            ? authModule.onAuthStateChanged
            : undefined;

        getFirestoreFn =
          typeof firestoreModule.getFirestore === 'function'
            ? firestoreModule.getFirestore
            : undefined;
        docFn = typeof firestoreModule.doc === 'function' ? firestoreModule.doc : undefined;
        onSnapshotFn =
          typeof firestoreModule.onSnapshot === 'function' ? firestoreModule.onSnapshot : undefined;
        setDocFn = typeof firestoreModule.setDoc === 'function' ? firestoreModule.setDoc : undefined;
        enableIndexedDbPersistenceFn =
          typeof firestoreModule.enableIndexedDbPersistence === 'function'
            ? firestoreModule.enableIndexedDbPersistence
            : undefined;
        serverTimestampFn =
          typeof firestoreModule.serverTimestamp === 'function'
            ? firestoreModule.serverTimestamp
            : undefined;

        const initializeAppFn =
          typeof appModule.initializeApp === 'function' ? appModule.initializeApp : undefined;
        const getAppsFn = typeof appModule.getApps === 'function' ? appModule.getApps : undefined;

        if (!isFirebaseConfigured) {
          modulesLoaded = true;
          notifyFirebaseStatusChange();
          return;
        }

        if (!initializeAppFn || !getAppsFn) {
          console.warn('Firebase SDK is unavailable, realtime sync disabled.');
          modulesLoaded = true;
          notifyFirebaseStatusChange();
          return;
        }

        try {
          firebaseAppInstance =
            getAppsFn().length > 0 ? getAppsFn()[0] : initializeAppFn(firebaseConfig);
        } catch (error) {
          firebaseSdkLoadError = error;
          console.warn('Failed to initialise Firebase app, realtime sync disabled.', error);
          modulesLoaded = true;
          notifyFirebaseStatusChange();
          return;
        }

        if (firebaseAppInstance && getAuthFn) {
          authInstance = getAuthFn(firebaseAppInstance);
        }

        if (firebaseAppInstance && getFirestoreFn) {
          dbInstance = getFirestoreFn(firebaseAppInstance);
        }

        if (
          dbInstance &&
          enableIndexedDbPersistenceFn &&
          typeof enableIndexedDbPersistenceFn === 'function' &&
          typeof window !== 'undefined'
        ) {
          enableIndexedDbPersistenceFn(dbInstance).catch(error => {
            if (error?.code === 'failed-precondition') {
              console.warn('IndexedDB persistence can only be enabled in one tab at a time.');
            } else if (error?.code === 'unimplemented') {
              console.warn('IndexedDB persistence is not available in this browser.');
            } else {
              console.warn('Failed to enable IndexedDB persistence', error);
            }
          });
        }

        modulesLoaded = true;
        notifyFirebaseStatusChange();
      })
      .catch(error => {
        firebaseSdkLoadError = error;
        modulesLoaded = true;
        notifyFirebaseStatusChange();
      });
  }

  return initializationPromise;
}

export async function ensureFirebaseInitialised() {
  await initialiseFirebaseInstances();
  return buildFirebaseStatus();
}

export function onFirebaseStatusChange(listener) {
  if (typeof listener !== 'function') {
    return () => {};
  }
  firebaseStatusListeners.add(listener);
  listener(buildFirebaseStatus());
  return () => {
    firebaseStatusListeners.delete(listener);
  };
}

export function getFirebaseApp() {
  return firebaseAppInstance;
}

export function getFirebaseAuth() {
  return authInstance;
}

export function getFirestoreDb() {
  return dbInstance;
}

export function createGoogleAuthProvider() {
  if (!authInstance || !GoogleAuthProviderCtor) {
    throw new Error('Firebase Auth has not been initialised');
  }
  const provider = new GoogleAuthProviderCtor();
  provider.setCustomParameters({ prompt: 'select_account' });
  return provider;
}

export async function signInWithGoogle() {
  await ensureFirebaseInitialised();
  if (!authInstance || !signInWithPopupFn) {
    throw new Error('Firebase Auth has not been initialised');
  }
  const provider = createGoogleAuthProvider();
  return signInWithPopupFn(authInstance, provider);
}

export function onAuthChange(callback) {
  if (!authInstance || !onAuthStateChangedFn) {
    return () => {};
  }
  return onAuthStateChangedFn(authInstance, callback);
}

export async function signOut() {
  if (!authInstance || !firebaseSignOutFn) {
    return;
  }
  await firebaseSignOutFn(authInstance);
}

function getWorkspaceDocRef(workspaceId) {
  if (!dbInstance || !docFn) {
    throw new Error('Firebase Firestore has not been initialised');
  }
  if (!workspaceId) throw new Error('workspaceId is required');
  return docFn(dbInstance, 'workspaces', workspaceId);
}

export function subscribeToWorkspaceTransactions(workspaceId, callback) {
  if (!dbInstance || !workspaceId || !onSnapshotFn || !docFn) return () => {};
  const workspaceRef = getWorkspaceDocRef(workspaceId);
  return onSnapshotFn(workspaceRef, snapshot => {
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
  if (!dbInstance || !setDocFn || !serverTimestampFn) {
    throw new Error('Firebase Firestore has not been initialised');
  }
  const workspaceRef = getWorkspaceDocRef(workspaceId);
  const payload = {
    transactions: Array.isArray(transactions) ? transactions : [],
    ownerUid: workspaceId,
    updatedAt: serverTimestampFn()
  };
  if (Number.isFinite(clientUpdatedAt)) {
    payload.clientUpdatedAt = clientUpdatedAt;
  }
  await setDocFn(workspaceRef, payload, { merge: true });
  return payload;
}

if (shouldAttemptSdkLoad) {
  initialiseFirebaseInstances();
}

