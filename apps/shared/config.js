import { getEnvVar } from './env.js'

export const API_HOST = getEnvVar('VITE_API_HOST')
export const HOST_URL = getEnvVar('VITE_HOST_URL')

console.log('API_HOST =', API_HOST);
console.log('VITE_API_HOST from import.meta.env =', import.meta.env.VITE_API_HOST);