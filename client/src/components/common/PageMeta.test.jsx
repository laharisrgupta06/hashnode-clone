import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import PageMeta, { formatTitle } from './PageMeta.jsx';
import { SITE } from '../../config/site.js';

const descriptionTags = () => document.head.querySelectorAll('meta[name="description"]');

describe('PageMeta', () => {
  it('formats titles as "Page | Site", or just the site name', () => {
    expect(formatTitle('Log in')).toBe(`Log in | ${SITE.name}`);
    expect(formatTitle()).toBe(SITE.name);
  });

  it('sets the tab title and the description', () => {
    render(<PageMeta title="Log in" description="Log in to write." />);
    expect(document.title).toBe(`Log in | ${SITE.name}`);
    expect(descriptionTags()[0].getAttribute('content')).toBe('Log in to write.');
  });

  it('falls back to the site description, and never creates a second description tag', () => {
    const { rerender } = render(<PageMeta title="A" description="First" />);
    rerender(<PageMeta title="B" />);
    expect(descriptionTags()).toHaveLength(1);
    expect(descriptionTags()[0].getAttribute('content')).toBe(SITE.description);
    expect(document.title).toBe(`B | ${SITE.name}`);
  });
});
