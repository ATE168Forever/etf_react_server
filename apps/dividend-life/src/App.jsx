import { useEffect } from 'react';
import HomePage from '@shared/pages/HomePage.jsx';
import DividendLifePage from './DividendLifePage.jsx';
import BalanceLifePage from '@balance-life/pages/BalanceLifePage.jsx';
import HealthLifePage from '@health-life/pages/HealthLifePage.jsx';
import WealthLifePage from '@wealth-life/pages/WealthLifePage.jsx';
import StockDetail from './StockDetail.jsx';
import { useRouter } from '@shared/router';

const KNOWN_PATHS = new Set(['/', '/dividend-life', '/balance-life', '/health-life', '/wealth-life']);

const normalizePath = (path) => {
  if (!path) return '/';
  if (path.length > 1 && path.endsWith('/')) {
    return path.replace(/\/+$/, '') || '/';
  }
  return path;
};

export default function App() {
  const { path, replace } = useRouter();
  const normalized = normalizePath(path);
  const isStockDetail = normalized.startsWith('/stock/');

  useEffect(() => {
    if (!isStockDetail && !KNOWN_PATHS.has(normalized)) {
      replace('/');
    }
  }, [isStockDetail, normalized, replace]);

  if (isStockDetail) {
    const [, , stockId] = normalized.split('/');
    if (!stockId) {
      replace('/');
      return null;
    }
    return <StockDetail stockId={stockId} />;
  }

  switch (normalized) {
    case '/':
      return <HomePage />;
    case '/dividend-life':
      return <DividendLifePage />;
    case '/balance-life':
      return <BalanceLifePage />;
    case '/health-life':
      return <HealthLifePage />;
    case '/wealth-life':
      return <WealthLifePage />;
    default:
      return null;
  }
}
