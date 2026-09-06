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

describe('AdvancedFilterDropdown — PR4 reorganization', () => {
  test('does not render a currency checkbox group (moved to primary filter bar)', () => {
    render(
      <AdvancedFilterDropdown
        filters={{ minYield: '', freq: [], upcomingWithin: '', diamond: false }}
        setFilters={jest.fn()}
        onClose={jest.fn()}
        displayMode="default"
        onDisplayModeChange={jest.fn()}
      />
    );
    expect(screen.queryByText('幣別')).not.toBeInTheDocument();
    expect(screen.queryByText('Currency')).not.toBeInTheDocument();
  });

  test('renders the display mode selector', () => {
    render(
      <AdvancedFilterDropdown
        filters={{ minYield: '', freq: [], upcomingWithin: '', diamond: false }}
        setFilters={jest.fn()}
        onClose={jest.fn()}
        displayMode="yield"
        onDisplayModeChange={jest.fn()}
      />
    );
    expect(screen.getByLabelText('顯示模式')).toHaveValue('yield');
  });

  test('renders the renamed high-yield-only checkbox, not the old "diamond" wording', () => {
    render(
      <AdvancedFilterDropdown
        filters={{ minYield: '', freq: [], upcomingWithin: '', diamond: false }}
        setFilters={jest.fn()}
        onClose={jest.fn()}
        displayMode="default"
        onDisplayModeChange={jest.fn()}
      />
    );
    expect(screen.getByText('只顯示殖利率偏高標的')).toBeInTheDocument();
    expect(screen.queryByText('只顯示鑽石')).not.toBeInTheDocument();
  });
});
