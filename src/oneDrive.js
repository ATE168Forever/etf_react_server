import { transactionsToCsv, transactionsFromCsv } from './csvUtils';

const CLIENT_ID = typeof window !== 'undefined' && window.ONEDRIVE_CLIENT_ID ? window.ONEDRIVE_CLIENT_ID : '';
const SCOPES = typeof window !== 'undefined' && window.ONEDRIVE_SCOPES ? window.ONEDRIVE_SCOPES.split(' ') : ['Files.ReadWrite'];
let msalInstance = null;
let accessToken = null;
let msalLoaded = false;

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
      auth: { clientId: CLIENT_ID, redirectUri: window.location.origin }
    });
  }
  if (accessToken) return accessToken;
  const accounts = msalInstance.getAllAccounts();
  if (accounts.length > 0) {
    try {
      const res = await msalInstance.acquireTokenSilent({ scopes: SCOPES, account: accounts[0] });
      accessToken = res.accessToken;
      return accessToken;
    } catch {
      // fallback to interactive login
    }
  }
  const res = await msalInstance.loginPopup({ scopes: SCOPES });
  accessToken = res.accessToken;
  return accessToken;
}

export async function exportTransactionsToOneDrive(list) {
  const token = await initOneDrive();
  if (!token) return;
  const csv = transactionsToCsv(list);
  await fetch('https://graph.microsoft.com/v1.0/me/drive/root:/inventory_backup.csv:/content', {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'text/csv'
    },
    body: csv
  });
}

export async function importTransactionsFromOneDrive() {
  const token = await initOneDrive();
  if (!token) return null;
  try {
    const res = await fetch('https://graph.microsoft.com/v1.0/me/drive/root:/inventory_backup.csv:/content', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) return null;
    const text = await res.text();
    return transactionsFromCsv(text);
  } catch (err) {
    console.error('OneDrive download failed', err);
    return null;
  }
}
