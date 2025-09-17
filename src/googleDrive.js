import { transactionsToCsv, transactionsFromCsv } from './csvUtils';

const CLIENT_ID = typeof window !== 'undefined' && window.GOOGLE_CLIENT_ID ? window.GOOGLE_CLIENT_ID : '';
const API_KEY = typeof window !== 'undefined' && window.GOOGLE_API_KEY ? window.GOOGLE_API_KEY : '';
const SCOPES = 'https://www.googleapis.com/auth/drive.file';
const DISCOVERY_DOCS = ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'];
const GAPI_SCRIPT_ID = 'gapi';
const GAPI_SCRIPT_SRC = 'https://apis.google.com/js/api.js';
const GIS_SCRIPT_ID = 'gis';
const GIS_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

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
        // eslint-disable-next-line no-console
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

async function ensureAccessToken() {
  if (!tokenClient) {
    throw new Error('Google Identity Services client has not been initialised');
  }
  if (accessToken) {
    return accessToken;
  }
  return new Promise((resolve, reject) => {
    tokenClient.callback = (response) => {
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
      reject(error);
    }
  });
}

export async function exportTransactionsToDrive(list) {
  await initDrive();
  const token = await ensureAccessToken();
  const csv = transactionsToCsv(list);
  const file = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const metadata = { name: 'inventory_backup.csv', mimeType: 'text/csv' };
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', file);
  await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id', {
    method: 'POST',
    headers: new Headers({ 'Authorization': 'Bearer ' + token }),
    body: form
  });
}

export async function importTransactionsFromDrive() {
  await initDrive();
  await ensureAccessToken();
  const list = await window.gapi.client.drive.files.list({
    q: "name='inventory_backup.csv' and trashed=false",
    fields: 'files(id)'
  });
  if (!list.result.files || list.result.files.length === 0) return null;
  const fileId = list.result.files[0].id;
  const file = await window.gapi.client.drive.files.get({ fileId, alt: 'media' });
  return transactionsFromCsv(file.body);
}
