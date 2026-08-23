import { readFileSync } from 'fs';
import path from 'path';

const css = readFileSync(
  path.join(__dirname, '../src/index.css'),
  'utf8',
);

describe('design tokens (spec §5.1)', () => {
  const newTokens = [
    '--bg', '--surface', '--surface-2', '--ink', '--ink-soft', '--muted', '--border',
    '--sage', '--sage-hover', '--sage-soft', '--terracotta', '--terracotta-soft',
    '--gold', '--gold-soft', '--focus', '--shadow-card', '--radius-card',
    '--radius-control', '--font-display', '--font-body', '--font-number',
  ];

  test('all new tokens are defined on :root (light)', () => {
    const rootBlock = css.split(":root[data-theme='dark']")[0];
    newTokens.forEach((token) => {
      expect(rootBlock).toMatch(new RegExp(`${token}\\s*:`));
    });
  });

  test('all new tokens are defined on :root[data-theme="dark"]', () => {
    const darkBlock = css.split(":root[data-theme='dark']")[1];
    newTokens.forEach((token) => {
      expect(darkBlock).toMatch(new RegExp(`${token}\\s*:`));
    });
  });

  test('legacy tokens alias the new tokens instead of hardcoding colors', () => {
    expect(css).toMatch(/--color-bg:\s*var\(--bg\)/);
    expect(css).toMatch(/--color-text:\s*var\(--ink\)/);
    expect(css).toMatch(/--color-card-bg:\s*var\(--surface\)/);
    expect(css).toMatch(/--color-border:\s*var\(--border\)/);
    expect(css).toMatch(/--accent-gold:\s*var\(--gold\)/);
  });
});
