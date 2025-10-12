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

  useEffect(() => {
    if (hasRunRef.current) {
      return () => {
        if (typeof cleanupRef.current === 'function') {
          cleanupRef.current();
        }
      };
    }

    hasRunRef.current = true;
    cleanupRef.current = effect?.();

    return () => {
      if (typeof cleanupRef.current === 'function') {
        cleanupRef.current();
      }
    };
    // We intentionally rely on the ref guard instead of dependencies.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
