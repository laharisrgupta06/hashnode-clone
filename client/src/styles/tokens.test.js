import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Reads the real tokens.css from disk, so changing a colour there re-checks accessibility automatically.
// (Tests run from the client/ folder: `npm test`.)
const css = readFileSync(resolve(process.cwd(), 'src/styles/tokens.css'), 'utf8');
if (!css.includes('--bg:')) throw new Error('tokens.css could not be read');
const token = (name) => {
  const match = css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`));
  if (!match) throw new Error(`token --${name} not found`);
  return match[1];
};

// WCAG 2 relative luminance and contrast ratio.
const luminance = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

const SURFACES = ['bg', 'surface', 'surface-raised', 'surface-hover'];

describe('colour contrast (WCAG AA)', () => {
  // Normal-size text needs at least 4.5:1 on every surface it can sit on.
  it.each(['text', 'text-muted', 'text-subtle', 'link', 'accent-text', 'danger', 'success', 'warning'].flatMap((fg) => SURFACES.map((bg) => [fg, bg])))(
    '--%s on --%s is at least 4.5:1',
    (fg, bg) => {
      expect(contrast(token(fg), token(bg))).toBeGreaterThanOrEqual(4.5);
    }
  );

  it.each([
    ['on-accent', 'accent'],
    ['on-accent', 'accent-hover'],
    ['on-danger', 'danger-strong'],
    ['text', 'danger-tint'],
    ['text', 'success-tint'],
    ['text', 'info-tint'],
    ['text', 'warning-tint'],
    ['text-muted', 'danger-tint'],
    ['text-muted', 'success-tint'],
    ['text', 'bg-alt'],
    ['text-muted', 'bg-alt'],
    ['danger', 'danger-tint'],
    ['success', 'success-tint'],
    ['warning', 'warning-tint'],
    ['dark-text', 'dark-bg'],
    ['dark-text', 'dark-surface'],
    ['dark-muted', 'dark-surface'],
    ['dark-accent', 'dark-bg'],
    ['code-text', 'code-bg'],
    ['code-muted', 'code-header'],
    ['text-muted', 'info-tint'],
  ])('--%s on --%s is at least 4.5:1', (fg, bg) => {
    expect(contrast(token(fg), token(bg))).toBeGreaterThanOrEqual(4.5);
  });

  // Borders of inputs/controls and the focus ring must be visible: at least 3:1 (WCAG 1.4.11).
  it.each(SURFACES)('--border-control on --%s is at least 3:1', (bg) => {
    expect(contrast(token('border-control'), token(bg))).toBeGreaterThanOrEqual(3);
  });

  it.each(SURFACES)('--focus on --%s is at least 3:1', (bg) => {
    expect(contrast(token('focus'), token(bg))).toBeGreaterThanOrEqual(3);
  });

  it('the contrast formula itself is right (black on white is 21:1)', () => {
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 5);
  });
});
