export function initializeFirestore(app, options) {
  return { app, options };
}

export function persistentLocalCache() {
  return {};
}

export function persistentMultipleTabManager() {
  return {};
}

export function collection(db, ...segments) {
  return segments.join('/');
}

export function doc(collectionPath, id) {
  return `${collectionPath}/${id}`;
}

export function serverTimestamp() {
  return Date.now();
}

export function writeBatch() {
  return {
    set: () => {},
    delete: () => {},
    commit: async () => {}
  };
}

export async function setDoc() {}

export function onSnapshot(ref, callback) {
  callback({ docs: [], metadata: { hasPendingWrites: false, fromCache: true } });
  return () => {};
}
