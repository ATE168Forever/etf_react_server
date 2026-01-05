import { useEffect, useCallback } from 'react';

/**
 * Custom hook to listen for storage changes on a specific key.
 * Handles both the standard 'storage' event (cross-tab) and custom events (same-tab).
 *
 * @param {string} storageKey - The localStorage key to monitor
 * @param {string} customEvent - Optional custom event name for same-tab updates
 * @param {Function} callback - Function to call when the storage value changes
 */
export default function useStorageListener(storageKey, customEvent, callback) {
  const stableCallback = useCallback(callback, [callback]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const handleStorage = (event) => {
      if (event.key && event.key !== storageKey) {
        return;
      }
      stableCallback();
    };

    const handleCustomEvent = () => {
      stableCallback();
    };

    window.addEventListener('storage', handleStorage);
    if (customEvent) {
      window.addEventListener(customEvent, handleCustomEvent);
    }

    return () => {
      window.removeEventListener('storage', handleStorage);
      if (customEvent) {
        window.removeEventListener(customEvent, handleCustomEvent);
      }
    };
  }, [storageKey, customEvent, stableCallback]);
}
