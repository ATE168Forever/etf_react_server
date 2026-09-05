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
    render(<ExperienceNavigation current="dividend-life" theme="light" lang="zh" />);
    const toggle = screen.getByRole('button', { name: /Dividend Life/i });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  test('clicking the toggle opens a listbox with all 5 experiences, current one marked selected', () => {
    render(<ExperienceNavigation current="balance-life" theme="light" lang="zh" />);
    fireEvent.click(screen.getByRole('button', { name: /Balance Life/i }));

    const listbox = screen.getByRole('listbox');
    const options = within(listbox).getAllByRole('option');
    expect(options).toHaveLength(5);

    const selected = options.find((option) => option.getAttribute('aria-selected') === 'true');
    expect(selected).toHaveTextContent('Balance Life');
  });

  test('clicking outside the switcher closes the open dropdown', () => {
    render(<ExperienceNavigation current="dividend-life" theme="light" lang="zh" />);
    fireEvent.click(screen.getByRole('button', { name: /Dividend Life/i }));
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  test('pressing Escape closes the dropdown and returns focus to the toggle button', () => {
    render(<ExperienceNavigation current="dividend-life" theme="light" lang="zh" />);
    const toggle = screen.getByRole('button', { name: /Dividend Life/i });
    fireEvent.click(toggle);
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(toggle).toHaveFocus();
  });

  test('selecting an item in the dropdown closes it', () => {
    render(<ExperienceNavigation current="dividend-life" theme="light" lang="zh" />);
    fireEvent.click(screen.getByRole('button', { name: /Dividend Life/i }));
    const listbox = screen.getByRole('listbox');
    fireEvent.click(within(listbox).getByRole('option', { name: /Health Life/i }));
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});
