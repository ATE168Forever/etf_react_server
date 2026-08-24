/* eslint-env jest */
import { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import FilterDropdown from '../src/components/FilterDropdown';

function Harness() {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button type="button" onClick={() => setOpen(true)}>Filter</button>
      {open && (
        <FilterDropdown
          options={[{ label: 'A', value: 'a' }]}
          selected={[]}
          setSelected={() => {}}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}

test('returns focus to the trigger button when the dropdown closes', () => {
  render(<Harness />);
  const trigger = screen.getByRole('button', { name: 'Filter' });
  trigger.focus();
  fireEvent.click(trigger);

  fireEvent.keyDown(document, { key: 'Escape' });
  expect(document.activeElement).toBe(trigger);
});
