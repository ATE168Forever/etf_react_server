/* eslint-env jest */
import { render, screen } from '@testing-library/react';
import TermsOfServiceTab from '../TermsOfServiceTab';

test('renders terms heading', () => {
  render(<TermsOfServiceTab />);
  expect(
    screen.getByRole('heading', { name: /服務條款/ })
  ).toBeInTheDocument();
});
