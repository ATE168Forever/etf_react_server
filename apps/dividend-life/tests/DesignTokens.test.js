import { readFileSync } from 'fs';
import path from 'path';

const css = readFileSync(
  path.join(__dirname, '../src/index.css'),
  'utf8',
);
const appCss = readFileSync(
  path.join(__dirname, '../src/App.css'),
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

describe('PR 3 color sweep — no leftover pre-redesign hardcoded colors', () => {
  const bootstrapBlueAndLegendLiterals = [
    /rgb\(13,\s*110,\s*253\)/i,
    /#ff8fa3/i,
    /#2f9e44/i,
    /#ff6b6b/i,
    /rgba\(96,\s*165,\s*250/i,
    /#dbeafe/i,
    /#bfdbfe/i,
  ];

  test('App.css no longer contains the pre-redesign hardcoded literals', () => {
    bootstrapBlueAndLegendLiterals.forEach((pattern) => {
      expect(appCss).not.toMatch(pattern);
    });
  });

  test('App.css defines an explicit .nav-tabs .nav-link color override using tokens', () => {
    expect(appCss).toMatch(/\.nav-tabs \.nav-link\s*{[^}]*color:\s*var\(--ink-soft\)/);
    expect(appCss).toMatch(/\.nav-tabs \.nav-link\.active\s*{[^}]*background-color:\s*var\(--sage-soft\)/);
  });
});
