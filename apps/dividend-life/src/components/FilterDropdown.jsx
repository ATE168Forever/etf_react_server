import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import useClickOutside from './useClickOutside';
import { useLanguage } from '../i18n';

export default function FilterDropdown({ options, selected, setSelected, onClose, position }) {
  const ref = useRef();
  useClickOutside(ref, onClose);
  const { lang } = useLanguage();

  const [tempSelected, setTempSelected] = useState(selected);
  const [searchText, setSearchText] = useState('');

  const filteredOptions = options.filter(opt =>
    opt.label.toLowerCase().includes(searchText.trim().toLowerCase())
  );

  const handleCheck = (val) => {
    setTempSelected(s =>
      s.includes(val) ? s.filter(x => x !== val) : [...s, val]
    );
  };

  const handleAll = () => {
    const filteredValues = filteredOptions.map(o => o.value);
    const allSelected =
      filteredValues.length > 0 &&
      filteredValues.every(v => tempSelected.includes(v)) &&
      tempSelected.length === filteredValues.length;
    setTempSelected(allSelected ? [] : filteredValues);
  };

  const handleApply = () => {
    setSelected(tempSelected.filter(x => options.some(o => o.value === x)));
    onClose();
  };

  const handleClear = () => {
    setTempSelected([]);
  };

  const dropdownStyle = position
    ? {
        position: 'absolute',
        top: position.top,
        left: position.left,
        zIndex: 2000
      }
    : undefined;

  const dropdownContent = (
    <div className="dropdown" ref={ref} style={dropdownStyle}>
      <input
        type="text"
        className="dropdown-search"
        value={searchText}
        onChange={e => setSearchText(e.target.value)}
        placeholder={lang === 'en' ? 'Search...' : '搜尋...'}
        autoFocus
      />
      <div style={{ maxHeight: 180, overflowY: 'auto', marginTop: 6 }}>
        <label className="dropdown-item">
          <input
            type="checkbox"
            checked={
              filteredOptions.length > 0 &&
              filteredOptions.every(opt => tempSelected.includes(opt.value))
            }
            onChange={handleAll}
          />
          <span style={{ fontWeight: 'bold', marginLeft: 5 }}>{lang === 'en' ? 'Select All' : '全選'}</span>
        </label>
        <hr />
        {filteredOptions.length === 0 && (
          <div style={{ color: '#bbb', padding: '8px 0', fontSize: 13 }}>
            {lang === 'en' ? 'No matching options' : '無符合選項'}
          </div>
        )}
        {filteredOptions.map(opt => (
          <label key={opt.value} className="dropdown-item">
            <input
              type="checkbox"
              checked={tempSelected.includes(opt.value)}
              onChange={() => handleCheck(opt.value)}
            /> {opt.label}
          </label>
        ))}
      </div>
      <div style={{ marginTop: 8, textAlign: 'right' }}>
        <button className="dropdown-btn" onClick={handleClear}>{lang === 'en' ? 'Clear' : '清除'}</button>
        <button className="dropdown-btn" style={{ marginLeft: 8 }} onClick={handleApply}>{lang === 'en' ? 'Apply' : '確定'}</button>
      </div>
    </div>
  );

  if (typeof document === 'undefined') {
    return dropdownContent;
  }

  return createPortal(dropdownContent, document.body);
}
