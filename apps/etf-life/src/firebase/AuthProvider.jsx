import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider } from './config';

const AuthContext = createContext({
  user: null,
  initializing: true,
  error: null,
  signIn: async () => {},
  signOut: async () => {}
});

export function FirebaseAuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      currentUser => {
        setUser(currentUser);
        setInitializing(false);
      },
      authError => {
        console.error('Firebase auth state error', authError);
        setError(authError);
        setInitializing(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const signIn = async () => {
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error('Firebase sign-in failed', err);
      setError(err);
      throw err;
    }
  };

  const signOutUser = async () => {
    setError(null);
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Firebase sign-out failed', err);
      setError(err);
      throw err;
    }
  };

  const value = useMemo(
    () => ({ user, initializing, error, signIn, signOut: signOutUser }),
    [user, initializing, error]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useFirebaseAuth() {
  return useContext(AuthContext);
}
