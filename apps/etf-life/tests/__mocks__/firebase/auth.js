const listeners = new Set();
const authInstance = { listeners };

export function getAuth() {
  return authInstance;
}

export class GoogleAuthProvider {}

export function onAuthStateChanged(auth, callback) {
  listeners.add(callback);
  callback(null);
  return () => listeners.delete(callback);
}

export async function signInWithPopup() {
  const user = { uid: 'test-user', displayName: 'Test User', email: 'test@example.com' };
  listeners.forEach(listener => listener(user));
  return { user };
}

export async function signOut() {
  listeners.forEach(listener => listener(null));
}
