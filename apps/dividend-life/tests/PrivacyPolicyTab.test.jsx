/* eslint-env jest */
import { render, screen } from '@testing-library/react';
import PrivacyPolicyTab from '../src/PrivacyPolicyTab';

test('renders privacy policy heading', () => {
  render(<PrivacyPolicyTab />);
  expect(
    screen.getByRole('heading', { name: /隱私權政策/ })
  ).toBeInTheDocument();
});
