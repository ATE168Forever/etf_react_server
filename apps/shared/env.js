const importMetaEnv = (() => {
  try {
    return new Function(
      'return typeof import.meta !== "undefined" && import.meta.env ? import.meta.env : {}',
    )()
  } catch (error) {
    return {}
  }
})()

const rawProcessEnv = typeof process !== 'undefined' && process.env ? process.env : undefined
const fileProcessEnv = loadEnvFromFiles(importMetaEnv, rawProcessEnv)
const processEnv = {
  ...(fileProcessEnv || {}),
  ...(rawProcessEnv || {}),
}
const globalEnv = typeof window !== 'undefined' ? window : typeof globalThis !== 'undefined' ? globalThis : {}

function normalize(value) {
  if (value === undefined || value === null) return undefined
  const stringValue = String(value)
  if (!stringValue || stringValue === 'undefined') return undefined
  return stringValue
}

function getNodeRequire() {
  if (typeof process === 'undefined' || !process?.versions?.node) {
    return undefined
  }

  try {
    if (typeof require === 'function') {
      return require
    }
  } catch (error) {
    // Ignore failures and attempt to fallback to eval-based require below.
  }

  try {
    // eslint-disable-next-line no-eval
    return eval('require')
  } catch (error) {
    return undefined
  }
}

function determineMode(importEnv, processEnvValues) {
  const candidates = [
    importEnv && importEnv.MODE,
    processEnvValues && processEnvValues.VITE_MODE,
    processEnvValues && processEnvValues.MODE,
  ]

  for (const candidate of candidates) {
    const normalized = normalize(candidate)
    if (normalized) return normalized.toLowerCase()
  }

  const nodeEnv = normalize(processEnvValues && processEnvValues.NODE_ENV)
  if (nodeEnv) {
    const lower = nodeEnv.toLowerCase()
    if (lower === 'production' || lower === 'test') {
      return lower
    }
  }

  return 'development'
}

function parseEnvContent(content) {
  const result = {}
  if (!content) return result

  const lines = content.split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const sanitized = trimmed.startsWith('export ')
      ? trimmed.slice('export '.length).trim()
      : trimmed
    const equalsIndex = sanitized.indexOf('=')
    if (equalsIndex === -1) continue

    const key = sanitized.slice(0, equalsIndex).trim()
    if (!key) continue

    let value = sanitized.slice(equalsIndex + 1).trim()
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1).replace(/\\n/g, '\n').replace(/\\"/g, '"')
    } else if (value.startsWith("'") && value.endsWith("'")) {
      value = value.slice(1, -1)
    } else {
      value = value.replace(/\\n/g, '\n')
    }

    result[key] = value
  }

  return result
}

function getEnvFilenames(mode) {
  const filenames = ['.env']
  if (mode !== 'test') {
    filenames.push('.env.local')
  }
  if (mode) {
    filenames.push(`.env.${mode}`)
    if (mode !== 'test') {
      filenames.push(`.env.${mode}.local`)
    }
  }

  return filenames
}

function loadEnvFromFiles(importEnv, processEnvValues) {
  if (typeof process === 'undefined' || !process?.versions?.node) {
    return {}
  }

  const nodeRequire = getNodeRequire()
  if (!nodeRequire) {
    return {}
  }

  let fs
  let path
  try {
    fs = nodeRequire('node:fs')
    path = nodeRequire('node:path')
  } catch (error) {
    return {}
  }

  const cwd = typeof process.cwd === 'function' ? process.cwd() : undefined
  const envDirValue =
    normalize(processEnvValues && processEnvValues.VITE_ENV_DIR) ||
    normalize(importEnv && importEnv.VITE_ENV_DIR)
  const envDir = envDirValue ? path.resolve(cwd || '.', envDirValue) : cwd
  if (!envDir) {
    return {}
  }

  const mode = determineMode(importEnv, processEnvValues)
  const filenames = getEnvFilenames(mode)
  const parsed = {}

  for (const filename of filenames) {
    const filePath = path.resolve(envDir, filename)
    if (!fs.existsSync(filePath)) {
      continue
    }

    try {
      const content = fs.readFileSync(filePath, 'utf8')
      Object.assign(parsed, parseEnvContent(content))
    } catch (error) {
      // Ignore unreadable files and continue.
    }
  }

  return parsed
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

