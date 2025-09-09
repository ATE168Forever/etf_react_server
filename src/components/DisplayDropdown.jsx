import { useRef } from 'react';
import useClickOutside from './useClickOutside';

export default function DisplayDropdown({
  toggleDiamond,
  showDiamondOnly,
  toggleDividendYield,
  showDividendYield,
  toggleAxis,
  showInfoAxis,
  onClose
}) {
  const ref = useRef();
  useClickOutside(ref, onClose);

  const handleClick = (action) => {
    action();
    onClose();
  };

  return (
    <div className="action-dropdown" ref={ref}>
      <button onClick={() => handleClick(toggleDiamond)}>
        {showDiamondOnly ? '顯示全部' : '顯示鑽石'}
      </button>
      <button onClick={() => handleClick(toggleDividendYield)}>
        {showDividendYield ? '顯示配息' : '顯示殖利率'}
      </button>
      <button onClick={() => handleClick(toggleAxis)}>
        {showInfoAxis ? '顯示月份' : '顯示資訊'}
      </button>
    </div>
  );
}
