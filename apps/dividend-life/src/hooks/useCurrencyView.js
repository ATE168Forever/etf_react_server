import { useState, useEffect, useMemo, useCallback } from 'react';
import { DEFAULT_CURRENCY, CURRENCY_NAME } from '../utils/currencyUtils';

const STORAGE_KEY = 'dividend_currency_view_mode';

export default function useCurrencyView({ availableCurrencies, lang }) {
  const hasTwd = availableCurrencies.includes('TWD');
  const hasUsd = availableCurrencies.includes('USD');
  const fallbackView = hasTwd && hasUsd ? 'BOTH' : hasTwd ? 'TWD' : hasUsd ? 'USD' : 'TWD';

  const [viewMode, setViewMode] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'TWD' || saved === 'USD' || saved === 'BOTH') return saved;
    return fallbackView;
  });
  const [hasUserSetViewMode, setHasUserSetViewMode] = useState(() => !!localStorage.getItem(STORAGE_KEY));

  useEffect(() => {
    if (!hasUserSetViewMode) {
      if (viewMode !== fallbackView) {
        setViewMode(fallbackView);
      }
      return;
    }
    if ((viewMode === 'TWD' && !hasTwd) || (viewMode === 'USD' && !hasUsd) || (viewMode === 'BOTH' && !(hasTwd && hasUsd))) {
      setViewMode(fallbackView);
    }
  }, [fallbackView, hasTwd, hasUsd, hasUserSetViewMode, viewMode]);

  const handleViewModeChange = useCallback((mode) => {
    setHasUserSetViewMode(true);
    setViewMode(mode);
    localStorage.setItem(STORAGE_KEY, mode);
  }, []);

  const activeCurrencies = useMemo(() => {
    if (viewMode === 'BOTH') {
      return availableCurrencies.length > 0 ? availableCurrencies : [DEFAULT_CURRENCY];
    }
    if (availableCurrencies.includes(viewMode)) {
      return [viewMode];
    }
    return availableCurrencies.length > 0 ? [availableCurrencies[0]] : [DEFAULT_CURRENCY];
  }, [availableCurrencies, viewMode]);

  const viewDescriptionContent = useMemo(() => {
    const langKey = lang === 'en' ? 'en' : 'zh';
    if (activeCurrencies.length === 1) {
      const currency = activeCurrencies[0];
      return CURRENCY_NAME[langKey]?.[currency] || `${currency} dividends`;
    }
    const names = activeCurrencies.map(currency =>
      CURRENCY_NAME[langKey]?.[currency] || `${currency} dividends`
    );
    return lang === 'en' ? names.join(' & ') : names.join('、');
  }, [activeCurrencies, lang]);

  return {
    viewMode,
    hasTwd,
    hasUsd,
    activeCurrencies,
    viewDescriptionContent,
    handleViewModeChange,
  };
}
