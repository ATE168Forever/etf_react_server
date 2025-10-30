const isNodeRuntime = typeof process !== 'undefined' && !!process?.versions?.node

function parseEnvFile(contents) {
  const result = {}
  if (typeof contents !== 'string' || !contents) {
    return result
  }

  const lines = contents.split(/\r?\n/)
  for (const line of lines) {
    if (!line) continue
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) {
      continue
    }

    const equalsIndex = trimmed.indexOf('=')
    if (equalsIndex <= 0) {
      continue
    }

    const key = trimmed.slice(0, equalsIndex).trim()
    if (!key) {
      continue
    }

    let value = trimmed.slice(equalsIndex + 1)
    const valueTrimmed = value.trim()
    if ((valueTrimmed.startsWith('"') && valueTrimmed.endsWith('"')) || (valueTrimmed.startsWith("'") && valueTrimmed.endsWith("'"))) {
      value = valueTrimmed.slice(1, -1)
    } else {
      value = valueTrimmed
    }

    result[key] = value
  }

  return result
}

function tryResolveNodeModule(moduleId) {
  if (!isNodeRuntime) {
    return null
  }

  try {
    if (typeof require === 'function') {
      return require(moduleId)
    }
  } catch (error) {
    // continue to other strategies
  }

  try {
    if (typeof module !== 'undefined' && typeof module.require === 'function') {
      return module.require(moduleId)
    }
  } catch (error) {
    // continue to eval fallback
  }

  try {
    const nodeRequire = typeof eval === 'function' ? eval('require') : undefined
    if (typeof nodeRequire === 'function') {
      return nodeRequire(moduleId)
    }
  } catch (error) {
    // ignore, no further strategies available
  }

  return null
}

function loadNodeEnvVarsSync() {
  if (!isNodeRuntime) {
    return {}
  }

  const fsModule = tryResolveNodeModule('node:fs')
  const pathModule = tryResolveNodeModule('node:path')

  if (!fsModule || !pathModule) {
    return {}
  }

  try {
    const { existsSync, readFileSync } = fsModule
    const { resolve, isAbsolute } = pathModule

    const candidates = []
    const customPath = process?.env?.ETF_ENV_FILE
    if (customPath) {
      candidates.push(isAbsolute(customPath) ? customPath : resolve(process.cwd(), customPath))
    }

    const cwdCandidates = [
      'env/.env.development',
      '../env/.env.development',
      '../../env/.env.development',
      '../../../env/.env.development'
    ].map(relative => resolve(process.cwd(), relative))
    candidates.push(...cwdCandidates)

    if (typeof __dirname !== 'undefined') {
      candidates.push(resolve(__dirname, '../../env/.env.development'))
    }

    for (const candidate of candidates) {
      if (!candidate) continue
      if (!existsSync(candidate)) {
        continue
      }
      const fileContents = readFileSync(candidate, 'utf8')
      return parseEnvFile(fileContents)
    }
  } catch (error) {
    console.warn('[shared/config] Failed to load env/.env.development:', error)
  }

  return {}
}

const nodeEnvVars = loadNodeEnvVarsSync()

export function getEnvVar(key) {
  if (typeof key !== 'string' || !key) {
    return undefined
  }

  if (isNodeRuntime) {
    const nodeValue = process?.env?.[key]
    if (nodeValue !== undefined) {
      return nodeValue
    }

    if (Object.prototype.hasOwnProperty.call(nodeEnvVars, key)) {
      return nodeEnvVars[key]
    }
  }

  if (typeof import.meta !== 'undefined' && import.meta?.env?.[key] !== undefined) {
    return import.meta.env[key]
  }

  return undefined
}

export const API_HOST = getEnvVar('VITE_API_HOST')
export const HOST_URL = getEnvVar('VITE_HOST_URL')

if (isNodeRuntime) {
  console.debug('[shared/config] Loaded env variables from file with keys:', Object.keys(nodeEnvVars))
}
