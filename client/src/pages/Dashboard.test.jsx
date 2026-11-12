import { describe, it, expect } from 'vitest';
import { screen, fireEvent, within, waitFor } from '@testing-library/react';
import Dashboard from './Dashboard.jsx';
import { renderWithAuth } from '../test/renderWithAuth.jsx';
import { installFakeServer, reply, networkError, deferred } from '../test/fakeServer.js';

const ADA = { _id: 'u1', name: 'Ada Lovelace', avatarUrl: '' };
const WRITES = { _id: 'pubA', name: 'Ada Writes', slug: 'ada-writes' };
const NOTES = { _id: 'pubB', name: 'Ada Notes', slug: 'ada-notes' };

const post = (id, title, publication, status, extra = {}) => ({
  _id: id,
  title,
  slug: title.toLowerCase().replace(/\s+/g, '-'),
  status,
  publication,
  tags: [],
  createdAt: '2026-01-10T12:00:00Z',
  updatedAt: '2026-02-01T12:00:00Z',
  publishedAt: status === 'published' ? '2026-02-01T12:00:00Z' : null,
  ...extra,
});

const MIXED = [
  post('p1', 'Express errors', WRITES, 'published', { updatedAt: '2026-03-01T12:00:00Z', publishedAt: '2026-03-01T12:00:00Z' }),
  post('p2', 'Mongo draft', NOTES, 'draft', { updatedAt: '2026-03-03T12:00:00Z' }),
  post('p3', 'React hooks', NOTES, 'published', { updatedAt: '2026-02-15T12:00:00Z', publishedAt: '2026-02-14T12:00:00Z' }),
];

const setup = (posts, publications = [WRITES, NOTES], routes = {}) => {
  const server = installFakeServer({
    'GET /posts/mine': () => reply(200, { posts }),
    'GET /publications/mine': () => reply(200, { publications }),
    ...routes,
  });
  renderWithAuth(<Dashboard />, { auth: { status: 'authenticated', user: ADA }, route: '/dashboard' });
  return server;
};

const items = () => within(screen.getByRole('list', { name: 'Your articles' })).getAllByRole('listitem');
const titles = () => items().map((li) => within(li).getByRole('heading').textContent.replace(' (opens in a new tab)', ''));
const item = (title) => items().find((li) => li.textContent.includes(title));

describe('Dashboard: all my articles across publications', () => {
  it('shows a loading state first, then every article from every publication, most recently changed first', async () => {
    setup(MIXED);
    expect(screen.getByText('Loading your articles…')).toBeTruthy();
    await screen.findByRole('list', { name: 'Your articles' });
    expect(titles()).toEqual(['Mongo draft', 'Express errors', 'React hooks']);
    expect(within(item('Express errors')).getByText('Ada Writes')).toBeTruthy();
    expect(within(item('Mongo draft')).getByText('Ada Notes')).toBeTruthy();
    expect(screen.getByRole('tab', { name: /All/ }).textContent).toContain('3');
    expect(screen.getByRole('tab', { name: /Published/ }).textContent).toContain('2');
    expect(screen.getByRole('tab', { name: /Drafts/ }).textContent).toContain('1');
  });

  it('shows status, and the publication date for published articles', async () => {
    setup(MIXED);
    await screen.findByRole('list', { name: 'Your articles' });
    const published = item('React hooks');
    expect(within(published).getByText('Published', { selector: '.status-badge' })).toBeTruthy();
    expect(published.textContent).toContain('Published Feb 14, 2026');
    const draft = item('Mongo draft');
    expect(within(draft).getByText('Draft', { selector: '.status-badge' })).toBeTruthy();
    expect(draft.textContent).toContain('Updated Mar 3, 2026');
  });

  it('asks the server for MY articles without sending any user id (the server uses the token)', async () => {
    const server = setup(MIXED);
    await screen.findByRole('list', { name: 'Your articles' });
    expect(server.requests.map((r) => r.url)).toEqual(['/posts/mine', '/publications/mine']);
  });

  it('a user with only drafts: the Published tab explains there is nothing published yet', async () => {
    setup([post('d1', 'First draft', WRITES, 'draft'), post('d2', 'Second draft', NOTES, 'draft')]);
    await screen.findByRole('list', { name: 'Your articles' });
    expect(titles()).toHaveLength(2);
    expect(screen.queryByRole('link', { name: /^View/ })).toBeNull();
    fireEvent.click(screen.getByRole('tab', { name: /Published/ }));
    expect(screen.getByText('Nothing published yet')).toBeTruthy();
  });

  it('a user with only published articles: each has View and Unpublish; the Drafts tab is empty', async () => {
    setup([post('a1', 'One', WRITES, 'published'), post('a2', 'Two', NOTES, 'published')]);
    await screen.findByRole('list', { name: 'Your articles' });
    expect(screen.getAllByRole('button', { name: 'Unpublish' })).toHaveLength(2);
    expect(screen.getByRole('link', { name: 'View One (opens in a new tab)' }).getAttribute('href')).toBe('/p/ada-writes/one');
    fireEvent.click(screen.getByRole('tab', { name: /Drafts/ }));
    expect(screen.getByText('No drafts')).toBeTruthy();
  });

  it('a user with publications but no articles gets a prompt to write in one', async () => {
    setup([], [WRITES]);
    expect(await screen.findByText('No articles yet')).toBeTruthy();
    expect(screen.getByRole('link', { name: /Write in Ada Writes/ }).getAttribute('href')).toBe('/publications/ada-writes/write');
  });

  it('a user with no publications is told to create one first', async () => {
    setup([], []);
    expect(await screen.findByText('You have no publications yet')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Create your publication' }).getAttribute('href')).toBe('/publications/new');
  });

  it('shows an error with Try again when the articles cannot be loaded', async () => {
    installFakeServer({ 'GET /posts/mine': () => networkError(), 'GET /publications/mine': () => reply(200, { publications: [] }) });
    renderWithAuth(<Dashboard />, { auth: { status: 'authenticated', user: ADA }, route: '/dashboard' });
    expect(await screen.findByRole('button', { name: 'Try again' })).toBeTruthy();
  });

  it('Edit opens the editor of that article inside its own publication, in a new tab', async () => {
    setup(MIXED);
    await screen.findByRole('list', { name: 'Your articles' });
    const edit = screen.getByRole('link', { name: 'Edit Mongo draft (opens in a new tab)' });
    expect(edit.getAttribute('href')).toBe('/publications/ada-notes/editor/p2');
    expect(edit.getAttribute('target')).toBe('_blank');
    expect(within(item('Express errors')).getByRole('link', { name: 'Edit Express errors (opens in a new tab)' }).getAttribute('href')).toBe('/publications/ada-writes/editor/p1');
    expect(within(item('Express errors')).getByRole('link', { name: 'Open the Ada Writes workspace (opens in a new tab)' }).getAttribute('href')).toBe('/publications/ada-writes/dashboard');
  });

  it('Delete asks for confirmation; Cancel keeps the article, confirming deletes it', async () => {
    const server = setup(MIXED, [WRITES, NOTES], { 'DELETE /posts/p3': () => reply(200, { message: 'Post deleted', id: 'p3' }) });
    await screen.findByRole('list', { name: 'Your articles' });
    fireEvent.click(screen.getByRole('button', { name: 'Delete React hooks' }));
    const dialog = screen.getByRole('alertdialog', { name: 'Delete this article?' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(titles()).toContain('React hooks');
    expect(server.requests.some((r) => r.method === 'DELETE')).toBe(false);

    fireEvent.click(screen.getByRole('button', { name: 'Delete React hooks' }));
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Delete article' }));
    await waitFor(() => expect(titles()).not.toContain('React hooks'));
    expect(screen.getByRole('status').textContent).toContain('"React hooks" was deleted.');
    expect(server.requests.filter((r) => r.method === 'DELETE').map((r) => r.url)).toEqual(['/posts/p3']);
  });

  it('Publish sends status published and shows the new publication date', async () => {
    let body;
    setup(MIXED, [WRITES, NOTES], {
      'PUT /posts/p2': (config) => {
        body = JSON.parse(config.data);
        return reply(200, { post: { _id: 'p2', status: 'published', publishedAt: '2026-04-02T12:00:00Z', updatedAt: '2026-04-02T12:00:00Z' } });
      },
    });
    await screen.findByRole('list', { name: 'Your articles' });
    fireEvent.click(within(item('Mongo draft')).getByRole('button', { name: 'Publish' }));
    await waitFor(() => expect(item('Mongo draft').textContent).toContain('Published Apr 2, 2026'));
    expect(body).toEqual({ status: 'published' });
    expect(within(item('Mongo draft')).getByRole('button', { name: 'Unpublish' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: /Published/ }).textContent).toContain('3');
  });

  it('Unpublish sends status draft and moves the article to Drafts', async () => {
    let body;
    setup(MIXED, [WRITES, NOTES], {
      'PUT /posts/p1': (config) => {
        body = JSON.parse(config.data);
        return reply(200, { post: { _id: 'p1', status: 'draft', publishedAt: null, updatedAt: '2026-04-03T12:00:00Z' } });
      },
    });
    await screen.findByRole('list', { name: 'Your articles' });
    fireEvent.click(within(item('Express errors')).getByRole('button', { name: 'Unpublish' }));
    await waitFor(() => expect(within(item('Express errors')).getByText('Draft', { selector: '.status-badge' })).toBeTruthy());
    expect(body).toEqual({ status: 'draft' });
    expect(screen.getByRole('status').textContent).toContain('moved back to drafts');
    expect(screen.getByRole('tab', { name: /Drafts/ }).textContent).toContain('2');
  });

  describe('reloading when the tab becomes visible again', () => {
    const returnToTab = () => {
      Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    };
    const AFTER_PUBLISH = MIXED.map((p) => (p._id === 'p2' ? { ...p, status: 'published', publishedAt: '2026-04-02T12:00:00Z', updatedAt: '2026-04-02T12:00:00Z' } : p));

    it('a reload that started before Publish cannot overwrite it; the newest server state is shown', async () => {
      const slowReload = deferred();
      let gets = 0;
      installFakeServer({
        'GET /posts/mine': () => {
          gets += 1;
          if (gets === 1) return reply(200, { posts: MIXED }); // first load
          if (gets === 2) return slowReload.promise; // the reload from returning to the tab: slow, OLD data
          return reply(200, { posts: AFTER_PUBLISH }); // anything later sees the publish
        },
        'GET /publications/mine': () => reply(200, { publications: [WRITES, NOTES] }),
        'PUT /posts/p2': () => reply(200, { post: { _id: 'p2', status: 'published', publishedAt: '2026-04-02T12:00:00Z', updatedAt: '2026-04-02T12:00:00Z' } }),
      });
      renderWithAuth(<Dashboard />, { auth: { status: 'authenticated', user: ADA }, route: '/dashboard' });
      await screen.findByRole('list', { name: 'Your articles' });

      returnToTab(); // reload starts and hangs
      await waitFor(() => expect(gets).toBe(2));
      fireEvent.click(within(item('Mongo draft')).getByRole('button', { name: 'Publish' }));
      await waitFor(() => expect(item('Mongo draft').textContent).toContain('Published Apr 2, 2026'));

      // The old reload finally answers with the article still a draft.
      slowReload.resolve(reply(200, { posts: MIXED }));
      await new Promise((r) => setTimeout(r, 50)); // let any (wrong) late state update land
      expect(within(item('Mongo draft')).getByText('Published', { selector: '.status-badge' })).toBeTruthy();
      await waitFor(() => expect(gets).toBe(3)); // its answer was discarded and the list fetched again
      expect(item('Mongo draft').textContent).toContain('Published Apr 2, 2026');
      expect(screen.getByRole('tab', { name: /Published/ }).textContent).toContain('3');
      expect(screen.getByRole('tab', { name: /Drafts/ }).textContent).toContain('0');
    });

    it('a reload that started before Delete cannot bring the deleted article back', async () => {
      const slowReload = deferred();
      let gets = 0;
      installFakeServer({
        'GET /posts/mine': () => {
          gets += 1;
          if (gets === 1) return reply(200, { posts: MIXED });
          if (gets === 2) return slowReload.promise;
          return reply(200, { posts: MIXED.filter((p) => p._id !== 'p3') });
        },
        'GET /publications/mine': () => reply(200, { publications: [WRITES, NOTES] }),
        'DELETE /posts/p3': () => reply(200, { message: 'Post deleted', id: 'p3' }),
      });
      renderWithAuth(<Dashboard />, { auth: { status: 'authenticated', user: ADA }, route: '/dashboard' });
      await screen.findByRole('list', { name: 'Your articles' });

      returnToTab();
      await waitFor(() => expect(gets).toBe(2));
      fireEvent.click(screen.getByRole('button', { name: 'Delete React hooks' }));
      fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Delete article' }));
      await waitFor(() => expect(titles()).not.toContain('React hooks'));

      slowReload.resolve(reply(200, { posts: MIXED })); // still lists the deleted article
      await new Promise((r) => setTimeout(r, 50));
      expect(titles()).toEqual(['Mongo draft', 'Express errors']);
      await waitFor(() => expect(gets).toBe(3));
      await waitFor(() => expect(titles()).toEqual(['Mongo draft', 'Express errors']));
      expect(screen.getByRole('tab', { name: /All/ }).textContent).toContain('2');
    });

    it('with no change in between, a reload shows what changed elsewhere, with one request per list', async () => {
      let gets = 0;
      installFakeServer({
        'GET /posts/mine': () => {
          gets += 1;
          return reply(200, { posts: gets === 1 ? MIXED : AFTER_PUBLISH });
        },
        'GET /publications/mine': () => reply(200, { publications: [WRITES, NOTES] }),
      });
      renderWithAuth(<Dashboard />, { auth: { status: 'authenticated', user: ADA }, route: '/dashboard' });
      await screen.findByRole('list', { name: 'Your articles' });
      returnToTab();
      await waitFor(() => expect(item('Mongo draft').textContent).toContain('Published Apr 2, 2026'));
      expect(gets).toBe(2);
    });
  });

  it('a failed status change shows the server message and leaves the article as it was', async () => {
    setup(MIXED, [WRITES, NOTES], { 'PUT /posts/p1': () => reply(403, { message: 'Not authorized: you can only modify your own posts' }) });
    await screen.findByRole('list', { name: 'Your articles' });
    fireEvent.click(within(item('Express errors')).getByRole('button', { name: 'Unpublish' }));
    expect((await screen.findByRole('alert')).textContent).toContain('you can only modify your own posts');
    expect(within(item('Express errors')).getByText('Published', { selector: '.status-badge' })).toBeTruthy();
  });
});
