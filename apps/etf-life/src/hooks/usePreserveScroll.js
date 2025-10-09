import { useEffect, useMemo } from 'react';

export default function usePreserveScroll(ref, storageKey, deps = []) {
  const depsSignature = useMemo(() => {
    try {
      return JSON.stringify(deps);
    } catch {
      return String(deps);
    }
  }, [deps]);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof sessionStorage === 'undefined') {
      return;
    }

    const saved = sessionStorage.getItem(storageKey);
    if (saved !== null) {
      const savedValue = Number(saved);
      if (!Number.isNaN(savedValue)) {
        node.scrollLeft = savedValue;
      }
    }

    const handleScroll = () => {
      sessionStorage.setItem(storageKey, String(node.scrollLeft));
    };

    node.addEventListener('scroll', handleScroll);

    return () => {
      sessionStorage.setItem(storageKey, String(node.scrollLeft));
      node.removeEventListener('scroll', handleScroll);
    };
  }, [ref, storageKey, depsSignature]);
}
