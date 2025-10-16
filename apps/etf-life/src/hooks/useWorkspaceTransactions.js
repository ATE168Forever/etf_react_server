import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  writeBatch
} from 'firebase/firestore';
import { firestore } from '../firebase/config';
import {
  deserializeTransaction,
  serializeTransaction,
  sortTransactionsByDate,
  toTransactionMap
} from '../utils/transactionUtils';

const EMPTY_STATE = {
  transactions: [],
  status: 'idle',
  error: null,
  initialLoadComplete: false
};

export function useWorkspaceTransactions(workspaceId) {
  const [state, setState] = useState(EMPTY_STATE);
  const latestWorkspaceIdRef = useRef(workspaceId);
  latestWorkspaceIdRef.current = workspaceId;

  useEffect(() => {
    if (!workspaceId) {
      setState(EMPTY_STATE);
      return undefined;
    }

    const collectionRef = collection(firestore, 'workspaces', workspaceId, 'transactions');
    setState(prev => ({ ...prev, status: 'connecting', error: null }));

    const unsubscribe = onSnapshot(
      collectionRef,
      snapshot => {
        const items = snapshot.docs.map(document =>
          deserializeTransaction(document.id, document.data())
        );
        const sorted = sortTransactionsByDate(items);
        const status = snapshot.metadata.hasPendingWrites
          ? 'pending'
          : snapshot.metadata.fromCache
            ? 'offline'
            : 'synced';
        setState({
          transactions: sorted,
          status,
          error: null,
          initialLoadComplete: true
        });
      },
      error => {
        console.error('Firestore subscription error', error);
        setState({
          transactions: [],
          status: 'error',
          error,
          initialLoadComplete: true
        });
      }
    );

    return unsubscribe;
  }, [workspaceId]);

  const collectionRef = useMemo(() => {
    if (!workspaceId) return null;
    return collection(firestore, 'workspaces', workspaceId, 'transactions');
  }, [workspaceId]);

  const addTransactions = useCallback(
    async (list) => {
      if (!collectionRef || !Array.isArray(list) || list.length === 0) return;
      const batch = writeBatch(firestore);
      list.forEach(item => {
        const docRef = doc(collectionRef, item.id);
        batch.set(docRef, {
          ...serializeTransaction(item),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      });
      await batch.commit();
    },
    [collectionRef]
  );

  const updateTransaction = useCallback(
    async (id, updates) => {
      if (!collectionRef || !id) return;
      const docRef = doc(collectionRef, id);
      await setDoc(
        docRef,
        {
          ...serializeTransaction({ id, ...updates }),
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );
    },
    [collectionRef]
  );

  const deleteTransactions = useCallback(
    async ids => {
      if (!collectionRef || !Array.isArray(ids) || ids.length === 0) return;
      const batch = writeBatch(firestore);
      ids.forEach(id => {
        if (!id) return;
        batch.delete(doc(collectionRef, id));
      });
      await batch.commit();
    },
    [collectionRef]
  );

  const replaceAllTransactions = useCallback(
    async list => {
      if (!collectionRef) return;
      const batch = writeBatch(firestore);
      const existing = state.transactions.map(item => item.id);
      existing.forEach(id => {
        batch.delete(doc(collectionRef, id));
      });
      (Array.isArray(list) ? list : []).forEach(item => {
        const docRef = doc(collectionRef, item.id);
        batch.set(docRef, {
          ...serializeTransaction(item),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      });
      await batch.commit();
    },
    [collectionRef, state.transactions]
  );

  const transactionMap = useMemo(() => toTransactionMap(state.transactions), [state.transactions]);

  return {
    transactions: state.transactions,
    status: state.status,
    error: state.error,
    initialLoadComplete: state.initialLoadComplete,
    addTransactions,
    updateTransaction,
    deleteTransactions,
    replaceAllTransactions,
    transactionMap
  };
}
