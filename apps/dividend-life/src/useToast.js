import { useContext } from 'react';
import { ToastContext } from './ToastContext';

const noop = () => {};

export function useToast() {
  const ctx = useContext(ToastContext);
  return ctx ?? noop;
}
