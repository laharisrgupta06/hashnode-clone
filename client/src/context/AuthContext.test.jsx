import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { AuthProvider } from './AuthContext.jsx';
import useAuth from '../hooks/useAuth.js';
import api, { TOKEN_KEY, getToken } from '../api/axios.js';
import { installFakeServer, reply, networkError, deferred } from '../test/fakeServer.js';

const ADA = { _id: 'u1', name: 'Ada', email: 'ada@example.com', bio: '', avatarUrl: '' };

// Renders the real AuthProvider and exposes its value to the test.
function renderAuth() {
  const ref = { current: null };
  function Probe() {
    const auth = useAuth();
    ref.current = auth;
    return (
      <p>
        status={auth.status} user={auth.user?.name ?? 'none'} expired={String(auth.sessionExpired)}
      </p>
    );
  }
  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>
  );
  return ref;
}

const statusText = (status) => screen.getByText(new RegExp(`status=${status}\\b`));
const removals = () => vi.spyOn(Storage.prototype, 'removeItem');

describe('startup', () => {
  it('without a stored token: guest immediately, and the server is not asked', () => {
    const server = installFakeServer({});
    renderAuth();
    expect(statusText('guest')).toBeTruthy();
    expect(server.requests).toHaveLength(0);
  });

  it('with a valid stored token: loading, then authenticated with the server user', async () => {
    localStorage.setItem(TOKEN_KEY, 'good');
    const me = deferred();
    const server = installFakeServer({ 'GET /auth/me': () => me.promise });
    renderAuth();
    expect(statusText('loading')).toBeTruthy(); // nothing protected can render yet
    await act(async () => me.resolve(reply(200, { user: ADA })));
    expect(screen.getByText(/status=authenticated user=Ada/)).toBeTruthy();
    expect(server.requests[0].authorization).toBe('Bearer good');
  });

  it('a 401 on startup ends the session as expired and clears the token', async () => {
    localStorage.setItem(TOKEN_KEY, 'expired');
    installFakeServer({ 'GET /auth/me': () => reply(401, { message: 'Not authorized' }) });
    renderAuth();
    await waitFor(() => expect(screen.getByText(/status=guest .* expired=true/)).toBeTruthy());
    expect(getToken()).toBeNull();
  });

  it.each([
    ['a 500', () => reply(500)],
    ['a 503', () => reply(503)],
    ['a network error', () => networkError()],
  ])('%s on startup means "unavailable" and the token is KEPT', async (_label, route) => {
    localStorage.setItem(TOKEN_KEY, 'keep-me');
    installFakeServer({ 'GET /auth/me': route });
    renderAuth();
    await waitFor(() => expect(statusText('unavailable')).toBeTruthy());
    expect(getToken()).toBe('keep-me');
  });

  it('Retry after "unavailable" verifies again and recovers the session', async () => {
    localStorage.setItem(TOKEN_KEY, 'keep-me');
    let up = false;
    installFakeServer({ 'GET /auth/me': () => (up ? reply(200, { user: ADA }) : reply(503)) });
    const auth = renderAuth();
    await waitFor(() => expect(statusText('unavailable')).toBeTruthy());
    up = true;
    await act(async () => auth.current.retry());
    expect(screen.getByText(/status=authenticated user=Ada/)).toBeTruthy();
  });
});

describe('login, register, logout', () => {
  it('login stores the token and authenticates', async () => {
    installFakeServer({ 'POST /auth/login': () => reply(200, { token: 'new', user: ADA }) });
    const auth = renderAuth();
    await act(async () => auth.current.login('ada@example.com', 'secret1'));
    expect(screen.getByText(/status=authenticated user=Ada expired=false/)).toBeTruthy();
    expect(getToken()).toBe('new');
  });

  it('register logs the new user in immediately', async () => {
    installFakeServer({ 'POST /auth/register': () => reply(201, { token: 'reg', user: ADA }) });
    const auth = renderAuth();
    await act(async () => auth.current.register('Ada', 'ada@example.com', 'secret1'));
    expect(statusText('authenticated')).toBeTruthy();
    expect(getToken()).toBe('reg');
  });

  it('a wrong password throws for the form, and is NOT treated as an expired session', async () => {
    installFakeServer({ 'POST /auth/login': () => reply(401, { message: 'Invalid email or password' }) });
    const auth = renderAuth();
    const spy = removals();
    await act(async () => {
      await expect(auth.current.login('ada@example.com', 'wrong')).rejects.toMatchObject({ response: { status: 401 } });
    });
    expect(screen.getByText(/status=guest .* expired=false/)).toBeTruthy();
    expect(spy).not.toHaveBeenCalled();
  });

  it('a wrong password while the stored token is unverifiable does not log out', async () => {
    localStorage.setItem(TOKEN_KEY, 'unverified');
    installFakeServer({ 'GET /auth/me': () => reply(503), 'POST /auth/login': () => reply(401) });
    const auth = renderAuth();
    await waitFor(() => expect(statusText('unavailable')).toBeTruthy());
    const spy = removals();
    await act(async () => {
      await expect(auth.current.login('ada@example.com', 'wrong')).rejects.toBeDefined();
    });
    expect(spy).not.toHaveBeenCalled();
    expect(getToken()).toBe('unverified');
  });

  it('logout clears the token and is not marked as expired', async () => {
    installFakeServer({ 'POST /auth/login': () => reply(200, { token: 'tok', user: ADA }) });
    const auth = renderAuth();
    await act(async () => auth.current.login('ada@example.com', 'secret1'));
    act(() => auth.current.logout());
    expect(screen.getByText(/status=guest user=none expired=false/)).toBeTruthy();
    expect(getToken()).toBeNull();
  });
});

describe('401 during a session', () => {
  async function loggedIn(routes) {
    installFakeServer({ 'POST /auth/login': () => reply(200, { token: 'tok-A', user: ADA }), ...routes });
    const auth = renderAuth();
    await act(async () => auth.current.login('ada@example.com', 'secret1'));
    return auth;
  }

  it('a 401 on a protected request logs out as expired', async () => {
    await loggedIn({ 'GET /posts/mine': () => reply(401) });
    await act(async () => {
      await api.get('/posts/mine').catch(() => {});
    });
    expect(screen.getByText(/status=guest .* expired=true/)).toBeTruthy();
    expect(getToken()).toBeNull();
  });

  it('five simultaneous 401s cause exactly one logout', async () => {
    await loggedIn({ 'GET /posts/mine': () => reply(401) });
    const spy = removals();
    await act(async () => {
      await Promise.all(Array.from({ length: 5 }, () => api.get('/posts/mine').catch(() => {})));
    });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(statusText('guest')).toBeTruthy();
  });

  it('a late 401 for an OLD token is ignored after logging in again', async () => {
    const late = deferred();
    const auth = await loggedIn({ 'GET /posts/mine': () => late.promise });
    const oldRequest = api.get('/posts/mine').catch(() => {}); // sent with tok-A

    act(() => auth.current.logout());
    installFakeServer({ 'POST /auth/login': () => reply(200, { token: 'tok-B', user: ADA }), 'GET /posts/mine': () => late.promise });
    await act(async () => auth.current.login('ada@example.com', 'secret1'));

    const spy = removals();
    await act(async () => {
      late.resolve(reply(401)); // the old request finally fails
      await oldRequest;
    });
    expect(spy).not.toHaveBeenCalled();
    expect(statusText('authenticated')).toBeTruthy();
    expect(getToken()).toBe('tok-B');
  });

  it('a 401 on a request sent while still verifying logs out once, and the later startup result is ignored', async () => {
    localStorage.setItem(TOKEN_KEY, 'bad');
    const me = deferred();
    installFakeServer({ 'GET /auth/me': () => me.promise, 'GET /posts/mine': () => reply(401) });
    renderAuth();
    const spy = removals();
    await act(async () => {
      await api.get('/posts/mine').catch(() => {});
    });
    expect(spy).toHaveBeenCalledTimes(1);
    await act(async () => me.resolve(reply(401)));
    expect(spy).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/status=guest .* expired=true/)).toBeTruthy();
  });
});

describe('useAuth', () => {
  it('throws a clear error outside <AuthProvider>', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {}); // React logs the thrown error
    function Orphan() {
      useAuth();
      return null;
    }
    expect(() => render(<Orphan />)).toThrow('useAuth must be used inside <AuthProvider>');
  });
});
