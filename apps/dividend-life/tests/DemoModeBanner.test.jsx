/* eslint-env jest */
import { render, screen, fireEvent } from '@testing-library/react';
import DemoModeBanner from '../src/components/DemoModeBanner';
import { translations } from '../src/i18n';

const t = (key) => translations.zh[key] || key;

test('renders nothing when isVisible is false', () => {
  const { container } = render(<DemoModeBanner isVisible={false} onExit={() => {}} t={t} />);
  expect(container).toBeEmptyDOMElement();
});

test('renders the banner and exit button when isVisible is true', () => {
  const onExit = jest.fn();
  render(<DemoModeBanner isVisible onExit={onExit} t={t} />);
  expect(screen.getByText(t('demo_mode_banner_text'))).toBeInTheDocument();
  fireEvent.click(screen.getByText(t('demo_mode_banner_exit')));
  expect(onExit).toHaveBeenCalled();
});
