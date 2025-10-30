import { getEnvVar } from './config.js'

export const GOOGLE_API_KEY = getEnvVar('VITE_GOOGLE_API_KEY')
export const GOOGLE_CLIENT_ID = getEnvVar('VITE_GOOGLE_CLIENT_ID')
export const ONEDRIVE_CLIENT_ID = getEnvVar('VITE_ONEDRIVE_CLIENT_ID')
export const ONEDRIVE_SCOPES = getEnvVar('VITE_ONEDRIVE_SCOPES')
export const ONEDRIVE_AUTHORITY = getEnvVar('VITE_ONEDRIVE_AUTHORITY')
export const ONEDRIVE_GRAPH_BASE = getEnvVar('VITE_ONEDRIVE_GRAPH_BASE')
