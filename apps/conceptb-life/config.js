import { baseConfig } from '../shared/config.base.js'

export * from '../shared/config.base.js'

export default {
  ...baseConfig,
  appName: 'ConceptB Life',
  baseUrl: import.meta.env.VITE_APP_CONCEPTB_URL,
}
