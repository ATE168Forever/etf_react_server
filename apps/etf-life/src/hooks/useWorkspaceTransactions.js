import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  getFirestoreInstance,
  getFirestoreModule
} from '../firebase/config';
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
  const firestoreDepsRef = useRef(null);

  const ensureFirestoreDeps = useCallback(async () => {
    if (firestoreDepsRef.current) {
      return firestoreDepsRef.current;
    }

    const [firestoreInstance, firestoreModule] = await Promise.all([
      getFirestoreInstance(),
      getFirestoreModule()
    ]);

    firestoreDepsRef.current = {
      firestore: firestoreInstance,
      module: firestoreModule
    };

    return firestoreDepsRef.current;
  }, []);

  useEffect(() => {
    if (!workspaceId) {
      setState(EMPTY_STATE);
      return undefined;
    }

    setState(prev => ({ ...prev, status: 'connecting', error: null }));

    let unsubscribe = () => {};
    let cancelled = false;

    ensureFirestoreDeps()
      .then(({ firestore: firestoreInstance, module }) => {
        if (cancelled) return;
        const collectionRef = module.collection(
          firestoreInstance,
          'workspaces',
          workspaceId,
          'transactions'
        );

        unsubscribe = module.onSnapshot(
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
      })
      .catch(error => {
        console.error('Firestore initialization failed', error);
        if (cancelled) return;
        setState({
          transactions: [],
          status: 'error',
          error,
          initialLoadComplete: true
        });
      });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [ensureFirestoreDeps, workspaceId]);

  const addTransactions = useCallback(
    async (list) => {
      if (!workspaceId || !Array.isArray(list) || list.length === 0) return;
      const { firestore: firestoreInstance, module } = await ensureFirestoreDeps();
      const collectionRef = module.collection(
        firestoreInstance,
        'workspaces',
        workspaceId,
        'transactions'
      );
      const batch = module.writeBatch(firestoreInstance);
      list.forEach(item => {
        const docRef = module.doc(collectionRef, item.id);
        batch.set(docRef, {
          ...serializeTransaction(item),
          createdAt: module.serverTimestamp(),
          updatedAt: module.serverTimestamp()
        });
      });
      await batch.commit();
    },
    [ensureFirestoreDeps, workspaceId]
  );

  const updateTransaction = useCallback(
    async (id, updates) => {
      if (!workspaceId || !id) return;
      const { firestore: firestoreInstance, module } = await ensureFirestoreDeps();
      const collectionRef = module.collection(
        firestoreInstance,
        'workspaces',
        workspaceId,
        'transactions'
      );
      const docRef = module.doc(collectionRef, id);
      await module.setDoc(
        docRef,
        {
          ...serializeTransaction({ id, ...updates }),
          updatedAt: module.serverTimestamp()
        },
        { merge: true }
      );
    },
    [ensureFirestoreDeps, workspaceId]
  );

  const deleteTransactions = useCallback(
    async ids => {
      if (!workspaceId || !Array.isArray(ids) || ids.length === 0) return;
      const { firestore: firestoreInstance, module } = await ensureFirestoreDeps();
      const collectionRef = module.collection(
        firestoreInstance,
        'workspaces',
        workspaceId,
        'transactions'
      );
      const batch = module.writeBatch(firestoreInstance);
      ids.forEach(id => {
        if (!id) return;
        batch.delete(module.doc(collectionRef, id));
      });
      await batch.commit();
    },
    [ensureFirestoreDeps, workspaceId]
  );

  const replaceAllTransactions = useCallback(
    async list => {
      if (!workspaceId) return;
      const { firestore: firestoreInstance, module } = await ensureFirestoreDeps();
      const collectionRef = module.collection(
        firestoreInstance,
        'workspaces',
        workspaceId,
        'transactions'
      );
      const batch = module.writeBatch(firestoreInstance);
      const existing = state.transactions.map(item => item.id);
      existing.forEach(id => {
        batch.delete(module.doc(collectionRef, id));
      });
      (Array.isArray(list) ? list : []).forEach(item => {
        const docRef = module.doc(collectionRef, item.id);
        batch.set(docRef, {
          ...serializeTransaction(item),
          createdAt: module.serverTimestamp(),
          updatedAt: module.serverTimestamp()
        });
      });
      await batch.commit();
    },
    [ensureFirestoreDeps, state.transactions, workspaceId]
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
