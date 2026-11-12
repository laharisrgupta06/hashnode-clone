import { describe, it, expect } from 'vitest';
import { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import TagInput from './TagInput.jsx';

function Harness({ initial = [] }) {
  const [tags, setTags] = useState(initial);
  return (
    <>
      <TagInput tags={tags} onChange={setTags} suggestions={['react', 'node']} />
      <output data-testid="tags">{tags.join('|')}</output>
    </>
  );
}

const input = () => screen.getByLabelText('Tags');
const tags = () => screen.getByTestId('tags').textContent;
const type = (value) => fireEvent.change(input(), { target: { value } });

describe('TagInput', () => {
  it('adds a tag on Enter, normalised to lowercase with single spaces', () => {
    render(<Harness />);
    type('  Machine   Learning ');
    fireEvent.keyDown(input(), { key: 'Enter' });
    expect(tags()).toBe('machine learning');
    expect(input().value).toBe('');
  });

  it('a comma finishes a tag even without a key event (phone keyboards, pasting)', () => {
    render(<Harness />);
    type('react,');
    expect(tags()).toBe('react');
    type('node, css, html');
    expect(tags()).toBe('react|node|css');
    expect(input().value).toBe('html'); // still being typed
  });

  it('rejects duplicates, too-long names and names without letters or digits, with a message', () => {
    render(<Harness initial={['react']} />);
    type('React');
    fireEvent.keyDown(input(), { key: 'Enter' });
    expect(screen.getByRole('alert').textContent).toBe('That tag is already added');
    type('x'.repeat(31));
    fireEvent.keyDown(input(), { key: 'Enter' });
    expect(screen.getByRole('alert').textContent).toBe('A tag can have at most 30 characters');
    type('###');
    fireEvent.keyDown(input(), { key: 'Enter' });
    expect(screen.getByRole('alert').textContent).toBe('A tag must contain at least one letter or number');
    expect(tags()).toBe('react');
  });

  it('removes a tag with its button, and the last tag with Backspace in an empty box', () => {
    render(<Harness initial={['a1', 'b2', 'c3']} />);
    fireEvent.click(screen.getByRole('button', { name: 'Remove tag b2' }));
    expect(tags()).toBe('a1|c3');
    fireEvent.keyDown(input(), { key: 'Backspace' });
    expect(tags()).toBe('a1');
  });

  it('stops at 10 tags and says so', () => {
    render(<Harness initial={Array.from({ length: 10 }, (_, i) => `t${i}`)} />);
    expect(input().disabled).toBe(true);
    expect(input().placeholder).toBe('Maximum of 10 tags reached');
  });

  it('offers existing tags that are not selected yet as suggestions', () => {
    const { container } = render(<Harness initial={['react']} />);
    expect([...container.querySelectorAll('datalist option')].map((o) => o.value)).toEqual(['node']);
  });
});
