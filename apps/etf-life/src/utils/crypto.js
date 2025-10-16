const TEXT_ENCODER = new TextEncoder();
const TEXT_DECODER = new TextDecoder();
const PBKDF2_ITERATIONS = 100_000;
const PBKDF2_HASH = 'SHA-256';
const AES_ALGORITHM = 'AES-GCM';
const AES_KEY_LENGTH = 256;
const DEFAULT_IV_LENGTH = 12;

function requireSubtleCrypto() {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    throw new Error('WebCrypto API is not available in this environment.');
  }
  return crypto.subtle;
}

function bufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  bytes.forEach(byte => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function base64ToBuffer(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export async function importKeyFromPassphrase(passphrase, salt) {
  const subtle = requireSubtleCrypto();
  const passphraseBytes = TEXT_ENCODER.encode(passphrase);
  const saltBytes = TEXT_ENCODER.encode(salt);
  const baseKey = await subtle.importKey('raw', passphraseBytes, 'PBKDF2', false, ['deriveKey']);
  return subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations: PBKDF2_ITERATIONS,
      hash: PBKDF2_HASH
    },
    baseKey,
    { name: AES_ALGORITHM, length: AES_KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptString(value, key, options = {}) {
  if (typeof value !== 'string') {
    throw new TypeError('Value to encrypt must be a string.');
  }
  const subtle = requireSubtleCrypto();
  const iv = options.iv
    ? new Uint8Array(base64ToBuffer(options.iv))
    : crypto.getRandomValues(new Uint8Array(DEFAULT_IV_LENGTH));
  const encoded = TEXT_ENCODER.encode(value);
  const ciphertext = await subtle.encrypt({ name: AES_ALGORITHM, iv }, key, encoded);
  return {
    iv: bufferToBase64(iv.buffer),
    ciphertext: bufferToBase64(ciphertext)
  };
}

export async function decryptString(payload, key) {
  const subtle = requireSubtleCrypto();
  const { iv, ciphertext } = payload || {};
  if (typeof iv !== 'string' || typeof ciphertext !== 'string') {
    throw new TypeError('Cipher payload must include base64 iv and ciphertext.');
  }
  const ivBytes = new Uint8Array(base64ToBuffer(iv));
  const cipherBuffer = base64ToBuffer(ciphertext);
  const plainBuffer = await subtle.decrypt({ name: AES_ALGORITHM, iv: ivBytes }, key, cipherBuffer);
  return TEXT_DECODER.decode(plainBuffer);
}

export function exportKeyToBase64(key) {
  return requireSubtleCrypto()
    .exportKey('raw', key)
    .then(bufferToBase64);
}

export async function importKeyFromBase64(base64) {
  const subtle = requireSubtleCrypto();
  const keyBuffer = base64ToBuffer(base64);
  return subtle.importKey('raw', keyBuffer, { name: AES_ALGORITHM }, true, ['encrypt', 'decrypt']);
}
