const importMetaEnv = (() => {
  try {
    return new Function(
      'return typeof import.meta !== "undefined" && import.meta.env ? import.meta.env : {}',
    )()
  } catch (error) {
    return {}
  }
})()
const processEnv = typeof process !== 'undefined' && process.env ? process.env : {}
const globalEnv = typeof window !== 'undefined' ? window : typeof globalThis !== 'undefined' ? globalThis : {}

function normalize(value) {
  if (value === undefined || value === null) return undefined
  const stringValue = String(value)
  if (!stringValue || stringValue === 'undefined') return undefined
  return stringValue
}

export function getEnvVar(key, fallback = '') {
  const fromImportMeta = normalize(importMetaEnv[key])
  if (fromImportMeta !== undefined) return fromImportMeta

  const fromProcess = normalize(processEnv[key])
  if (fromProcess !== undefined) return fromProcess

  const fromGlobal = normalize(globalEnv[key])
  if (fromGlobal !== undefined) return fromGlobal

  return fallback
}

export const GOOGLE_CLIENT_ID = getEnvVar('VITE_GOOGLE_CLIENT_ID')
export const GOOGLE_API_KEY = getEnvVar('VITE_GOOGLE_API_KEY')
export const ONEDRIVE_CLIENT_ID = getEnvVar('VITE_ONEDRIVE_CLIENT_ID')
export const ONEDRIVE_SCOPES = getEnvVar('VITE_ONEDRIVE_SCOPES')
export const ONEDRIVE_AUTHORITY = getEnvVar('VITE_ONEDRIVE_AUTHORITY')
export const ONEDRIVE_GRAPH_BASE = getEnvVar('VITE_ONEDRIVE_GRAPH_BASE')

