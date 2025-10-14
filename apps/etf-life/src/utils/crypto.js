const encoder = new TextEncoder();
const decoder = new TextDecoder();

function toBase64(buffer) {
  if (!(buffer instanceof ArrayBuffer) && !(buffer instanceof Uint8Array)) {
    throw new TypeError('Expected ArrayBuffer or Uint8Array');
  }
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  bytes.forEach(byte => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function fromBase64(base64) {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export async function deriveKeyFromPassword(password, salt, iterations = 100000) {
  if (!password) {
    throw new Error('Password is required to derive a key');
  }
  const pwKey = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: typeof salt === 'string' ? encoder.encode(salt) : salt,
      iterations,
      hash: 'SHA-256'
    },
    pwKey,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
  return key;
}

export async function encryptWithAesGcm(plaintext, key) {
  if (!key) {
    throw new Error('A CryptoKey is required to encrypt data');
  }
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = typeof plaintext === 'string' ? plaintext : JSON.stringify(plaintext);
  const cipherBuffer = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(data));
  return {
    iv: toBase64(iv),
    ciphertext: toBase64(cipherBuffer)
  };
}

export async function decryptWithAesGcm(payload, key) {
  if (!key) {
    throw new Error('A CryptoKey is required to decrypt data');
  }
  if (!payload?.ciphertext || !payload?.iv) {
    throw new Error('Invalid payload for AES-GCM decryption');
  }
  const ivBuffer = fromBase64(payload.iv);
  const cipherBuffer = fromBase64(payload.ciphertext);
  const plainBuffer = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: new Uint8Array(ivBuffer)
    },
    key,
    cipherBuffer
  );
  return decoder.decode(plainBuffer);
}
