/* eslint-env jest */
import { render, screen, fireEvent } from '@testing-library/react';
import InvestmentGoalCard from '../src/components/InvestmentGoalCard';

function renderCard() {
  return render(
    <InvestmentGoalCard
      title="Test Goal"
      share={{
        message: 'Hello world',
        heading: 'Share heading',
        shareButtonLabel: 'Share',
        shareAriaLabel: 'Share goal',
        copyButtonLabel: 'Copy',
        closeLabel: 'Close',
        previewLabel: 'Preview'
      }}
    />
  );
}

test('traps focus within the share dialog when open', () => {
  renderCard();
  fireEvent.click(screen.getByRole('button', { name: 'Share goal' }));

  const dialog = screen.getByRole('dialog');
  const focusable = Array.from(
    dialog.querySelectorAll('button:not([disabled]), textarea, [href], input:not([disabled]), select, [tabindex]:not([tabindex="-1"])')
  );
  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  last.focus();
  fireEvent.keyDown(last, { key: 'Tab' });
  expect(document.activeElement).toBe(first);
});

test('moves focus into the share dialog when it opens', () => {
  renderCard();
  fireEvent.click(screen.getByRole('button', { name: 'Share goal' }));

  const dialog = screen.getByRole('dialog');
  expect(dialog.contains(document.activeElement)).toBe(true);
});
