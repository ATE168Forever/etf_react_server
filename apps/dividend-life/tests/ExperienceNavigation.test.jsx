import { render, screen } from '@testing-library/react';
import ExperienceNavigation from '@shared/components/ExperienceNavigation/ExperienceNavigation.jsx';

// Mock the SVG imports to return identifiable values
jest.mock('@shared/assets/dividend-life.svg', () => 'dividend-life-dark.svg');
jest.mock('@shared/assets/dividend-life-light.svg', () => 'dividend-life-light.svg');

describe('ExperienceNavigation theme prop', () => {
  test('uses the theme prop for logo selection when provided, ignoring its own hook state', () => {
    localStorage.clear(); // no stored 'theme' -> internal hook would default to 'dark'
    render(<ExperienceNavigation current="dividend-life" theme="light" />);
    const dividendLink = screen.getByRole('link', { name: /dividend life/i });
    const img = dividendLink.querySelector('img');
    expect(img.src).toMatch(/dividend-life-light\.svg/);
  });
});
