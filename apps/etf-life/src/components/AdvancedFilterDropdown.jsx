import { useState, useRef } from 'react';
import useClickOutside from './useClickOutside';
import { useLanguage } from '../i18n';

export default function AdvancedFilterDropdown({ filters, setFilters, onClose, availableCurrencies = ['TWD', 'USD'] }) {
  const ref = useRef();
  useClickOutside(ref, onClose);
  const { lang } = useLanguage();

  const [temp, setTemp] = useState({
    minYield: filters.minYield || '',
    freq: filters.freq || [],
    upcomingWithin: filters.upcomingWithin || '',
    diamond: filters.diamond || false,
    currencies: filters.currencies || []
  });

  const toggleFreq = (val) => {
    setTemp(t => ({
      ...t,
      freq: t.freq.includes(val) ? t.freq.filter(f => f !== val) : [...t.freq, val]
    }));
  };

  const toggleCurrency = (val) => {
    setTemp(t => ({
      ...t,
      currencies: t.currencies.includes(val)
        ? t.currencies.filter(c => c !== val)
        : [...t.currencies, val]
    }));
  };

  const handleClear = () => {
    setTemp({ minYield: '', freq: [], upcomingWithin: '', diamond: false, currencies: [] });
  };

  const handleApply = () => {
    setFilters(temp);
    onClose();
  };

  const freqOptions = [
    { v: 12, zh: '月配', en: 'Monthly' },
    { v: 6, zh: '雙月配', en: 'Bimonthly' },
    { v: 4, zh: '季配', en: 'Quarterly' },
    { v: 2, zh: '半年配', en: 'Semi-annual' },
    { v: 1, zh: '年配', en: 'Annual' }
  ];

  const normalizedCurrencies = Array.from(new Set((availableCurrencies || []).map(c => c.toUpperCase())));
  const currencyOptions = normalizedCurrencies.length > 0 ? normalizedCurrencies : ['TWD', 'USD'];
  const currencyLabels = {
    TWD: lang === 'en' ? 'TWD' : '台幣',
    USD: lang === 'en' ? 'USD' : '美金'
  };

  return (
    <div className="dropdown advanced-dropdown" ref={ref}>
      <div className="dropdown-section advanced-dropdown__section">
        <span className="advanced-dropdown__label">{lang === 'en' ? 'Estimated yield ≥' : '預估殖利率 ≥'}</span>
        <div className="advanced-dropdown__input-row">
          <input
            type="number"
            value={temp.minYield}
            onChange={e => setTemp({ ...temp, minYield: e.target.value })}
            className="advanced-dropdown__input"
          />
          <span className="advanced-dropdown__suffix">%</span>
        </div>
      </div>
      <hr />
      <div className="dropdown-section advanced-dropdown__section">
        <span className="advanced-dropdown__label">{lang === 'en' ? 'Payout frequency' : '配息頻率'}</span>
        <div className="advanced-dropdown__freq-grid">
          {freqOptions.map(opt => (
            <label key={opt.v} className="dropdown-item advanced-dropdown__checkbox">
              <input
                type="checkbox"
                checked={temp.freq.includes(opt.v)}
                onChange={() => toggleFreq(opt.v)}
              />
              <span>{lang === 'en' ? opt.en : opt.zh}</span>
            </label>
          ))}
        </div>
      </div>
      <hr />
      <div className="dropdown-section advanced-dropdown__section">
        <span className="advanced-dropdown__label">{lang === 'en' ? 'Currency' : '幣別'}</span>
        <div className="advanced-dropdown__freq-grid">
          {currencyOptions.map(code => (
            <label key={code} className="dropdown-item advanced-dropdown__checkbox">
              <input
                type="checkbox"
                checked={temp.currencies.includes(code)}
                onChange={() => toggleCurrency(code)}
              />
              <span>{currencyLabels[code] || code}</span>
            </label>
          ))}
        </div>
      </div>
      <hr />
      <div className="dropdown-section advanced-dropdown__section">
        <label className="dropdown-item advanced-dropdown__checkbox">
          <input
            type="checkbox"
            checked={temp.diamond}
            onChange={e => setTemp({ ...temp, diamond: e.target.checked })}
          />
          <span>{lang === 'en' ? 'Show only diamonds' : '只顯示鑽石'}</span>
        </label>
      </div>
      <hr />
      <div className="dropdown-section advanced-dropdown__section">
        <span className="advanced-dropdown__label">{lang === 'en' ? 'Upcoming ex/payout within' : '即將除息/發息：未來'}</span>
        <div className="advanced-dropdown__input-row">
          <input
            type="number"
            value={temp.upcomingWithin}
            onChange={e => setTemp({ ...temp, upcomingWithin: e.target.value })}
            className="advanced-dropdown__input"
          />
          <span className="advanced-dropdown__suffix">{lang === 'en' ? 'days' : '天內'}</span>
        </div>
      </div>
      <div className="advanced-dropdown__actions">
        <button className="dropdown-btn" onClick={handleClear}>{lang === 'en' ? 'Clear' : '清除'}</button>
        <button className="dropdown-btn" onClick={handleApply}>{lang === 'en' ? 'Apply' : '確定'}</button>
      </div>
    </div>
  );
}
