const CLIENT_ID = typeof window !== 'undefined' && window.GOOGLE_CLIENT_ID ? window.GOOGLE_CLIENT_ID : '';
const API_KEY = typeof window !== 'undefined' && window.GOOGLE_API_KEY ? window.GOOGLE_API_KEY : '';
const SCOPES = 'https://www.googleapis.com/auth/drive.file';
const DISCOVERY_DOCS = ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'];
let initialized = false;

async function loadScript() {
  if (document.getElementById('gapi')) return;
  await new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.id = 'gapi';
    script.src = 'https://apis.google.com/js/api.js';
    script.onload = resolve;
    script.onerror = reject;
    document.body.appendChild(script);
  });
}

export async function initDrive() {
  if (initialized) return;
  await loadScript();
  await new Promise((resolve) => {
    window.gapi.load('client:auth2', resolve);
  });
  await window.gapi.client.init({
    apiKey: API_KEY,
    clientId: CLIENT_ID,
    discoveryDocs: DISCOVERY_DOCS,
    scope: SCOPES
  });
  initialized = true;
}

async function ensureSignedIn() {
  const auth = window.gapi.auth2.getAuthInstance();
  if (!auth.isSignedIn.get()) {
    await auth.signIn();
  }
}

function toCsv(codes) {
  const header = ['stock_id'];
  return '\ufeff' + [header.join(','), ...codes].join('\n');
}

function fromCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length <= 1) return [];
  const [, ...rows] = lines;
  return rows.filter(line => line.trim()).map(code => code.trim());
}

export async function exportTransactionsToDrive(codes) {
  await initDrive();
  await ensureSignedIn();
  const csv = toCsv(codes);
  const file = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const metadata = { name: 'inventory_backup.csv', mimeType: 'text/csv' };
  const accessToken = window.gapi.auth.getToken().access_token;
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', file);
  await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id', {
    method: 'POST',
    headers: new Headers({ 'Authorization': 'Bearer ' + accessToken }),
    body: form
  });
}

export async function importTransactionsFromDrive() {
  await initDrive();
  await ensureSignedIn();
  const list = await window.gapi.client.drive.files.list({
    q: "name='inventory_backup.csv' and trashed=false",
    fields: 'files(id)'
  });
  if (!list.result.files || list.result.files.length === 0) return null;
  const fileId = list.result.files[0].id;
  const file = await window.gapi.client.drive.files.get({ fileId, alt: 'media' });
  return fromCsv(file.body);
}
