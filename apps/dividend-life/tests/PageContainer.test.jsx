import { render, screen } from '@testing-library/react';
import PageContainer from '../src/components/PageContainer.jsx';

describe('PageContainer', () => {
  test('renders navigation and children inside a main landmark', () => {
    render(
      <PageContainer navigation={<div>NAV</div>}>
        <p>CONTENT</p>
      </PageContainer>,
    );
    const main = screen.getByRole('main');
    expect(main).toHaveTextContent('NAV');
    expect(main).toHaveTextContent('CONTENT');
  });

  test('applies the wide content modifier class when wide=true', () => {
    const { container } = render(
      <PageContainer navigation={<div>NAV</div>} wide>
        <p>CONTENT</p>
      </PageContainer>,
    );
    const section = container.querySelector('section');
    expect(section.className).toMatch(/contentWide/);
  });

  test('renders footer as a sibling of the content section, not nested inside it', () => {
    const { container } = render(
      <PageContainer navigation={<div>NAV</div>} footer={<div>FOOTER</div>}>
        <p>CONTENT</p>
      </PageContainer>,
    );
    const section = container.querySelector('section');
    expect(section).not.toHaveTextContent('FOOTER');
    expect(screen.getByRole('main')).toHaveTextContent('FOOTER');
  });

  test('renders heading and overlay as siblings of the content section, not nested inside it', () => {
    // Regression test: heading/overlay must NOT be direct children of the wide
    // content section, because `.contentWide > * { width: 100% }` (CSS) would
    // stretch them — this previously broke the sr-only heading (360px overflow)
    // and the floating assistant toggle (became a full-width oval, blocking
    // clicks on the cookie-consent button underneath it).
    const { container } = render(
      <PageContainer
        navigation={<div>NAV</div>}
        wide
        heading={<h1 data-testid="heading">HEADING</h1>}
        overlay={<button data-testid="overlay">OVERLAY</button>}
      >
        <p>CONTENT</p>
      </PageContainer>,
    );
    const section = container.querySelector('section');
    expect(section).not.toHaveTextContent('HEADING');
    expect(section).not.toHaveTextContent('OVERLAY');
    const main = screen.getByRole('main');
    expect(main).toContainElement(screen.getByTestId('heading'));
    expect(main).toContainElement(screen.getByTestId('overlay'));
  });

  test('heading renders before navigation, overlay renders after footer', () => {
    const { container } = render(
      <PageContainer
        heading={<h1 data-testid="heading">HEADING</h1>}
        navigation={<div data-testid="nav">NAV</div>}
        footer={<div data-testid="footer">FOOTER</div>}
        overlay={<button data-testid="overlay">OVERLAY</button>}
      >
        <p>CONTENT</p>
      </PageContainer>,
    );
    const main = container.querySelector('main');
    const order = Array.from(main.querySelectorAll('[data-testid]')).map(
      (el) => el.dataset.testid,
    );
    expect(order).toEqual(['heading', 'nav', 'footer', 'overlay']);
  });
});
