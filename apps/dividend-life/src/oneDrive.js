import {
  ONEDRIVE_AUTHORITY,
  ONEDRIVE_CLIENT_ID,
  ONEDRIVE_GRAPH_BASE,
  ONEDRIVE_SCOPES,
} from '../config';
import { transactionsToCsv, transactionsFromCsv } from './utils/csvUtils';

const CLIENT_ID = ONEDRIVE_CLIENT_ID || '';
const SCOPES = ONEDRIVE_SCOPES ? ONEDRIVE_SCOPES.split(' ').filter(Boolean) : ['Files.ReadWrite'];
const AUTHORITY = ONEDRIVE_AUTHORITY || 'https://login.microsoftonline.com/common';
const GRAPH_BASE = (ONEDRIVE_GRAPH_BASE || 'https://graph.microsoft.com').replace(/\/$/, '');
let msalInstance = null;
let accessToken = null;
let msalLoaded = false;
let activeAccount = null;

async function loadMsal() {
  if (msalLoaded) return;
  await new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.id = 'msal-sdk';
    script.src = 'https://alcdn.msauth.net/browser/2.38.0/js/msal-browser.min.js';
    script.onload = () => { msalLoaded = true; resolve(); };
    script.onerror = reject;
    document.body.appendChild(script);
  });
}

export async function initOneDrive() {
  if (typeof window === 'undefined') return null;
  if (!CLIENT_ID) throw new Error('OneDrive Client ID missing');
  await loadMsal();
  if (!msalInstance) {
    msalInstance = new window.msal.PublicClientApplication({
      auth: { clientId: CLIENT_ID, authority: AUTHORITY, redirectUri: window.location.origin }
    });
  }
  if (!activeAccount) {
    activeAccount = msalInstance.getActiveAccount() || msalInstance.getAllAccounts()[0] || null;
  }
  if (accessToken) return accessToken;
  if (activeAccount) {
    try {
      const res = await msalInstance.acquireTokenSilent({ scopes: SCOPES, account: activeAccount });
      accessToken = res.accessToken;
      return accessToken;
    } catch {
      // fallback to interactive login
    }
  }
  const res = await msalInstance.loginPopup({ scopes: SCOPES, prompt: 'select_account' });
  if (res.account) {
    activeAccount = res.account;
    msalInstance.setActiveAccount(res.account);
  }
  accessToken = res.accessToken;
  return accessToken;
}

export async function exportTransactionsToOneDrive(list) {
  const token = await initOneDrive();
  if (!token) return;
  const csv = transactionsToCsv(list);
  await fetch(`${GRAPH_BASE}/v1.0/me/drive/root:/inventory_backup.csv:/content`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'text/csv'
    },
    body: csv
  });
}

export async function importTransactionsFromOneDrive(options = {}) {
  const { includeMetadata = false, metadataOnly = false } = options;
  const token = await initOneDrive();
  if (!token) return null;
  try {
    const shouldSelect = includeMetadata || metadataOnly;
    const metadataRes = await fetch(
      `${GRAPH_BASE}/v1.0/me/drive/root:/inventory_backup.csv${shouldSelect ? '?$select=lastModifiedDateTime' : ''}`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    if (!metadataRes.ok) return null;
    const metadata = await metadataRes.json();
    const modifiedTime = metadata?.lastModifiedDateTime ? Date.parse(metadata.lastModifiedDateTime) : null;
    if (metadataOnly) {
      return { modifiedTime: Number.isFinite(modifiedTime) ? modifiedTime : null };
    }
    const res = await fetch(`${GRAPH_BASE}/v1.0/me/drive/root:/inventory_backup.csv:/content`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) return null;
    const text = await res.text();
    const transactions = transactionsFromCsv(text);
    if (includeMetadata) {
      return {
        list: transactions,
        modifiedTime: Number.isFinite(modifiedTime) ? modifiedTime : null
      };
    }
    return transactions;
  } catch (err) {
    console.error('OneDrive download failed', err);
    return null;
  }
}
