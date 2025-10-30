const env =
  typeof import.meta !== 'undefined' && import.meta?.env
    ? import.meta.env
    : typeof process !== 'undefined'
      ? process.env ?? {}
      : {}

export const API_HOST = env.VITE_API_HOST ?? ''
export const HOST_URL = env.VITE_HOST_URL ?? ''

if (typeof window !== 'undefined') {
  console.log('[shared/config] Browser env:', env)
  console.log('[shared/config] Browser VITE_API_HOST =', API_HOST)
  console.log('[shared/config] Browser VITE_HOST_URL =', HOST_URL)
} else {
  console.debug('[shared/config] Runtime env keys:', Object.keys(env))
}
