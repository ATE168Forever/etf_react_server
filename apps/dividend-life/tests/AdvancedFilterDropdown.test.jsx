/* eslint-env jest */
import { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import AdvancedFilterDropdown from '../src/components/AdvancedFilterDropdown';

function Harness() {
  const [open, setOpen] = useState(false);
  const [filters, setFilters] = useState({});
  return (
    <div>
      <button type="button" onClick={() => setOpen(true)}>Advanced filters</button>
      {open && (
        <AdvancedFilterDropdown
          filters={filters}
          setFilters={setFilters}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}

test('returns focus to the trigger button when the dropdown closes', () => {
  render(<Harness />);
  const trigger = screen.getByRole('button', { name: 'Advanced filters' });
  trigger.focus();
  fireEvent.click(trigger);

  // Simulate the user tabbing into the dropdown and interacting with a field
  // inside it before closing, which is when focus would otherwise be lost.
  const minYieldInput = screen.getByLabelText('最低預估殖利率 (%)');
  minYieldInput.focus();

  fireEvent.keyDown(document, { key: 'Escape' });
  expect(document.activeElement).toBe(trigger);
});
