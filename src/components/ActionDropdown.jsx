import { useRef } from 'react';
import useClickOutside from './useClickOutside';

export default function ActionDropdown({
  openGroupModal,
  monthlyIncomeGoal,
  setMonthlyIncomeGoal,
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
      <button onClick={() => handleClick(openGroupModal)}>建立觀察組合</button>
      <div style={{ marginTop: 8, textAlign: 'left' }}>
        <label>
          預計月報酬：
          <input
            type="number"
            value={monthlyIncomeGoal}
            onChange={e => setMonthlyIncomeGoal(Number(e.target.value) || 0)}
            style={{ width: 80, marginLeft: 4 }}
          />
        </label>
      </div>
    </div>
  );
}
