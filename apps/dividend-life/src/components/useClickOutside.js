import { useEffect } from 'react';

export default function useClickOutside(ref, handler) {
  useEffect(() => {
    const onMouseDown = (event) => {
      if (!ref.current || ref.current.contains(event.target)) return;
      handler(event);
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') handler(event);
    };
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [ref, handler]);
}
