import { jest } from '@jest/globals';

export const initializeApp = jest.fn(() => ({ app: 'mock-app' }));

export default { initializeApp };
