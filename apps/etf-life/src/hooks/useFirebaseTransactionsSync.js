import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ensureFirebaseInitialised,
  getFirebaseStatus,
  onFirebaseStatusChange,
  signInWithGoogle,
  signOut,
  onAuthChange,
  subscribeToWorkspaceTransactions,
  saveWorkspaceTransactions,
  isFirebaseConfigured,
  missingFirebaseConfigEnvVars
} from '../firebase/client';

const EMPTY_ARRAY = Object.freeze([]);

function sanitizeTransactions(list) {
  if (!Array.isArray(list)) {
    return EMPTY_ARRAY;
  }
  return list.map(item => {
    const normalized = {
      stock_id: typeof item?.stock_id === 'string' ? item.stock_id : '',
      stock_name: typeof item?.stock_name === 'string' ? item.stock_name : '',
      date: item?.date || '',
      quantity: Number(item?.quantity) || 0,
      type: item?.type === 'sell' ? 'sell' : 'buy'
    };
    if (normalized.type === 'buy') {
      normalized.price = Number(item?.price) || 0;
    }
    return normalized;
  });
}

export default function useFirebaseTransactionsSync() {
  const [initialising, setInitialising] = useState(true);
  const [firebaseStatus, setFirebaseStatus] = useState(() => getFirebaseStatus());
  const auth = firebaseStatus.auth;
  const [user, setUser] = useState(() => (auth ? auth.currentUser : null));
  const [remoteTransactions, setRemoteTransactions] = useState(EMPTY_ARRAY);
  const [remoteUpdatedAt, setRemoteUpdatedAt] = useState(null);
  const [syncStatus, setSyncStatus] = useState('idle');
  const [error, setError] = useState(null);
  const pendingClientUpdates = useRef(new Set());

  const missingConfigVars = missingFirebaseConfigEnvVars;
  const sdkLoadError = firebaseStatus.sdkLoadError;
  const disabledReason = !isFirebaseConfigured ? 'config' : !auth ? 'sdk' : null;

  const workspaceId = user?.uid || null;

  useEffect(() => {
    ensureFirebaseInitialised();
  }, []);

  useEffect(() => {
    return onFirebaseStatusChange(status => {
      setFirebaseStatus(status);
    });
  }, []);

  useEffect(() => {
    if (!auth) {
      setUser(null);
      setInitialising(false);
      return () => {};
    }
    const unsubscribe = onAuthChange(current => {
      setUser(current);
      setInitialising(false);
    });
    return () => unsubscribe();
  }, [auth]);

  useEffect(() => {
    if (!workspaceId || !firebaseStatus.db) {
      setRemoteTransactions(EMPTY_ARRAY);
      setRemoteUpdatedAt(null);
      return () => {};
    }
    return subscribeToWorkspaceTransactions(workspaceId, payload => {
      const { transactions, updatedAt, clientUpdatedAt } = payload;
      setRemoteTransactions(Array.isArray(transactions) ? transactions : EMPTY_ARRAY);
      setRemoteUpdatedAt(Number.isFinite(updatedAt) ? updatedAt : null);
      if (Number.isFinite(clientUpdatedAt)) {
        pendingClientUpdates.current.delete(clientUpdatedAt);
      }
      setSyncStatus('idle');
      setError(null);
    });
  }, [workspaceId, firebaseStatus.db]);

  const signIn = useCallback(async () => {
    if (disabledReason === 'config') {
      const configError = new Error('Firebase 尚未設定，請檢查環境變數');
      configError.code = 'firebase/missing-config';
      configError.missingEnvVars = missingConfigVars;
      throw configError;
    }
    if (!auth) {
      const sdkError =
        sdkLoadError instanceof Error
          ? sdkLoadError
          : new Error('Firebase 未初始化，請檢查設定');
      throw sdkError;
    }
    await signInWithGoogle();
  }, [auth, disabledReason, missingConfigVars, sdkLoadError]);

  const signOutUser = useCallback(async () => {
    await signOut();
  }, []);

  const pushTransactions = useCallback(
    async list => {
      if (!workspaceId) {
        throw new Error('必須先登入 Google 才能同步資料');
      }
      const sanitized = sanitizeTransactions(list);
      const clientUpdatedAt = Date.now();
      pendingClientUpdates.current.add(clientUpdatedAt);
      setSyncStatus('saving');
      setError(null);
      try {
        await saveWorkspaceTransactions(workspaceId, sanitized, clientUpdatedAt);
        return { clientUpdatedAt };
      } catch (err) {
        setSyncStatus('error');
        setError(err);
        pendingClientUpdates.current.delete(clientUpdatedAt);
        throw err;
      }
    },
    [workspaceId]
  );

  const state = useMemo(
    () => ({
      initialising,
      user,
      workspaceId,
      remoteTransactions,
      remoteUpdatedAt,
      syncStatus,
      error,
      signIn,
      signOut: signOutUser,
      pushTransactions,
      disabledReason,
      missingConfigVars,
      sdkLoadError
    }),
    [
      initialising,
      user,
      workspaceId,
      remoteTransactions,
      remoteUpdatedAt,
      syncStatus,
      error,
      signIn,
      signOutUser,
      pushTransactions,
      disabledReason,
      missingConfigVars,
      sdkLoadError
    ]
  );

  return state;
}
