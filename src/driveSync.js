/* global google */
const CLIENT_ID = "966996991391-dishfmvmvkhtpjm86bcr146j7mbop4rk.apps.googleusercontent.com";
const SCOPE = "https://www.googleapis.com/auth/drive.appdata";

let tokenClient;
let accessToken;
let tokenExpiry = 0;

function ensureToken() {
  return new Promise((resolve, reject) => {
    const now = Date.now();
    if (accessToken && now < tokenExpiry - 60_000) {
      resolve(accessToken);
      return;
    }

    const handleResp = (resp) => {
      if (resp?.access_token) {
        accessToken = resp.access_token;
        tokenExpiry = Date.now() + (resp.expires_in || 0) * 1000;
        resolve(accessToken);
      } else if (resp?.error === 'consent_required' || resp?.error === 'interaction_required') {
        tokenClient.callback = handleResp;
        tokenClient.requestAccessToken({ prompt: 'consent' });
      } else {
        reject(resp?.error || 'no access token');
      }
    };

    if (!tokenClient) {
      tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPE,
        callback: handleResp,
      });
    } else {
      tokenClient.callback = handleResp;
    }

    tokenClient.requestAccessToken({ prompt: '' });
  });
}

const KEYS = ["watchGroups", "my_transaction_history"];

function snapshotLocal() {
  const local = {};
  KEYS.forEach(k => local[k] = localStorage.getItem(k));
  return { version: 1, ts: Date.now(), local };
}

async function deriveKey(passphrase, salt = "app-sync-salt:v1") {
  const enc = new TextEncoder();
  const km = await crypto.subtle.importKey("raw", enc.encode(passphrase), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: enc.encode(salt), iterations: 120000, hash: "SHA-256" },
    km, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]
  );
}

async function encryptJSON(obj, pass) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(pass);
  const data = new TextEncoder().encode(JSON.stringify(obj));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data);
  return btoa(JSON.stringify({ iv: Array.from(iv), ct: Array.from(new Uint8Array(ct)) }));
}

async function decryptJSON(b64, pass) {
  const { iv, ct } = JSON.parse(atob(b64));
  const key = await deriveKey(pass);
  const buf = new Uint8Array(ct).buffer;
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: new Uint8Array(iv) }, key, buf);
  return JSON.parse(new TextDecoder().decode(plain));
}

async function findBackupId(accessToken, filename = "app-state.json") {
  const q = encodeURIComponent(`name='${filename}' and 'appDataFolder' in parents and trashed=false`);
  const r = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&spaces=appDataFolder&fields=files(id,name)`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  const data = await r.json();
  return data.files?.[0]?.id || null;
}

async function uploadNew(accessToken, content, filename = "app-state.json") {
  const metadata = { name: filename, parents: ["appDataFolder"] };
  const boundary = "foo_bar_baz_" + Math.random().toString(36).slice(2);
  const body =
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: application/octet-stream\r\n\r\n` +
    `${content}\r\n` +
    `--${boundary}--`;

  const r = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": `multipart/related; boundary=${boundary}`,
    },
    body
  });
  if (!r.ok) throw new Error("upload failed");
  return r.json();
}

async function updateExisting(accessToken, fileId, content) {
  const r = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/octet-stream",
    },
    body: content
  });
  if (!r.ok) throw new Error("update failed");
  return r.json();
}

async function downloadContent(accessToken, fileId) {
  const r = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!r.ok) throw new Error("download failed");
  return r.text();
}

export async function exportToDrive() {
  const pass = prompt("設定/輸入你的同步密碼（用來加密備份）");
  if (!pass) return;
  try {
    const token = await ensureToken();
    const snap = snapshotLocal();
    const encrypted = await encryptJSON(snap, pass);

    const existingId = await findBackupId(token);
    if (existingId) await updateExisting(token, existingId, encrypted);
    else await uploadNew(token, encrypted);
    alert("已匯出到 Google Drive（appDataFolder）");
  } catch (err) {
    console.error(err);
    alert(`匯出失敗：${err.message || err}`);
  }
}

export async function importFromDrive() {
  const pass = prompt("輸入你的同步密碼（用來解密備份）");
  if (!pass) return;
  try {
    const token = await ensureToken();
    const fileId = await findBackupId(token);
    if (!fileId) { alert("找不到備份檔"); return; }
    const encrypted = await downloadContent(token, fileId);
    const snap = await decryptJSON(encrypted, pass);

    Object.entries(snap.local || {}).forEach(([k, v]) => {
      if (v !== null && v !== undefined) localStorage.setItem(k, v);
    });
    alert("已匯入完成");
  } catch (err) {
    console.error(err);
    alert(`匯入失敗：${err.message || err}`);
  }
}

export default { exportToDrive, importFromDrive };
