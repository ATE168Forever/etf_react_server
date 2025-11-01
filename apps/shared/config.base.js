const env =
  typeof import.meta !== 'undefined' && import.meta?.env
    ? import.meta.env
    : typeof process !== 'undefined'
      ? process.env ?? {}
      : {}

const readEnv = (key) => env?.[key]

export const API_HOST = readEnv('VITE_API_HOST') ?? ''
export const HOST_URL = readEnv('VITE_HOST_URL') ?? ''
export const GOOGLE_API_KEY = readEnv('VITE_GOOGLE_API_KEY') ?? ''
export const GOOGLE_CLIENT_ID = readEnv('VITE_GOOGLE_CLIENT_ID') ?? ''
export const ONEDRIVE_CLIENT_ID = readEnv('VITE_ONEDRIVE_CLIENT_ID') ?? ''
export const ONEDRIVE_SCOPES = readEnv('VITE_ONEDRIVE_SCOPES') ?? ''
export const ONEDRIVE_AUTHORITY = readEnv('VITE_ONEDRIVE_AUTHORITY') ?? ''
export const ONEDRIVE_GRAPH_BASE = readEnv('VITE_ONEDRIVE_GRAPH_BASE') ?? ''

export const baseConfig = {
  API_HOST,
  HOST_URL,
  GOOGLE_API_KEY,
  GOOGLE_CLIENT_ID,
  ONEDRIVE_CLIENT_ID,
  ONEDRIVE_SCOPES,
  ONEDRIVE_AUTHORITY,
  ONEDRIVE_GRAPH_BASE,
}

// if (typeof window !== 'undefined') {
//   console.log('[shared/config] Browser env:', env)
//   console.log('[shared/config] Browser VITE_API_HOST =', API_HOST)
//   console.log('[shared/config] Browser VITE_HOST_URL =', HOST_URL)
// } else {
//   console.debug('[shared/config] Runtime env keys:', Object.keys(env))
// }

export default baseConfig
