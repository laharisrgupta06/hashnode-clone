import { describe, it, expect } from 'vitest';
import { publishedDate, wasEdited } from './format.js';

describe('publishedDate', () => {
  it('is the publication date when the server recorded one', () => {
    expect(publishedDate({ createdAt: '2026-01-01T10:00:00Z', publishedAt: '2026-03-05T09:00:00Z' })).toBe('2026-03-05T09:00:00Z');
  });

  it('falls back to the creation date for articles published before publishedAt existed', () => {
    expect(publishedDate({ createdAt: '2026-01-01T10:00:00Z', publishedAt: null })).toBe('2026-01-01T10:00:00Z');
    expect(publishedDate({ createdAt: '2026-01-01T10:00:00Z' })).toBe('2026-01-01T10:00:00Z');
  });

  it('an article saved and published in the same moment does not count as edited', () => {
    const post = { createdAt: '2026-01-01T10:00:00Z', publishedAt: '2026-03-05T09:00:00Z', updatedAt: '2026-03-05T09:00:00.200Z' };
    expect(wasEdited(publishedDate(post), post.updatedAt)).toBe(false);
    expect(wasEdited(publishedDate(post), '2026-03-06T09:00:00Z')).toBe(true);
  });
});
