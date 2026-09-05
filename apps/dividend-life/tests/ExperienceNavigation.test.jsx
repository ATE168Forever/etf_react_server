import { render, screen, fireEvent, within } from '@testing-library/react';
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

describe('ExperienceNavigation lang prop', () => {
  test('uses the lang prop for labels when provided, ignoring its own hook state', () => {
    // The 'home' experience's labels differ between zh/en ({ zh: '首頁', en: 'Home' }); 'dividend-life'
    // itself does not ({ zh: 'Dividend Life', en: 'Dividend Life' }), so it can't discriminate this test.
    localStorage.setItem('lang', 'zh'); // hook's own fallback state would read this and render Chinese labels

    render(<ExperienceNavigation current="dividend-life" theme="light" lang="en" />);

    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.queryByText('首頁')).not.toBeInTheDocument();
  });
});

describe('ExperienceNavigation mobile switcher', () => {
  test('renders both the desktop icon row and the mobile switcher badge unconditionally (CSS handles which is visible)', () => {
    const { container } = render(<ExperienceNavigation current="dividend-life" theme="light" lang="zh" />);
    expect(container.querySelector('.nav')).toBeInTheDocument();
    expect(container.querySelector('.mobileSwitcher')).toBeInTheDocument();
  });

  test('mobile toggle shows the current experience label and is closed by default', () => {
    const { container } = render(<ExperienceNavigation current="dividend-life" theme="light" lang="zh" />);
    const toggle = screen.getByRole('button', { name: /Dividend Life/i });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveAttribute('aria-haspopup', 'true');
    expect(container.querySelector('.mobileDropdown')).not.toBeInTheDocument();
  });

  test('clicking the toggle opens a dropdown menu with all 5 experiences, current one marked via aria-current', () => {
    const { container } = render(<ExperienceNavigation current="balance-life" theme="light" lang="zh" />);
    fireEvent.click(screen.getByRole('button', { name: /Balance Life/i }));

    const dropdown = container.querySelector('.mobileDropdown');
    expect(dropdown).toBeInTheDocument();
    const links = within(dropdown).getAllByRole('link');
    expect(links).toHaveLength(5);

    const active = links.find((link) => link.getAttribute('aria-current') === 'page');
    expect(active).toHaveTextContent('Balance Life');
  });

  test('clicking outside the switcher closes the open dropdown', () => {
    const { container } = render(<ExperienceNavigation current="dividend-life" theme="light" lang="zh" />);
    fireEvent.click(screen.getByRole('button', { name: /Dividend Life/i }));
    expect(container.querySelector('.mobileDropdown')).toBeInTheDocument();

    fireEvent.mouseDown(document.body);
    expect(container.querySelector('.mobileDropdown')).not.toBeInTheDocument();
  });

  test('pressing Escape closes the dropdown and returns focus to the toggle button', () => {
    const { container } = render(<ExperienceNavigation current="dividend-life" theme="light" lang="zh" />);
    const toggle = screen.getByRole('button', { name: /Dividend Life/i });
    fireEvent.click(toggle);
    expect(container.querySelector('.mobileDropdown')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(container.querySelector('.mobileDropdown')).not.toBeInTheDocument();
    expect(toggle).toHaveFocus();
  });

  test('selecting an item in the dropdown closes it', () => {
    const { container } = render(<ExperienceNavigation current="dividend-life" theme="light" lang="zh" />);
    fireEvent.click(screen.getByRole('button', { name: /Dividend Life/i }));
    const dropdown = container.querySelector('.mobileDropdown');
    fireEvent.click(within(dropdown).getByRole('link', { name: /Health Life/i }));
    expect(container.querySelector('.mobileDropdown')).not.toBeInTheDocument();
  });
});
