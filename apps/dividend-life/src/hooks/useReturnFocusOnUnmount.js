import { useEffect, useRef } from 'react';

export default function useReturnFocusOnUnmount() {
  const previouslyFocusedRef = useRef(typeof document !== 'undefined' ? document.activeElement : null);

  useEffect(() => () => {
    const el = previouslyFocusedRef.current;
    if (el && typeof el.focus === 'function' && document.contains(el)) {
      el.focus();
    }
  }, []);
}
