import { describe, it, expect } from 'vitest';
import { FORMATS } from './markdownFormat.js';

// Applies an edit the way the editor does and returns the new text and selected part.
const run = (format, text, start, end = start) => {
  const edit = FORMATS[format](text, start, end);
  const next = text.slice(0, edit.from) + edit.insert + text.slice(edit.to);
  return { text: next, selected: next.slice(edit.selectStart, edit.selectEnd) };
};

describe('toolbar formatting', () => {
  it('bold / italic / inline code wrap the selection and keep it selected', () => {
    expect(run('bold', 'make this bold', 10, 14)).toEqual({ text: 'make this **bold**', selected: 'bold' });
    expect(run('italic', 'an idea', 3, 7)).toEqual({ text: 'an _idea_', selected: 'idea' });
    expect(run('code', 'call fn now', 5, 7)).toEqual({ text: 'call `fn` now', selected: 'fn' });
  });

  it('with nothing selected, inserts a placeholder and selects it for typing over', () => {
    expect(run('bold', 'x ', 2)).toEqual({ text: 'x **bold text**', selected: 'bold text' });
  });

  it('link keeps the selected words as the label and selects the URL to paste over', () => {
    expect(run('link', 'see docs', 4, 8)).toEqual({ text: 'see [docs](https://)', selected: 'https://' });
  });

  it('heading, quote and lists prefix every selected line', () => {
    expect(run('heading', 'Title', 2).text).toBe('## Title');
    expect(run('quote', 'a\nb', 0, 3).text).toBe('> a\n> b');
    expect(run('bulletList', 'one\ntwo', 0, 7).text).toBe('- one\n- two');
    expect(run('numberedList', 'one\ntwo\nthree', 0, 13).text).toBe('1. one\n2. two\n3. three');
  });

  it('only touches the lines in the selection', () => {
    expect(run('bulletList', 'keep\npick\nkeep', 6).text).toBe('keep\n- pick\nkeep');
  });

  it('applying a line format again removes it (toggle)', () => {
    expect(run('bulletList', '- one\n- two', 0, 11).text).toBe('one\ntwo');
    expect(run('heading', '## Title', 4).text).toBe('Title');
  });

  it('switching list types replaces the marker instead of stacking', () => {
    expect(run('numberedList', '- one', 0, 5).text).toBe('1. one');
  });

  it('code block puts fences on their own lines and selects the language', () => {
    const result = run('codeBlock', 'text', 4);
    expect(result.text).toBe('text\n```javascript\ncode\n```');
    expect(result.selected).toBe('javascript');
    expect(run('codeBlock', 'let x = 1;', 0, 10).text).toBe('```javascript\nlet x = 1;\n```');
  });
});
