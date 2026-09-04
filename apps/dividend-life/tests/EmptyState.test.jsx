/* eslint-env jest */
import { render, screen, fireEvent } from '@testing-library/react';
import EmptyState from '../src/components/EmptyState';

test('renders title as heading and optional description', () => {
  render(<EmptyState title="No data" description="Add something" />);
  expect(screen.getByRole('heading', { name: 'No data' })).toBeInTheDocument();
  expect(screen.getByText('Add something')).toBeInTheDocument();
});

test('omits description paragraph when not provided', () => {
  const { container } = render(<EmptyState title="No data" />);
  expect(container.querySelectorAll('p').length).toBe(0);
});

test('renders actions in order and fires their onClick handlers', () => {
  const onFirst = jest.fn();
  const onSecond = jest.fn();
  render(
    <EmptyState
      title="No data"
      actions={[
        { label: 'Primary', onClick: onFirst, variant: 'primary' },
        { label: 'Secondary', onClick: onSecond },
      ]}
    />
  );
  const buttons = screen.getAllByRole('button');
  expect(buttons.map(b => b.textContent)).toEqual(['Primary', 'Secondary']);
  fireEvent.click(buttons[0]);
  expect(onFirst).toHaveBeenCalledTimes(1);
  fireEvent.click(buttons[1]);
  expect(onSecond).toHaveBeenCalledTimes(1);
});

test('defaults action variant to secondary', () => {
  render(<EmptyState title="No data" actions={[{ label: 'Go', onClick: () => {} }]} />);
  const button = screen.getByRole('button', { name: 'Go' });
  expect(button.className).toMatch(/secondary/);
});

test('renders children slot below actions', () => {
  render(
    <EmptyState title="No data" actions={[{ label: 'Go', onClick: () => {} }]}>
      <p>Disclaimer text</p>
    </EmptyState>
  );
  expect(screen.getByText('Disclaimer text')).toBeInTheDocument();
});
