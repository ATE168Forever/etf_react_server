import { render, screen } from '@testing-library/react';
import ExperienceNavigation from '@shared/components/ExperienceNavigation/ExperienceNavigation.jsx';

// SVG imports are discriminated by jest.config.js's moduleNameMapper
// ('dividend-life-light.svg' -> test-file-mock-light.js, 'dividend-life.svg'
// -> test-file-mock-dark.js), so no per-test jest.mock() is needed here.

describe('ExperienceNavigation theme prop', () => {
  test('uses the theme prop for logo selection when provided, ignoring its own hook state', () => {
    localStorage.clear(); // no stored 'theme' -> internal hook would default to 'dark'

    const { unmount } = render(<ExperienceNavigation current="dividend-life" theme="light" />);
    const lightLink = screen.getByRole('link', { name: /dividend life/i });
    const lightImg = lightLink.querySelector('img');
    expect(lightImg.src).toMatch(/dividend-life-light-stub\.svg/);
    unmount();

    render(<ExperienceNavigation current="dividend-life" theme="dark" />);
    const darkLink = screen.getByRole('link', { name: /dividend life/i });
    const darkImg = darkLink.querySelector('img');
    expect(darkImg.src).toMatch(/dividend-life-dark-stub\.svg/);

    expect(lightImg.src).not.toEqual(darkImg.src);
  });
});
