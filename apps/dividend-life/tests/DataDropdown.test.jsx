/* eslint-env jest */
import { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import DataDropdown from '../src/components/DataDropdown';

function Harness() {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button type="button" onClick={() => setOpen(true)}>Data menu</button>
      {open && (
        <DataDropdown
          onClose={() => setOpen(false)}
          handleImportClick={() => {}}
          handleExportClick={() => {}}
          selectedSource="csv"
          onSelectChange={() => {}}
          driveConnected={false}
          driveStatus={{}}
          driveMismatch={false}
          onConnectDrive={() => {}}
          onViewDriveData={() => {}}
        />
      )}
    </div>
  );
}

test('returns focus to the trigger button when the dropdown closes', () => {
  render(<Harness />);
  const trigger = screen.getByRole('button', { name: 'Data menu' });
  trigger.focus();
  fireEvent.click(trigger);

  // Simulate the user tabbing into the dropdown and interacting with a field
  // inside it before closing, which is when focus would otherwise be lost.
  const sourceSelect = screen.getByLabelText('存取方式');
  sourceSelect.focus();

  fireEvent.keyDown(document, { key: 'Escape' });
  expect(document.activeElement).toBe(trigger);
});
