/* eslint-env jest */
import {
  buildKeyBase,
  readEntry,
  writeEntry,
  removeEntry,
  sweepInvalidEntries,
  sweepInvalidVersionedEntries
} from '../src/utils/localCacheStore';

describe('localCacheStore', () => {
  afterEach(() => {
    localStorage.clear();
    jest.restoreAllMocks();
  });

  describe('buildKeyBase', () => {
    test('returns the url unchanged when no payload is given', () => {
      expect(buildKeyBase('https://example.com/x')).toBe('https://example.com/x');
    });

    test('appends normalized/sorted payload JSON when a payload is given', () => {
      const keyBase = buildKeyBase('https://example.com/x', { b: 2, a: 1 });
      expect(keyBase).toBe('https://example.com/x|{"a":1,"b":2}');
    });

    test('falls back to the url if the payload cannot be serialized', () => {
      const circular = {};
      circular.self = circular;
      expect(buildKeyBase('https://example.com/x', circular)).toBe('https://example.com/x');
    });
  });

  describe('readEntry / writeEntry', () => {
    test('round-trips data and meta through localStorage', () => {
      const keyBase = 'https://example.com/round-trip';
      writeEntry(keyBase, { value: 42 }, { timestamp: '2026-01-01T00:00:00.000Z' });

      const entry = readEntry(keyBase);
      expect(entry.hasCachedData).toBe(true);
      expect(entry.cachedData).toEqual({ value: 42 });
      expect(entry.cachedTimestamp).toBe('2026-01-01T00:00:00.000Z');
      expect(entry.age).toBeGreaterThanOrEqual(0);
    });

    test('reports no cached data when nothing was written', () => {
      const entry = readEntry('https://example.com/missing');
      expect(entry.hasCachedData).toBe(false);
      expect(entry.age).toBe(Infinity);
      expect(entry.cachedTimestamp).toBeNull();
    });

    test('stores entries under the versioned cache:v1: key prefix', () => {
      const keyBase = 'https://example.com/versioned';
      writeEntry(keyBase, { value: 1 }, { timestamp: '2026-01-01T00:00:00.000Z' });

      expect(localStorage.getItem(`cache:v1:data:${keyBase}`)).toBe(JSON.stringify({ value: 1 }));
      expect(localStorage.getItem(`cache:v1:meta:${keyBase}`)).toBe(
        JSON.stringify({ timestamp: '2026-01-01T00:00:00.000Z' })
      );
    });

    test('readEntry ignores unparseable stored JSON instead of throwing', () => {
      const keyBase = 'https://example.com/corrupt';
      localStorage.setItem(`cache:v1:data:${keyBase}`, '{not valid json');

      expect(() => readEntry(keyBase)).not.toThrow();
      expect(readEntry(keyBase).hasCachedData).toBe(false);
    });
  });

  describe('removeEntry', () => {
    test('removes both data and meta keys for a keyBase', () => {
      const keyBase = 'https://example.com/remove-me';
      writeEntry(keyBase, { value: 1 }, { timestamp: '2026-01-01T00:00:00.000Z' });

      removeEntry(keyBase);

      expect(localStorage.getItem(`cache:v1:data:${keyBase}`)).toBeNull();
      expect(localStorage.getItem(`cache:v1:meta:${keyBase}`)).toBeNull();
    });

    test('does not throw when localStorage.removeItem throws', () => {
      jest.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
        throw new Error('boom');
      });

      expect(() => removeEntry('https://example.com/anything')).not.toThrow();
    });
  });

  describe('writeEntry quota handling', () => {
    test('evicts the oldest entry and retries once eviction frees space', () => {
      writeEntry('https://example.com/old', { value: 'old' }, { timestamp: '2020-01-01T00:00:00.000Z' });
      writeEntry('https://example.com/new', { value: 'new' }, { timestamp: '2026-01-01T00:00:00.000Z' });

      let quotaFull = true;
      const realSetItem = Storage.prototype.setItem;
      const realRemoveItem = Storage.prototype.removeItem;

      jest.spyOn(Storage.prototype, 'setItem').mockImplementation(function mockSetItem(key, value) {
        if (quotaFull) {
          const err = new Error('QuotaExceededError');
          err.name = 'QuotaExceededError';
          throw err;
        }
        return realSetItem.call(this, key, value);
      });

      jest.spyOn(Storage.prototype, 'removeItem').mockImplementation(function mockRemoveItem(key) {
        quotaFull = false;
        return realRemoveItem.call(this, key);
      });

      const result = writeEntry('https://example.com/incoming', { value: 'incoming' }, { timestamp: '2026-06-01T00:00:00.000Z' });

      expect(result).toBe(true);
      expect(localStorage.getItem('cache:v1:data:https://example.com/old')).toBeNull();
      expect(JSON.parse(localStorage.getItem('cache:v1:data:https://example.com/incoming'))).toEqual({ value: 'incoming' });
    });

    test('gives up silently and returns false when there is nothing left to evict', () => {
      jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        const err = new Error('QuotaExceededError');
        err.name = 'QuotaExceededError';
        throw err;
      });

      let result;
      expect(() => {
        result = writeEntry('https://example.com/never', { value: 1 }, { timestamp: '2026-01-01T00:00:00.000Z' });
      }).not.toThrow();
      expect(result).toBe(false);
    });
  });

  describe('sweepInvalidEntries', () => {
    test('removes corrupt versioned entries and legacy-prefixed entries, keeps valid versioned entries', () => {
      writeEntry('https://example.com/valid', { value: 1 }, { timestamp: '2026-01-01T00:00:00.000Z' });
      localStorage.setItem('cache:v1:data:https://example.com/corrupt', '{not valid json');
      localStorage.setItem('cache:v1:meta:https://example.com/corrupt', JSON.stringify({ timestamp: '2026-01-01T00:00:00.000Z' }));
      localStorage.setItem('cache:data:https://example.com/legacy', JSON.stringify({ value: 1 }));
      localStorage.setItem('cache:meta:https://example.com/legacy', JSON.stringify({ timestamp: '2026-01-01T00:00:00.000Z' }));

      const removedCount = sweepInvalidEntries();

      expect(removedCount).toBeGreaterThanOrEqual(4);
      expect(localStorage.getItem('cache:v1:data:https://example.com/valid')).not.toBeNull();
      expect(localStorage.getItem('cache:v1:data:https://example.com/corrupt')).toBeNull();
      expect(localStorage.getItem('cache:v1:meta:https://example.com/corrupt')).toBeNull();
      expect(localStorage.getItem('cache:data:https://example.com/legacy')).toBeNull();
      expect(localStorage.getItem('cache:meta:https://example.com/legacy')).toBeNull();
    });

    test('returns 0 and leaves storage untouched when everything is valid', () => {
      writeEntry('https://example.com/valid', { value: 1 }, { timestamp: '2026-01-01T00:00:00.000Z' });
      expect(sweepInvalidEntries()).toBe(0);
      expect(localStorage.getItem('cache:v1:data:https://example.com/valid')).not.toBeNull();
    });
  });

  describe('sweepInvalidVersionedEntries', () => {
    test('removes only corrupt versioned entries, leaves legacy-prefixed entries untouched', () => {
      writeEntry('https://example.com/valid', { value: 1 }, { timestamp: '2026-01-01T00:00:00.000Z' });
      localStorage.setItem('cache:v1:data:https://example.com/corrupt', '{not valid json');
      localStorage.setItem('cache:v1:meta:https://example.com/corrupt', JSON.stringify({ timestamp: '2026-01-01T00:00:00.000Z' }));
      localStorage.setItem('cache:data:https://example.com/legacy', JSON.stringify({ value: 1 }));
      localStorage.setItem('cache:meta:https://example.com/legacy', JSON.stringify({ timestamp: '2026-01-01T00:00:00.000Z' }));

      const removedCount = sweepInvalidVersionedEntries();

      expect(removedCount).toBe(2);
      expect(localStorage.getItem('cache:v1:data:https://example.com/valid')).not.toBeNull();
      expect(localStorage.getItem('cache:v1:data:https://example.com/corrupt')).toBeNull();
      expect(localStorage.getItem('cache:v1:meta:https://example.com/corrupt')).toBeNull();
      expect(localStorage.getItem('cache:data:https://example.com/legacy')).not.toBeNull();
      expect(localStorage.getItem('cache:meta:https://example.com/legacy')).not.toBeNull();
    });

    test('returns 0 and leaves storage untouched when everything is valid', () => {
      writeEntry('https://example.com/valid', { value: 1 }, { timestamp: '2026-01-01T00:00:00.000Z' });
      expect(sweepInvalidVersionedEntries()).toBe(0);
      expect(localStorage.getItem('cache:v1:data:https://example.com/valid')).not.toBeNull();
    });
  });
});
