import { GOOGLE_API_KEY, GOOGLE_CLIENT_ID } from '../config';
import { transactionsToCsv, transactionsFromCsv } from './utils/csvUtils';

const CLIENT_ID = GOOGLE_CLIENT_ID || '';
const API_KEY = GOOGLE_API_KEY || '';
const SCOPES = 'https://www.googleapis.com/auth/drive.appdata';
const DISCOVERY_DOCS = ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'];
const GAPI_SCRIPT_ID = 'gapi';
const GAPI_SCRIPT_SRC = 'https://apis.google.com/js/api.js';
const GIS_SCRIPT_ID = 'gis';
const GIS_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';
const BACKUP_FILENAME = 'inventory_backup.csv';

let initialized = false;
let tokenClient;
let accessToken;

async function loadScript(id, src) {
  if (typeof document === 'undefined') return;
  if (document.getElementById(id)) return;
  await new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.id = id;
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.body.appendChild(script);
  });
}

async function requestGapiClient() {
  await new Promise((resolve, reject) => {
    window.gapi.load('client', {
      callback: resolve,
      onerror: reject
    });
  });
  await window.gapi.client.init({
    apiKey: API_KEY,
    discoveryDocs: DISCOVERY_DOCS
  });
}

function storeTokenResponse(response) {
  if (response?.error) {
    return { error: new Error(response.error) };
  }
  accessToken = response.access_token;
  window.gapi.client.setToken({ access_token: accessToken });
  return { token: accessToken };
}

function initialiseTokenClient() {
  const gis = window.google?.accounts?.oauth2?.initTokenClient;
  if (!gis) {
    throw new Error('Google Identity Services client could not be initialised');
  }

  tokenClient = gis({
    client_id: CLIENT_ID,
    scope: SCOPES,
    callback: (response) => {
      const result = storeTokenResponse(response);
      if (result.error) {
        console.error(result.error);
      }
    }
  });
}

export async function initDrive() {
  if (initialized) return;
  await loadScript(GAPI_SCRIPT_ID, GAPI_SCRIPT_SRC);
  await loadScript(GIS_SCRIPT_ID, GIS_SCRIPT_SRC);
  await requestGapiClient();
  initialiseTokenClient();
  initialized = true;
}

export function isDriveAuthenticated() {
  return !!accessToken;
}

let silentAuthPromise = null;

// Attempts to get a token silently (no popup). Returns null if auth requires user interaction.
// Concurrent calls share the same promise to avoid callback conflicts.
async function ensureAccessTokenSilent() {
  if (accessToken) return accessToken;
  if (silentAuthPromise) return silentAuthPromise;
  await initDrive();
  silentAuthPromise = new Promise((resolve) => {
    const timer = setTimeout(() => {
      silentAuthPromise = null;
      resolve(null);
    }, 5000);
    const prev = tokenClient.callback;
    tokenClient.callback = (response) => {
      clearTimeout(timer);
      tokenClient.callback = prev;
      silentAuthPromise = null;
      if (response?.error || !response?.access_token) {
        resolve(null);
      } else {
        storeTokenResponse(response);
        resolve(response.access_token);
      }
    };
    try {
      tokenClient.requestAccessToken({ prompt: '' });
    } catch {
      clearTimeout(timer);
      silentAuthPromise = null;
      resolve(null);
    }
  });
  return silentAuthPromise;
}

async function ensureAccessToken() {
  if (!tokenClient) {
    throw new Error('Google Identity Services client has not been initialised');
  }
  if (accessToken) {
    return accessToken;
  }

  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isZh = navigator.language && navigator.language.toLowerCase().startsWith('zh');

  return new Promise((resolve, reject) => {
    let resolved = false;
    const timeoutId = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        let errorMsg;
        if (isMobile) {
          errorMsg = isZh
            ? 'Google 驗證逾時。手機瀏覽器可能封鎖彈出視窗。請：\n1. 在瀏覽器設定中允許此網站的彈出視窗\n2. 重試\n3. 或使用電腦瀏覽器以便存取'
            : 'Google authentication timed out. Mobile browsers may block popups. Please:\n1. Enable popups for this site in your browser settings\n2. Try again\n3. Or use desktop browser for easier access';
        } else {
          errorMsg = isZh
            ? 'Google 驗證逾時。請重試並允許彈出視窗。'
            : 'Google authentication timed out. Please try again and allow popups if prompted.';
        }
        reject(new Error(errorMsg));
      }
    }, 60000);

    tokenClient.callback = (response) => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timeoutId);

      const result = storeTokenResponse(response);
      if (result.error) {
        reject(result.error);
        return;
      }
      resolve(result.token);
    };
    try {
      tokenClient.requestAccessToken({ prompt: accessToken ? '' : 'consent' });
    } catch (error) {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeoutId);
        let errorMsg;
        if (isMobile) {
          errorMsg = isZh
            ? `Google 驗證失敗。手機瀏覽器可能封鎖彈出視窗。錯誤：${error.message || error}`
            : `Google authentication failed. Mobile browsers may block popups. Error: ${error.message || error}`;
        } else {
          errorMsg = error.message || error;
        }
        reject(new Error(errorMsg));
      }
    }
  });
}

async function findBackupFile(token) {
  const listResult = await window.gapi.client.drive.files.list({
    spaces: 'appDataFolder',
    q: `name='${BACKUP_FILENAME}'`,
    fields: 'files(id)',
    pageSize: 1,
  });
  return listResult.result.files?.[0]?.id ?? null;
}

export async function exportTransactionsToDrive(list, { silent = false } = {}) {
  await initDrive();
  const token = silent ? await ensureAccessTokenSilent() : await ensureAccessToken();
  if (!token) throw new Error('Not authenticated');

  const csv = transactionsToCsv(list);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });

  const existingFileId = await findBackupFile(token);

  if (existingFileId) {
    // Update existing file content (no metadata change needed)
    const res = await fetch(
      `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=media`,
      {
        method: 'PATCH',
        headers: new Headers({
          'Authorization': 'Bearer ' + token,
          'Content-Type': 'text/csv',
        }),
        body: blob,
      }
    );
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Drive PATCH failed ${res.status}: ${text}`);
    }
  } else {
    // Create new file in appDataFolder
    const metadata = {
      name: BACKUP_FILENAME,
      mimeType: 'text/csv',
      parents: ['appDataFolder'],
    };
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', blob);
    const res = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id',
      {
        method: 'POST',
        headers: new Headers({ 'Authorization': 'Bearer ' + token }),
        body: form,
      }
    );
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Drive POST failed ${res.status}: ${text}`);
    }
    await res.json();
  }
}

export async function importTransactionsFromDrive(options = {}) {
  const { includeMetadata = false, metadataOnly = false, silent = false } = options;
  await initDrive();
  if (silent) {
    const token = await ensureAccessTokenSilent();
    if (!token) return null;
  } else {
    await ensureAccessToken();
  }
  const fields = metadataOnly || includeMetadata ? 'files(id, modifiedTime)' : 'files(id)';
  const list = await window.gapi.client.drive.files.list({
    spaces: 'appDataFolder',
    q: `name='${BACKUP_FILENAME}'`,
    fields,
    orderBy: 'modifiedTime desc',
    pageSize: 1,
  });
  if (!list.result.files || list.result.files.length === 0) return null;
  const fileEntry = list.result.files[0];
  const fileId = fileEntry.id;
  const modifiedTime = fileEntry?.modifiedTime ? Date.parse(fileEntry.modifiedTime) : null;
  if (metadataOnly) {
    return { modifiedTime: Number.isFinite(modifiedTime) ? modifiedTime : null };
  }
  const file = await window.gapi.client.drive.files.get({ fileId, alt: 'media' });
  const transactions = transactionsFromCsv(file.body);
  if (includeMetadata) {
    return {
      list: transactions,
      modifiedTime: Number.isFinite(modifiedTime) ? modifiedTime : null
    };
  }
  return transactions;
}
