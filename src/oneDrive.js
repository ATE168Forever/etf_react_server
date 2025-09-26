import { transactionsToCsv, transactionsFromCsv } from './utils/csvUtils';

const importMetaEnv = (() => {
  try {
    return Function('return typeof import.meta !== "undefined" ? import.meta.env : undefined;')();
  } catch {
    return undefined;
  }
})();

function resolveWindowString(key, { fallback = '', allowPercentPlaceholders = false } = {}) {
  let rawValue = null;

  if (typeof window !== 'undefined') {
    rawValue = window[key];
  }

  const maybeUseImportMetaEnv = value => {
    const shouldFallback =
      typeof value !== 'string' ||
      !value.trim() ||
      value.trim() === 'undefined' ||
      (!allowPercentPlaceholders && /^%[A-Z0-9_]+%$/i.test(value.trim()));
    if (!shouldFallback) {
      return value;
    }
    if (importMetaEnv) {
      const envKey = `VITE_${key}`;
      const envValue = importMetaEnv[envKey];
      if (typeof envValue === 'string') {
        return envValue;
      }
    }
    return null;
  };

  rawValue = maybeUseImportMetaEnv(rawValue);

  if (typeof rawValue !== 'string') {
    return fallback;
  }

  const trimmed = rawValue.trim();
  if (!trimmed || trimmed === 'undefined') return fallback;
  if (!allowPercentPlaceholders && /^%[A-Z0-9_]+%$/i.test(trimmed)) {
    return fallback;
  }
  return trimmed;
}

const CLIENT_ID = resolveWindowString('ONEDRIVE_CLIENT_ID');
const RAW_SCOPES = resolveWindowString('ONEDRIVE_SCOPES', { allowPercentPlaceholders: true });
const DEFAULT_SCOPES = ['Files.ReadWrite'];
const BASE_OPENID_SCOPES = ['openid', 'profile'];
const AUTHORITY =
  resolveWindowString('ONEDRIVE_AUTHORITY') || 'https://login.microsoftonline.com/common';
const GRAPH_BASE =
  (resolveWindowString('ONEDRIVE_GRAPH_BASE') || 'https://graph.microsoft.com').replace(/\/$/, '');
let msalInstance = null;
let accessToken = null;
let msalLoaded = false;
let activeAccount = null;

export function isOneDriveConfigured() {
  return Boolean(CLIENT_ID);
}

const SCOPES = (() => {
  const input = typeof RAW_SCOPES === 'string' ? RAW_SCOPES : '';
  const requested = input
    .split(/[\s,]+/)
    .map(scope => scope.trim())
    .filter(Boolean);
  const allScopes = new Set([...DEFAULT_SCOPES, ...BASE_OPENID_SCOPES, ...requested]);
  allScopes.add('offline_access');
  return Array.from(allScopes);
})();

async function loadMsal() {
  if (msalLoaded) return;
  await new Promise((resolve, reject) => {
    const existing = document.getElementById('msal-sdk');
    if (existing) {
      msalLoaded = true;
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.id = 'msal-sdk';
    script.src = 'https://alcdn.msauth.net/browser/2.38.0/js/msal-browser.min.js';
    script.onload = () => {
      msalLoaded = true;
      resolve();
    };
    script.onerror = reject;
    document.body.appendChild(script);
  });
}

async function ensureMsalInstance() {
  if (typeof window === 'undefined') {
    throw new Error('OneDrive integration requires a browser environment');
  }
  if (!CLIENT_ID) {
    throw new Error('OneDrive Client ID missing');
  }
  await loadMsal();
  if (!msalInstance) {
    msalInstance = new window.msal.PublicClientApplication({
      auth: {
        clientId: CLIENT_ID,
        authority: AUTHORITY,
        redirectUri: window.location.origin
      },
      cache: {
        cacheLocation: 'localStorage',
        storeAuthStateInCookie: false
      }
    });
    if (typeof msalInstance.initialize === 'function') {
      await msalInstance.initialize();
    }
  }
  if (!activeAccount) {
    activeAccount = msalInstance.getActiveAccount() || msalInstance.getAllAccounts()[0] || null;
    if (activeAccount) {
      msalInstance.setActiveAccount(activeAccount);
    }
  }
}

function normalizeMsalError(error) {
  if (!error) return new Error('Unknown OneDrive authentication error');
  const message = typeof error.message === 'string' ? error.message : '';
  const errorCode = typeof error.errorCode === 'string' ? error.errorCode : '';
  if (/invalid_client/i.test(message) || errorCode === 'invalid_client' || /AADSTS70002/.test(message)) {
    return new Error(
      'OneDrive authentication failed because the Azure application expects a client secret. ' +
        'Update the app registration to use the “Single-page application” platform (public client) ' +
        'or enable the OAuth public client flow.'
    );
  }
  if (error instanceof Error) return error;
  return new Error(message || 'Unknown OneDrive authentication error');
}

function requiresInteraction(error) {
  if (!error) return false;
  const code = typeof error.errorCode === 'string' ? error.errorCode : '';
  if (code) {
    const lower = code.toLowerCase();
    if (lower.includes('consent_required') || lower.includes('interaction_required')) {
      return true;
    }
  }
  if (typeof window !== 'undefined' && window.msal && window.msal.InteractionRequiredAuthError) {
    return error instanceof window.msal.InteractionRequiredAuthError;
  }
  const message = typeof error.message === 'string' ? error.message : '';
  return /consent required/i.test(message) || /interaction required/i.test(message);
}

async function acquireAccessToken(options = {}) {
  const { forceLogin = false } = options;
  await ensureMsalInstance();

  const request = { scopes: SCOPES };
  if (activeAccount) {
    request.account = activeAccount;
  }

  const trySilent = async () => {
    if (!activeAccount) return null;
    try {
      const result = await msalInstance.acquireTokenSilent(request);
      if (result?.account) {
        activeAccount = result.account;
        msalInstance.setActiveAccount(result.account);
      }
      return result;
    } catch (error) {
      if (requiresInteraction(error)) {
        return null;
      }
      throw normalizeMsalError(error);
    }
  };

  let result = null;
  if (!forceLogin) {
    result = await trySilent();
    if (result?.accessToken) {
      return result.accessToken;
    }
  }

  try {
    const interactiveResult = await msalInstance.acquireTokenPopup({
      scopes: SCOPES,
      prompt: activeAccount ? 'login' : 'select_account',
      ...(activeAccount ? { account: activeAccount } : {})
    });
    if (interactiveResult?.account) {
      activeAccount = interactiveResult.account;
      msalInstance.setActiveAccount(interactiveResult.account);
    }
    return interactiveResult?.accessToken || null;
  } catch (error) {
    throw normalizeMsalError(error);
  }
}

export async function initOneDrive(options = {}) {
  if (accessToken && !options.forceLogin) {
    return accessToken;
  }
  accessToken = await acquireAccessToken({ forceLogin: options.forceLogin });
  return accessToken;
}

async function fetchWithOneDriveToken(url, { method = 'GET', headers = {}, body } = {}) {
  let token = await initOneDrive();
  if (!token) return null;

  const performFetch = async () =>
    fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...headers
      },
      body
    });

  let response = await performFetch();
  if (response.status === 401) {
    accessToken = null;
    token = await initOneDrive({ forceLogin: true });
    if (!token) return response;
    response = await performFetch();
  }
  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    const errorMessage = errorText ? `${response.status}: ${errorText}` : `${response.status}`;
    throw new Error(`OneDrive request failed (${errorMessage})`);
  }
  return response;
}

export async function exportTransactionsToOneDrive(list) {
  const csv = transactionsToCsv(list);
  await fetchWithOneDriveToken(`${GRAPH_BASE}/v1.0/me/drive/root:/inventory_backup.csv:/content`, {
    method: 'PUT',
    headers: { 'Content-Type': 'text/csv' },
    body: csv
  });
}

export async function importTransactionsFromOneDrive() {
  try {
    const res = await fetchWithOneDriveToken(
      `${GRAPH_BASE}/v1.0/me/drive/root:/inventory_backup.csv:/content`
    );
    if (!res) return null;
    const text = await res.text();
    return transactionsFromCsv(text);
  } catch (err) {
    console.error('OneDrive download failed', err);
    return null;
  }
}
