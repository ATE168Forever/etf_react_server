import { useEffect } from 'react'
import DividendLifePage from './DividendLifePage.jsx'
import StockDetail from './StockDetail.jsx'
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

  useEffect(() => {
    if (!isStockDetail && normalized !== '/') {
      replace('/')
    }
  }, [isStockDetail, normalized, replace])

  if (isStockDetail) {
    const [, , stockId] = normalized.split('/')
    if (!stockId) {
      replace('/')
      return null
    }
    return <StockDetail stockId={stockId} />
  }

  return <DividendLifePage />
}
