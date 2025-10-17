import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import { getAuthInstance, getAuthModule, getGoogleProvider } from './config';

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
  const authDepsRef = useRef(null);
  const unsubscribeRef = useRef(() => {});

  const ensureAuthDeps = useCallback(async () => {
    if (authDepsRef.current) {
      return authDepsRef.current;
    }

    const [authInstance, authModule, provider] = await Promise.all([
      getAuthInstance(),
      getAuthModule(),
      getGoogleProvider()
    ]);

    authDepsRef.current = {
      auth: authInstance,
      authModule,
      provider
    };

    return authDepsRef.current;
  }, []);

  useEffect(() => {
    let cancelled = false;

    ensureAuthDeps()
      .then(({ auth: authInstance, authModule }) => {
        if (cancelled) return;
        const unsubscribe = authModule.onAuthStateChanged(
          authInstance,
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
        unsubscribeRef.current = unsubscribe;
      })
      .catch(authError => {
        console.error('Firebase initialization failed', authError);
        if (cancelled) return;
        setError(authError);
        setInitializing(false);
      });

    return () => {
      cancelled = true;
      unsubscribeRef.current?.();
    };
  }, [ensureAuthDeps]);

  const signIn = useCallback(async () => {
    setError(null);
    try {
      const { auth: authInstance, authModule, provider } = await ensureAuthDeps();
      await authModule.signInWithPopup(authInstance, provider);
    } catch (err) {
      console.error('Firebase sign-in failed', err);
      setError(err);
      throw err;
    }
  }, [ensureAuthDeps]);

  const signOutUser = useCallback(async () => {
    setError(null);
    try {
      const { auth: authInstance, authModule } = await ensureAuthDeps();
      await authModule.signOut(authInstance);
    } catch (err) {
      console.error('Firebase sign-out failed', err);
      setError(err);
      throw err;
    }
  }, [ensureAuthDeps]);

  const value = useMemo(
    () => ({ user, initializing, error, signIn, signOut: signOutUser }),
    [user, initializing, error, signIn, signOutUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useFirebaseAuth() {
  return useContext(AuthContext);
}
