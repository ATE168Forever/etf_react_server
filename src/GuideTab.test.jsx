/* eslint-env jest */
import { render, screen } from '@testing-library/react';
import GuideTab from './GuideTab';

test('renders guide heading', () => {
  render(<GuideTab />);
  expect(
    screen.getByRole('heading', { name: /使用小幫手/ })
  ).toBeInTheDocument();
});
