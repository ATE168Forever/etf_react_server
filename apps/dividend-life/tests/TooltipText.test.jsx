/* eslint-env jest */
import { render } from '@testing-library/react';
import TooltipText from '../src/components/TooltipText';

// jsdom in this project has no window.matchMedia polyfill, so
// TooltipText's `getMatches()` falls back to `false` — i.e. these
// tests exercise the desktop (non-mobile) branch by default.
test('desktop tooltip trigger is keyboard-focusable', () => {
  const { container } = render(
    <TooltipText tooltip="Yield: 5%">
      <span>0050</span>
    </TooltipText>
  );

  const trigger = container.querySelector('.tooltip-text');
  expect(trigger).toHaveAttribute('tabindex', '0');
  expect(trigger).toHaveAttribute('title', 'Yield: 5%');
});

test('renders children as plain text when there is no tooltip content', () => {
  const { container } = render(
    <TooltipText tooltip="">
      <span>0050</span>
    </TooltipText>
  );

  const trigger = container.querySelector('.tooltip-text');
  expect(trigger).not.toBeInTheDocument();
  expect(container.textContent).toBe('0050');
});
