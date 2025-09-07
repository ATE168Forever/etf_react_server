import { useState, useRef } from 'react';
import useClickOutside from './useClickOutside';

export default function AdvancedFilterDropdown({ filters, setFilters, onClose }) {
  const ref = useRef();
  useClickOutside(ref, onClose);

  const [temp, setTemp] = useState(filters);

  const toggleFreq = (val) => {
    setTemp(t => ({
      ...t,
      freq: t.freq.includes(val) ? t.freq.filter(f => f !== val) : [...t.freq, val]
    }));
  };

  const handleClear = () => {
    setTemp({ minYield: '', freq: [], upcomingWithin: '' });
  };

  const handleApply = () => {
    setFilters(temp);
    onClose();
  };

  return (
    <div className="dropdown" ref={ref} style={{ padding: 8, zIndex: 9999 }}>
      <div className="dropdown-section">
        <label>
          預估殖利率 ≥
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
        {[{ v: 12, l: '月配' }, { v: 6, l: '雙月配' }, { v: 4, l: '季配' }, { v: 2, l: '半年配' }, { v: 1, l: '年配' }].map(opt => (
          <label key={opt.v} className="dropdown-item">
            <input
              type="checkbox"
              checked={temp.freq.includes(opt.v)}
              onChange={() => toggleFreq(opt.v)}
            /> {opt.l}
          </label>
        ))}
      </div>
      <hr />
      <div className="dropdown-section">
        <label>
          即將除息/發息：未來
          <input
            type="number"
            value={temp.upcomingWithin}
            onChange={e => setTemp({ ...temp, upcomingWithin: e.target.value })}
            style={{ width: 60, margin: '0 4px' }}
          />天內
        </label>
      </div>
      <div style={{ marginTop: 8, textAlign: 'right' }}>
        <button className="dropdown-btn" onClick={handleClear}>清除</button>
        <button className="dropdown-btn" style={{ marginLeft: 8 }} onClick={handleApply}>確定</button>
      </div>
    </div>
  );
}

