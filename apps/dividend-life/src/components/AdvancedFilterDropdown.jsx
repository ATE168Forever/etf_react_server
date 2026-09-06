import { useState, useRef } from 'react';
import useClickOutside from './useClickOutside';
import useReturnFocusOnUnmount from '../hooks/useReturnFocusOnUnmount';
import { useLanguage } from '../i18n';
import DisplayDropdown from './DisplayDropdown';

export default function AdvancedFilterDropdown({ filters, setFilters, onClose, displayMode, onDisplayModeChange }) {
  const ref = useRef();
  useClickOutside(ref, onClose);
  useReturnFocusOnUnmount();
  const { lang } = useLanguage();

  const [temp, setTemp] = useState({
    minYield: filters.minYield || '',
    freq: filters.freq || [],
    upcomingWithin: filters.upcomingWithin || '',
    diamond: filters.diamond || false
  });

  const toggleFreq = (val) => {
    setTemp(t => ({
      ...t,
      freq: t.freq.includes(val) ? t.freq.filter(f => f !== val) : [...t.freq, val]
    }));
  };

  const handleClear = () => {
    setTemp({ minYield: '', freq: [], upcomingWithin: '', diamond: false });
  };

  const handleApply = () => {
    setFilters(temp);
    onClose();
  };

  const freqOptions = [
    { v: 52, zh: '週配', en: 'Weekly' },
    { v: 12, zh: '月配', en: 'Monthly' },
    { v: 6, zh: '雙月配', en: 'Bimonthly' },
    { v: 4, zh: '季配', en: 'Quarterly' },
    { v: 2, zh: '半年配', en: 'Semi-annual' },
    { v: 1, zh: '年配', en: 'Annual' }
  ];

  return (
    <div className="dropdown advanced-dropdown" ref={ref}>
      <div className="dropdown-section advanced-dropdown__section">
        <span className="advanced-dropdown__label">{lang === 'en' ? 'Display mode' : '顯示模式'}</span>
        <DisplayDropdown displayMode={displayMode} onModeChange={onDisplayModeChange} />
      </div>
      <hr />
      <div className="dropdown-section advanced-dropdown__section">
        <span className="advanced-dropdown__label">{lang === 'en' ? 'Estimated yield ≥' : '預估殖利率 ≥'}</span>
        <div className="advanced-dropdown__input-row">
          <input
            type="number"
            value={temp.minYield}
            onChange={e => setTemp({ ...temp, minYield: e.target.value })}
            className="advanced-dropdown__input"
            aria-label={lang === 'en' ? 'Minimum estimated yield (%)' : '最低預估殖利率 (%)'}
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
        <label className="dropdown-item advanced-dropdown__checkbox">
          <input
            type="checkbox"
            checked={temp.diamond}
            onChange={e => setTemp({ ...temp, diamond: e.target.checked })}
          />
          <span>{lang === 'en' ? 'Show high-yield only' : '只顯示殖利率偏高標的'}</span>
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
            aria-label={lang === 'en' ? 'Upcoming within days' : '即將發生天數'}
          />
          <span className="advanced-dropdown__suffix">{lang === 'en' ? 'days' : '天內'}</span>
        </div>
      </div>
      <div className="advanced-dropdown__actions">
        <button type="button" className="dropdown-btn" onClick={handleClear}>{lang === 'en' ? 'Clear' : '清除'}</button>
        <button type="button" className="dropdown-btn" onClick={handleApply}>{lang === 'en' ? 'Apply' : '確定'}</button>
      </div>
    </div>
  );
}
