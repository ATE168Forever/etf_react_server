import { transactionsToCsv, transactionsFromCsv } from './csvUtils';

const APP_KEY = typeof window !== 'undefined' && window.DROPBOX_APP_KEY ? window.DROPBOX_APP_KEY : '';
let dropboxInstance = null;
let initialized = false;

async function loadScript() {
  if (document.getElementById('dropbox-sdk')) return;
  await new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.id = 'dropbox-sdk';
    script.src = 'https://unpkg.com/dropbox/dist/Dropbox-sdk.min.js';
    script.onload = resolve;
    script.onerror = reject;
    document.body.appendChild(script);
  });
}

export async function initDropbox() {
  if (initialized) return dropboxInstance;
  if (typeof window === 'undefined') return null;
  if (!APP_KEY) throw new Error('Dropbox App Key missing');
  await loadScript();

  let accessToken = window.localStorage.getItem('DROPBOX_ACCESS_TOKEN');
  const match = window.location.hash.match(/access_token=([^&]+)/);
  if (match) {
    accessToken = match[1];
    window.localStorage.setItem('DROPBOX_ACCESS_TOKEN', accessToken);
    window.location.hash = '';
  }
  if (!accessToken) {
    const auth = new window.Dropbox.DropboxAuth({ clientId: APP_KEY });
    const authUrl = await auth.getAuthenticationUrl(window.location.href);
    window.location.href = authUrl;
    return null;
  }
  dropboxInstance = new window.Dropbox.Dropbox({ accessToken });
  initialized = true;
  return dropboxInstance;
}

export async function exportTransactionsToDropbox(list) {
  const dbx = await initDropbox();
  if (!dbx) return;
  const csv = transactionsToCsv(list);
  await dbx.filesUpload({
    path: '/inventory_backup.csv',
    contents: csv,
    mode: { '.tag': 'overwrite' }
  });
}

export async function importTransactionsFromDropbox() {
  const dbx = await initDropbox();
  if (!dbx) return null;
  try {
    const res = await dbx.filesDownload({ path: '/inventory_backup.csv' });
    const blob = res.result.fileBlob || res.fileBlob;
    const text = await blob.text();
    return transactionsFromCsv(text);
  } catch (err) {
    console.error('Dropbox download failed', err);
    return null;
  }
}
