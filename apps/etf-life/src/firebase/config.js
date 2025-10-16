/* global __APP_ENV__ */

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

let firebaseInitializationPromise = null;

function getManualFirebaseModules() {
  if (typeof globalThis === 'undefined') return null;
  return globalThis.__FIREBASE_MODULES__ || null;
}

async function importFirebaseModules() {
  const manualModules = getManualFirebaseModules();
  if (manualModules) {
    return manualModules;
  }

  if (typeof window === 'undefined') {
    throw new Error('Firebase SDK is not available in the current environment.');
  }

  const [appModule, authModule, firestoreModule] = await Promise.all([
    import(/* @vite-ignore */ 'https://www.gstatic.com/firebasejs/11.1.0/firebase-app.js'),
    import(/* @vite-ignore */ 'https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js'),
    import(/* @vite-ignore */ 'https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js')
  ]);

  return { appModule, authModule, firestoreModule };
}

function buildFirebaseConfig(modules) {
  const { appModule, authModule, firestoreModule } = modules;
  const app = appModule.initializeApp(firebaseConfig);

  const firestore = firestoreModule.initializeFirestore(app, {
    localCache: firestoreModule.persistentLocalCache({
      tabManager: firestoreModule.persistentMultipleTabManager()
    })
  });

  const auth = authModule.getAuth(app);
  const googleProvider = new authModule.GoogleAuthProvider();

  return {
    app,
    auth,
    firestore,
    googleProvider,
    modules: {
      app: appModule,
      auth: authModule,
      firestore: firestoreModule
    }
  };
}

export async function ensureFirebase() {
  if (!firebaseInitializationPromise) {
    firebaseInitializationPromise = importFirebaseModules()
      .then(buildFirebaseConfig)
      .catch(error => {
        firebaseInitializationPromise = null;
        throw error;
      });
  }
  return firebaseInitializationPromise;
}

export async function getFirebaseApp() {
  const { app } = await ensureFirebase();
  return app;
}

export async function getFirestoreInstance() {
  const { firestore } = await ensureFirebase();
  return firestore;
}

export async function getFirestoreModule() {
  const { modules } = await ensureFirebase();
  return modules.firestore;
}

export async function getAuthInstance() {
  const { auth } = await ensureFirebase();
  return auth;
}

export async function getAuthModule() {
  const { modules } = await ensureFirebase();
  return modules.auth;
}

export async function getGoogleProvider() {
  const { googleProvider } = await ensureFirebase();
  return googleProvider;
}

export function resetFirebaseForTests() {
  firebaseInitializationPromise = null;
}
