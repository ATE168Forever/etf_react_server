import { useEffect, useRef } from 'react';

/**
 * Ensures the provided effect callback runs only a single time even when
 * React StrictMode intentionally invokes effects twice in development.
 *
 * The callback can optionally return a cleanup function which will still be
 * executed when the component unmounts.
 */
export default function useEffectOnce(effect) {
  const hasRunRef = useRef(false);
  const cleanupRef = useRef();
  const skipFirstCleanupRef = useRef(true);

  useEffect(() => {
    if (!hasRunRef.current) {
      hasRunRef.current = true;
      cleanupRef.current = effect?.();
    }

    return () => {
      if (skipFirstCleanupRef.current) {
        // React StrictMode intentionally calls the cleanup immediately
        // after mounting to help surface side effects. We skip invoking the
        // consumer cleanup the first time so asynchronous logic (e.g. fetch
        // requests guarded by a cancellation flag) can still resolve and
        // update state during the development double-invoke cycle.
        skipFirstCleanupRef.current = false;
        return;
      }

      if (typeof cleanupRef.current === 'function') {
        cleanupRef.current();
      }
    };
    // We intentionally rely on the ref guard instead of dependencies.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
