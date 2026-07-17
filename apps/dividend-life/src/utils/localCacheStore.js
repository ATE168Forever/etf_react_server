const SCHEMA_VERSION = 'v1';
const VERSIONED_DATA_PREFIX = `cache:${SCHEMA_VERSION}:data:`;
const VERSIONED_META_PREFIX = `cache:${SCHEMA_VERSION}:meta:`;
const LEGACY_DATA_PREFIX = 'cache:data:';
const LEGACY_META_PREFIX = 'cache:meta:';
const MAX_EVICTIONS = 20;

function normalizeForCache(value) {
  if (Array.isArray(value)) {
    return value.map(item => normalizeForCache(item));
  }
  if (value && typeof value === 'object') {
    const result = {};
    Object.keys(value)
      .sort()
      .forEach(key => {
        result[key] = normalizeForCache(value[key]);
      });
    return result;
  }
  return value;
}

export function buildKeyBase(url, payload) {
  if (!payload) return url;
  try {
    const normalized = normalizeForCache(payload);
    return `${url}|${JSON.stringify(normalized)}`;
  } catch {
    return url;
  }
}

function dataKey(keyBase) {
  return `${VERSIONED_DATA_PREFIX}${keyBase}`;
}

function metaKey(keyBase) {
  return `${VERSIONED_META_PREFIX}${keyBase}`;
}

export function readEntry(keyBase) {
  let meta;
  let age = Infinity;
  let cachedTimestamp = null;
  let cachedData;
  let hasCachedData = false;

  try {
    const metaRaw = localStorage.getItem(metaKey(keyBase));
    if (metaRaw) {
      meta = JSON.parse(metaRaw);
      if (meta?.timestamp) {
        cachedTimestamp = meta.timestamp;
        const cachedTime = new Date(meta.timestamp);
        if (!Number.isNaN(cachedTime.getTime())) {
          age = Date.now() - cachedTime.getTime();
        }
      }
    }
  } catch {
    // ignore parse errors
  }

  try {
    const raw = localStorage.getItem(dataKey(keyBase));
    if (raw !== null) {
      cachedData = JSON.parse(raw);
      hasCachedData = true;
    }
  } catch {
    cachedData = undefined;
    hasCachedData = false;
  }

  return { hasCachedData, cachedData, meta, cachedTimestamp, age };
}

export function removeEntry(keyBase) {
  try {
    localStorage.removeItem(dataKey(keyBase));
    localStorage.removeItem(metaKey(keyBase));
  } catch {
    // ignore storage errors
  }
}

function collectVersionedMetaEntries() {
  const entries = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(VERSIONED_META_PREFIX)) {
      let timestamp = null;
      try {
        const parsed = JSON.parse(localStorage.getItem(key));
        timestamp = parsed?.timestamp ?? null;
      } catch {
        timestamp = null;
      }
      entries.push({ keyBase: key.slice(VERSIONED_META_PREFIX.length), timestamp });
    }
  }
  return entries;
}

function compareByTimestampAscending(a, b) {
  if (!a.timestamp && !b.timestamp) return 0;
  if (!a.timestamp) return -1;
  if (!b.timestamp) return 1;
  return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
}

export function writeEntry(keyBase, data, meta) {
  const dataPayload = JSON.stringify(data);
  const metaPayload = JSON.stringify(meta);

  const attemptWrite = () => {
    localStorage.setItem(dataKey(keyBase), dataPayload);
    localStorage.setItem(metaKey(keyBase), metaPayload);
  };

  try {
    attemptWrite();
    return true;
  } catch {
    // fall through to eviction below
  }

  const evictionCandidates = collectVersionedMetaEntries()
    .filter(entry => entry.keyBase !== keyBase)
    .sort(compareByTimestampAscending);

  const attempts = Math.min(evictionCandidates.length, MAX_EVICTIONS);
  for (let i = 0; i < attempts; i++) {
    removeEntry(evictionCandidates[i].keyBase);
    try {
      attemptWrite();
      return true;
    } catch {
      // evict the next-oldest entry and try again
    }
  }

  return false;
}

export function sweepInvalidEntries() {
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;
    if (key.startsWith(VERSIONED_DATA_PREFIX)) {
      try {
        const value = localStorage.getItem(key);
        if (value) {
          JSON.parse(value);
        }
      } catch {
        keysToRemove.push(key);
        keysToRemove.push(`${VERSIONED_META_PREFIX}${key.slice(VERSIONED_DATA_PREFIX.length)}`);
      }
    } else if (key.startsWith(LEGACY_DATA_PREFIX) || key.startsWith(LEGACY_META_PREFIX)) {
      keysToRemove.push(key);
    }
  }

  const uniqueKeys = Array.from(new Set(keysToRemove));
  uniqueKeys.forEach(key => {
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
  });
  return uniqueKeys.length;
}
