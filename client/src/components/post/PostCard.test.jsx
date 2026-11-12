import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PostCard from './PostCard.jsx';

const base = {
  _id: 'p1',
  title: 'Express error handling',
  slug: 'express-error-handling',
  excerpt: 'How to return JSON errors.',
  coverImage: '',
  author: { _id: 'u1', name: 'Ada Lovelace', avatarUrl: '' },
  publication: { name: 'Ada Writes', slug: 'ada-writes' },
  tags: [{ _id: 't1', name: 'express', slug: 'express' }],
  createdAt: '2026-01-10T12:00:00Z',
  updatedAt: '2026-03-20T12:00:00Z',
};

const renderCard = (post) =>
  render(
    <MemoryRouter>
      <PostCard post={post} />
    </MemoryRouter>
  );

describe('PostCard date', () => {
  it('shows the publication date, not the creation date, for a draft published later', () => {
    renderCard({ ...base, publishedAt: '2026-03-20T12:00:00Z' });
    const time = screen.getByText('Mar 20, 2026');
    expect(time.tagName).toBe('TIME');
    expect(time.getAttribute('datetime')).toBe('2026-03-20T12:00:00Z');
    expect(screen.queryByText('Jan 10, 2026')).toBeNull();
  });

  it('shows the creation date for a legacy published article without publishedAt', () => {
    renderCard({ ...base, publishedAt: null });
    expect(screen.getByText('Jan 10, 2026').getAttribute('datetime')).toBe('2026-01-10T12:00:00Z');
  });

  it('still shows title, excerpt, author, publication and tags', () => {
    renderCard({ ...base, publishedAt: '2026-03-20T12:00:00Z' });
    expect(screen.getByRole('link', { name: 'Express error handling' }).getAttribute('href')).toBe('/p/ada-writes/express-error-handling');
    expect(screen.getByText('How to return JSON errors.')).toBeTruthy();
    expect(screen.getByText('Ada Lovelace')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Ada Writes' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'express' }).getAttribute('href')).toBe('/tag/express');
  });
});
