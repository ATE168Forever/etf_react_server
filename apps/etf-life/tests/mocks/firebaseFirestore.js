import { jest } from '@jest/globals';

export const getFirestore = jest.fn(() => ({ db: 'mock-db' }));
export const doc = jest.fn(() => ({ id: 'mock-doc' }));
export const setDoc = jest.fn(() => Promise.resolve());
export const getDoc = jest.fn(() => Promise.resolve({ exists: () => false }));

export default { getFirestore, doc, setDoc, getDoc };
