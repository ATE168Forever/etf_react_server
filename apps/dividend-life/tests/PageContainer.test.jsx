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
});
