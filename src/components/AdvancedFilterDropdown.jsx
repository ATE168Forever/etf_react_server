import { useState, useRef } from 'react';
import useClickOutside from './useClickOutside';
import { useLanguage } from '../i18n';

export default function AdvancedFilterDropdown({ filters, setFilters, onClose }) {
  const ref = useRef();
  useClickOutside(ref, onClose);
  const { lang } = useLanguage();

  const [temp, setTemp] = useState(filters);

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

  return (
    <div className="dropdown" ref={ref} style={{ padding: 8, zIndex: 9999 }}>
      <div className="dropdown-section">
        <label>
          {lang === 'en' ? 'Estimated yield ≥' : '預估殖利率 ≥'}
          <input
            type="number"
            value={temp.minYield}
            onChange={e => setTemp({ ...temp, minYield: e.target.value })}
            style={{ width: 60, marginLeft: 4 }}
          />%
        </label>
      </div>
      <hr />
      <div className="dropdown-section" style={{ maxHeight: 100, overflowY: 'auto' }}>
        {[{ v: 12, zh: '月配', en: 'Monthly' }, { v: 6, zh: '雙月配', en: 'Bimonthly' }, { v: 4, zh: '季配', en: 'Quarterly' }, { v: 2, zh: '半年配', en: 'Semi-annual' }, { v: 1, zh: '年配', en: 'Annual' }].map(opt => (
          <label key={opt.v} className="dropdown-item">
            <input
              type="checkbox"
              checked={temp.freq.includes(opt.v)}
              onChange={() => toggleFreq(opt.v)}
            /> {lang === 'en' ? opt.en : opt.zh}
          </label>
        ))}
      </div>
      <hr />
      <div className="dropdown-section">
        <label className="dropdown-item">
          <input
            type="checkbox"
            checked={temp.diamond}
            onChange={e => setTemp({ ...temp, diamond: e.target.checked })}
          /> {lang === 'en' ? 'Show only diamonds' : '只顯示鑽石'}
        </label>
      </div>
      <hr />
      <div className="dropdown-section">
        <label>
          {lang === 'en' ? 'Upcoming ex/payout within' : '即將除息/發息：未來'}
          <input
            type="number"
            value={temp.upcomingWithin}
            onChange={e => setTemp({ ...temp, upcomingWithin: e.target.value })}
            style={{ width: 60, margin: '0 4px' }}
          />{lang === 'en' ? 'days' : '天內'}
        </label>
      </div>
      <div style={{ marginTop: 8, textAlign: 'right' }}>
        <button className="dropdown-btn" onClick={handleClear}>{lang === 'en' ? 'Clear' : '清除'}</button>
        <button className="dropdown-btn" style={{ marginLeft: 8 }} onClick={handleApply}>{lang === 'en' ? 'Apply' : '確定'}</button>
      </div>
    </div>
  );
}

