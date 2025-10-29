import { useEffect } from 'react'
import DividendLifePage from './DividendLifePage.jsx'
import StockDetail from './StockDetail.jsx'
import ApiHostRoute from './ApiHostRoute.jsx'
import { useRouter } from '@shared/router'

const normalizePath = (path) => {
  if (!path) return '/'
  if (path.length > 1 && path.endsWith('/')) {
    return path.replace(/\/+$/, '') || '/'
  }
  return path
}

export default function App() {
  const { path, replace } = useRouter()
  const normalized = normalizePath(path)
  const isStockDetail = normalized.startsWith('/stock/')

  const homeHref = (() => {
    if (typeof window === 'undefined') return 'https://conceptb.life/'
    if (typeof window.CONCEPTB_HOME_URL === 'string' && window.CONCEPTB_HOME_URL.trim()) {
      return window.CONCEPTB_HOME_URL
    }
    const hostname = window.location?.hostname || ''
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return '/'
    }
    return 'https://conceptb.life/'
  })()

  const homeNavigation = homeHref.startsWith('http') ? 'reload' : 'router'

  useEffect(() => {
    if (!isStockDetail && normalized !== '/') {
      replace('/')
    }
  }, [isStockDetail, normalized, replace])

  if (normalized === '/api-host') {
    return <ApiHostRoute />
  }

  if (isStockDetail) {
    const [, , stockId] = normalized.split('/')
    if (!stockId) {
      replace('/')
      return null
    }
    return <StockDetail stockId={stockId} />
  }

  return <DividendLifePage homeHref={homeHref} homeNavigation={homeNavigation} />
}
