const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function toBase64(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

function fromBase64(base64) {
  return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
}

export async function deriveKeyFromPassphrase(passphrase, workspaceId) {
  if (!passphrase) {
    return null;
  }

  const saltText = `budget-life::${workspaceId}`;
  const baseKey = await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: textEncoder.encode(saltText),
      iterations: 100000,
      hash: 'SHA-256',
    },
    baseKey,
    {
      name: 'AES-GCM',
      length: 256,
    },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptString(key, plaintext) {
  if (!key) {
    throw new Error('Encryption key is required.');
  }

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = textEncoder.encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    key,
    encoded
  );

  return {
    algorithm: 'AES-GCM',
    iv: toBase64(iv),
    ciphertext: toBase64(ciphertext),
  };
}

export async function decryptString(key, payload) {
  if (!key) {
    throw new Error('Decryption key is required.');
  }

  if (!payload?.ciphertext || !payload?.iv) {
    throw new Error('Invalid payload');
  }

  const decrypted = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: fromBase64(payload.iv),
    },
    key,
    fromBase64(payload.ciphertext)
  );

  return textDecoder.decode(decrypted);
}
