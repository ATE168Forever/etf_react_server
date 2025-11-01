import { baseConfig } from '../../shared/config.base.js'

export default {
  ...baseConfig,
  appName: 'Dividend Life',
  baseUrl: import.meta.env.VITE_APP_DIVIDEND_URL,
}