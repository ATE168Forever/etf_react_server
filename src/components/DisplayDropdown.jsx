import { useRef } from 'react';
import useClickOutside from './useClickOutside';
import { useLanguage } from '../i18n';

export default function DisplayDropdown({
  toggleDividendYield,
  showDividendYield,
  toggleAxis,
  showInfoAxis,
  onClose
}) {
  const ref = useRef();
  useClickOutside(ref, onClose);
  const { lang } = useLanguage();

  const handleClick = (action) => {
    action();
    onClose();
  };

  return (
      <div className="action-dropdown silver-button-container" ref={ref}>
        <button onClick={() => handleClick(toggleDividendYield)}>
          {showDividendYield ? (lang === 'en' ? 'Show Dividends' : '顯示配息') : (lang === 'en' ? 'Show Yield' : '顯示殖利率')}
        </button>
        <button onClick={() => handleClick(toggleAxis)}>
          {showInfoAxis ? (lang === 'en' ? 'Show Months' : '顯示月份') : (lang === 'en' ? 'Show Info' : '顯示資訊')}
        </button>
      </div>
  );
}
