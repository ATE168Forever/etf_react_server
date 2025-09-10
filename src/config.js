/* global process */
export const API_HOST =
  (typeof process !== 'undefined' && process.env?.VITE_API_HOST) ||
  'https://api.etflife.org';
