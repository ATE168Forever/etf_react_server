import { useEffect, useMemo, useState } from 'react';
import {
  addDoc,
  auth,
  collection,
  db,
  doc,
  firestoreServerTimestamp,
  getDocs,
  googleProvider,
  onAuthStateChanged,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  signInWithPopup,
  signOut,
} from './firebase';
import {
  decryptString,
  deriveKeyFromPassphrase,
  encryptString,
} from './utils/crypto';
import './App.css';

const categories = [
  { id: 'housing', label: 'Housing' },
  { id: 'food', label: 'Food & Dining' },
  { id: 'transport', label: 'Transportation' },
  { id: 'leisure', label: 'Leisure' },
  { id: 'savings', label: 'Savings' },
];

export default function App() {
  const [user, setUser] = useState(null);
  const [workspaceId, setWorkspaceId] = useState('personal');
  const [rawTransactions, setRawTransactions] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [encryptionPassphrase, setEncryptionPassphrase] = useState('');
  const [encryptionKey, setEncryptionKey] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const [form, setForm] = useState({
    description: '',
    amount: '',
    category: categories[0].id,
  });
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setStatusMessage('');
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function updateKey() {
      if (!encryptionPassphrase) {
        setEncryptionKey(null);
        return;
      }

      try {
        const key = await deriveKeyFromPassphrase(encryptionPassphrase, workspaceId);
        if (!cancelled) {
          setEncryptionKey(key);
        }
      } catch (error) {
        console.error('Failed to derive key', error);
        if (!cancelled) {
          setEncryptionKey(null);
        }
      }
    }

    updateKey();

    return () => {
      cancelled = true;
    };
  }, [encryptionPassphrase, workspaceId]);

  useEffect(() => {
    if (!user) {
      setRawTransactions([]);
      setLastSyncedAt(null);
      return undefined;
    }

    const workspaceDocRef = doc(db, 'users', user.uid, 'workspaces', workspaceId);
    setLastSyncedAt(null);
    setDoc(
      workspaceDocRef,
      {
        ownerId: user.uid,
        workspaceId,
        updatedAt: firestoreServerTimestamp(),
      },
      { merge: true }
    ).catch((error) => {
      console.error('Failed to upsert workspace metadata', error);
    });

    const transactionsQuery = query(
      collection(workspaceDocRef, 'transactions'),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(transactionsQuery, (snapshot) => {
      const docs = snapshot.docs.map((transactionDoc) => ({
        id: transactionDoc.id,
        data: transactionDoc.data(),
      }));
      setRawTransactions(docs);
      setLastSyncedAt(new Date());
    });

    return unsubscribe;
  }, [user, workspaceId]);

  useEffect(() => {
    let cancelled = false;

    async function transformTransactions() {
      const processed = await Promise.all(
        rawTransactions.map(async ({ id, data }) => {
          let description = data.description ?? '';

          if (data.encryptedDescription) {
            if (encryptionKey) {
              try {
                description = await decryptString(encryptionKey, data.encryptedDescription);
              } catch (error) {
                console.warn('Failed to decrypt description', error);
                description = '[Unable to decrypt]';
              }
            } else {
              description = '[Passphrase required]';
            }
          }

          return {
            id,
            amount: data.amount,
            category: data.category,
            description,
            updatedAt: data.updatedAt,
          };
        })
      );

      if (!cancelled) {
        setTransactions(processed);
      }
    }

    transformTransactions();

    return () => {
      cancelled = true;
    };
  }, [rawTransactions, encryptionKey]);

  const total = useMemo(
    () => transactions.reduce((sum, transaction) => sum + (Number(transaction.amount) || 0), 0),
    [transactions]
  );

  const formattedLastSyncedAt = useMemo(
    () =>
      lastSyncedAt
        ? lastSyncedAt.toLocaleString(undefined, {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })
        : '',
    [lastSyncedAt]
  );

  const handleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Failed to sign in', error);
      setStatusMessage('登入失敗，請稍後再試。');
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setRawTransactions([]);
      setTransactions([]);
    } catch (error) {
      console.error('Failed to sign out', error);
      setStatusMessage('登出失敗，請稍後再試。');
    }
  };

  const handleFormSubmit = async (event) => {
    event.preventDefault();
    setStatusMessage('');

    if (!user) {
      setStatusMessage('請先登入再新增交易。');
      return;
    }

    const amountValue = Number(form.amount);
    if (Number.isNaN(amountValue)) {
      setStatusMessage('金額必須為數字。');
      return;
    }

    try {
      const workspaceDocRef = doc(db, 'users', user.uid, 'workspaces', workspaceId);
      const transactionsCollection = collection(workspaceDocRef, 'transactions');
      let encryptedDescription = null;
      let description = form.description.trim();

      if (encryptionKey && description) {
        encryptedDescription = await encryptString(encryptionKey, description);
        description = null;
      }

      await addDoc(transactionsCollection, {
        ownerId: user.uid,
        workspaceId,
        category: form.category,
        amount: amountValue,
        description,
        encryptedDescription,
        createdAt: firestoreServerTimestamp(),
        updatedAt: firestoreServerTimestamp(),
      });

      setForm((current) => ({ ...current, description: '', amount: '' }));
      setStatusMessage('交易已新增並同步。');
    } catch (error) {
      console.error('Failed to add transaction', error);
      setStatusMessage('新增交易時發生錯誤。');
    }
  };

  const handleManualSync = async () => {
    if (!user) {
      setStatusMessage('請先登入以觸發同步。');
      return;
    }

    setIsSyncing(true);
    setStatusMessage('手動同步中…');

    try {
      const workspaceDocRef = doc(db, 'users', user.uid, 'workspaces', workspaceId);
      const transactionsCollection = collection(workspaceDocRef, 'transactions');
      const transactionsQuery = query(transactionsCollection, orderBy('updatedAt', 'desc'));
      const snapshot = await getDocs(transactionsQuery);
      const docs = snapshot.docs.map((transactionDoc) => ({
        id: transactionDoc.id,
        data: transactionDoc.data(),
      }));

      setRawTransactions(docs);
      setLastSyncedAt(new Date());
      setStatusMessage('手動同步完成。');
    } catch (error) {
      console.error('Failed to manually sync transactions', error);
      setStatusMessage('手動同步失敗，請稍後再試。');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="app">
      <header className="hero">
        <div>
          <h1>Budget Life</h1>
          <p className="tagline">使用 Firebase 即時同步你的生活開銷。</p>
        </div>
        <div className="auth">
          {user ? (
            <>
              <span className="user-name">{user.displayName ?? user.email}</span>
              <button className="secondary" type="button" onClick={handleSignOut}>
                登出
              </button>
            </>
          ) : (
            <button className="primary" type="button" onClick={handleSignIn}>
              使用 Google 登入
            </button>
          )}
        </div>
      </header>

      <section className="workspace" aria-label="workspace settings">
        <div className="field">
          <label htmlFor="workspace">Workspace</label>
          <input
            id="workspace"
            value={workspaceId}
            onChange={(event) => setWorkspaceId(event.target.value.trim().toLowerCase() || 'personal')}
            placeholder="輸入 workspace ID"
          />
        </div>
        <div className="field">
          <label htmlFor="passphrase">加密 Passphrase（選填）</label>
          <input
            id="passphrase"
            type="password"
            value={encryptionPassphrase}
            onChange={(event) => setEncryptionPassphrase(event.target.value)}
            placeholder="提供 Passphrase 以解密敏感資料"
          />
        </div>
        <div className="sync-controls" aria-live="polite">
          <button
            className="secondary"
            type="button"
            onClick={handleManualSync}
            disabled={!user || isSyncing}
          >
            {isSyncing ? '同步中…' : '立即同步'}
          </button>
          <p className="sync-hint">登入後會自動同步交易紀錄，亦可隨時手動刷新。</p>
          {formattedLastSyncedAt && <p className="sync-meta">上次同步：{formattedLastSyncedAt}</p>}
        </div>
      </section>

      <section className="summary" aria-live="polite">
        <h2>Workspace 總覽</h2>
        <p className="summary-total">
          <span aria-label="currency">$</span>
          {total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
      </section>

      {user && (
        <section className="form-section" aria-label="新增交易">
          <h2>新增交易</h2>
          <form onSubmit={handleFormSubmit} className="transaction-form">
            <label className="field">
              <span>描述</span>
              <input
                required
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                placeholder="例如：午餐"
              />
            </label>
            <label className="field">
              <span>分類</span>
              <select
                value={form.category}
                onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
              >
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>金額</span>
              <input
                required
                inputMode="decimal"
                value={form.amount}
                onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
                placeholder="0.00"
              />
            </label>
            <button className="primary" type="submit">
              儲存
            </button>
          </form>
        </section>
      )}

      {statusMessage && <p className="status-message">{statusMessage}</p>}

      <section className="transactions" aria-label="交易列表">
        <h2>交易記錄</h2>
        <table>
          <thead>
            <tr>
              <th scope="col">描述</th>
              <th scope="col">分類</th>
              <th scope="col" className="numeric">
                金額
              </th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((transaction) => (
              <tr key={transaction.id}>
                <td>{transaction.description || '—'}</td>
                <td>{categories.find((category) => category.id === transaction.category)?.label ?? transaction.category}</td>
                <td className="numeric">
                  ${Number(transaction.amount ?? 0).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </td>
              </tr>
            ))}
            {transactions.length === 0 && (
              <tr>
                <td colSpan={3} className="empty">
                  尚未有任何交易紀錄。
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
