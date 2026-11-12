import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import MarkdownEditor from './MarkdownEditor.jsx';

function Harness({ initial }) {
  const [value, setValue] = useState(initial);
  return (
    <>
      <MarkdownEditor value={value} onChange={setValue} />
      <output data-testid="value">{value}</output>
    </>
  );
}

const setup = (initial, start, end) => {
  render(<Harness initial={initial} />);
  const box = screen.getByLabelText('Article content (Markdown)');
  box.setSelectionRange(start, end);
  fireEvent.select(box);
  return box;
};
const value = () => screen.getByTestId('value').textContent;

describe('formatting toolbar', () => {
  it('groups its controls and labels every button', () => {
    setup('text', 0, 0);
    for (const name of ['Text', 'Style', 'Structure', 'Insert']) expect(screen.getByRole('group', { name })).toBeTruthy();
    for (const label of [/^Bold/, /^Italic/, /^Underline/, /^Strike/, /^Clear/, /^Bullets/, /^Numbers/, /^Quote/, /^Separator/, /^Link/, /^Unlink/, /^Code/, /^Image/]) {
      expect(screen.getByRole('button', { name: label })).toBeTruthy();
    }
  });

  it('underline applies to the article and shows as pressed', () => {
    const box = setup('one word', 4, 8);
    fireEvent.click(screen.getByRole('button', { name: /^Underline/ }));
    expect(value()).toBe('one <u>word</u>');
    box.setSelectionRange(7, 11);
    fireEvent.select(box);
    expect(screen.getByRole('button', { name: /^Underline/ }).getAttribute('aria-pressed')).toBe('true');
  });

  it('text colour dropdown applies, shows the active colour, and removes it', () => {
    const box = setup('a big idea', 2, 5);
    fireEvent.change(screen.getByLabelText('Text colour'), { target: { value: 'ocean' } });
    expect(value()).toBe('a <span data-color="ocean">big</span> idea');
    const inner = value().indexOf('big');
    box.setSelectionRange(inner, inner + 3);
    fireEvent.select(box);
    expect(screen.getByLabelText('Text colour').value).toBe('ocean');
    fireEvent.change(screen.getByLabelText('Text colour'), { target: { value: '' } });
    expect(value()).toBe('a big idea');
  });

  it('text style dropdown switches paragraph and headings', () => {
    setup('Title', 0, 0);
    fireEvent.change(screen.getByLabelText('Text style'), { target: { value: 'heading2' } });
    expect(value()).toBe('## Title');
    expect(screen.getByLabelText('Text style').value).toBe('heading2');
  });

  it('indent is only available inside a list', () => {
    setup('plain', 0, 0);
    expect(screen.getByRole('button', { name: /^Indent/ }).disabled).toBe(true);
  });

  it('unlink is enabled inside a link and removes it', () => {
    const box = setup('see [docs](https://a.example)', 0, 0);
    expect(screen.getByRole('button', { name: /^Unlink/ }).disabled).toBe(true);
    box.setSelectionRange(6, 6);
    fireEvent.select(box);
    fireEvent.click(screen.getByRole('button', { name: /^Unlink/ }));
    expect(value()).toBe('see docs');
  });

  it('code block dropdown inserts a block in the chosen language', () => {
    setup('x = 1', 0, 5);
    fireEvent.change(screen.getByLabelText(/insert a code block/i), { target: { value: 'python' } });
    expect(value()).toBe('```python\nx = 1\n```');
  });

  it('image form inserts an image only with a valid address', () => {
    setup('text', 4, 4);
    fireEvent.click(screen.getByRole('button', { name: /^Image/ }));
    const insert = screen.getByRole('button', { name: 'Insert image' });
    expect(insert.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Image address (URL)'), { target: { value: 'https://example.com/a.png' } });
    fireEvent.change(screen.getByLabelText('Description for screen readers'), { target: { value: 'Chart' } });
    fireEvent.click(screen.getByRole('button', { name: 'Insert image' }));
    expect(value()).toBe('text\n\n![Chart](https://example.com/a.png)');
  });

  it('keyboard shortcut Mod+U underlines', () => {
    const box = setup('one word', 4, 8);
    fireEvent.keyDown(box, { key: 'u', ctrlKey: true, metaKey: true });
    expect(value()).toBe('one <u>word</u>');
  });
});
