import { describe, expect, it, vi, afterEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import TypewriterDesk from './TypewriterDesk.jsx';
import { paginate } from '../../../utils/typewriterPages.js';
import { keyForEvent } from './keyLayout.js';

const setReducedMotion = (reduced) => {
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches: reduced && query.includes('reduce'),
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
};

// The desk edits the parent's state exactly like the document editor does.
function Harness({ initial = '', onReview = () => {}, onSave = () => {} }) {
  const [value, setValue] = useState(initial);
  return (
    <>
      <TypewriterDesk value={value} onChange={setValue} onReview={onReview} onSave={onSave} />
      <output data-testid="state">{value}</output>
    </>
  );
}

afterEach(() => {
  vi.useRealTimers();
});

describe('TypewriterDesk', () => {
  it('types into the real article state (one shared value, no separate copy)', () => {
    setReducedMotion(false);
    render(<Harness />);
    const field = screen.getByLabelText(/article content/i);
    expect(field).toHaveProperty('id', 'post-content');
    fireEvent.change(field, { target: { value: '## Hello\n\nFirst line' } });
    expect(screen.getByTestId('state').textContent).toBe('## Hello\n\nFirst line');
  });

  it('accepts a large paste immediately, whatever the animation is doing', () => {
    setReducedMotion(false);
    render(<Harness />);
    const big = Array.from({ length: 500 }, (_, i) => `\tline ${i}`).join('\n');
    fireEvent.change(screen.getByLabelText(/article content/i), { target: { value: `\`\`\`js\n${big}\n\`\`\`` } });
    expect(screen.getByTestId('state').textContent).toBe(`\`\`\`js\n${big}\n\`\`\``);
  });

  it('writes forward: arrow keys do not move the caret back into earlier text', () => {
    setReducedMotion(false);
    render(<Harness initial="abc" />);
    const field = screen.getByLabelText(/article content/i);
    const event = new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true });
    field.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it('saves with Ctrl+S', () => {
    setReducedMotion(false);
    const onSave = vi.fn();
    render(<Harness initial="abc" onSave={onSave} />);
    fireEvent.keyDown(screen.getByLabelText(/article content/i), { key: 's', ctrlKey: true });
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('with reduced motion, finished pages are on the stack straight away (no flight)', () => {
    setReducedMotion(true);
    const long = Array.from({ length: 120 }, (_, i) => `Paragraph ${i}`).join('\n');
    const pages = paginate(long).length;
    const { container } = render(<Harness initial={long} />);
    expect(container.querySelector('.tdk-flyer')).toBeNull();
    expect(screen.getByText(new RegExp(`Page ${pages} of ${pages}`))).toBeTruthy();
    expect(screen.getByRole('button', { name: new RegExp(`${pages - 1} finished pages`) })).toBeTruthy();
  });

  it('in a background tab, finished pages go straight onto the stack (no flight left waiting mid-air)', () => {
    setReducedMotion(false);
    const original = Object.getOwnPropertyDescriptor(Document.prototype, 'visibilityState');
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    try {
      const long = Array.from({ length: 120 }, (_, i) => `Paragraph ${i}`).join('\n');
      const pages = paginate(long).length;
      const { container } = render(<Harness initial={long} />);
      expect(container.querySelector('.tdk-flyer')).toBeNull();
      expect(screen.getByText(new RegExp(`Page ${pages} of ${pages}`))).toBeTruthy();
    } finally {
      delete document.visibilityState;
      if (original) Object.defineProperty(Document.prototype, 'visibilityState', original);
    }
  });

  it('opening the stack goes to the full article review', () => {
    setReducedMotion(true);
    const onReview = vi.fn();
    render(<Harness initial="text" onReview={onReview} />);
    fireEvent.click(screen.getByRole('button', { name: /review the full article/i }));
    expect(onReview).toHaveBeenCalledTimes(1);
  });

  it('the review button waits for the leaving transition when motion is allowed', () => {
    vi.useFakeTimers();
    setReducedMotion(false);
    const onReview = vi.fn();
    render(<Harness initial="text" onReview={onReview} />);
    fireEvent.click(screen.getByRole('button', { name: /^review full article$/i }));
    expect(onReview).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(400));
    expect(onReview).toHaveBeenCalledTimes(1);
  });
});

describe('keyForEvent', () => {
  it('maps typed characters to the typewriter key that would type them', () => {
    expect(keyForEvent({ key: 'a' })).toBe('a');
    expect(keyForEvent({ key: 'A' })).toBe('a');
    expect(keyForEvent({ key: '@' })).toBe('2');
    expect(keyForEvent({ key: ' ' })).toBe('space');
    expect(keyForEvent({ key: '?' })).toBe('slash');
    expect(keyForEvent({ key: 'Enter' })).toBeNull();
    expect(keyForEvent({ key: 'é' })).toMatch(/^[a-z]$/); // no such key: a letter key moves
  });
});
