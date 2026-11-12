import { describe, it, expect, vi } from 'vitest';
import api, { TOKEN_KEY, DEFAULT_TIMEOUT_MS, getToken, setToken, clearToken, setUnauthorizedHandler } from './axios.js';
import { installFakeServer, reply, networkError } from '../test/fakeServer.js';

describe('token storage', () => {
  it('saves, reads and clears the token in localStorage', () => {
    expect(getToken()).toBeNull();
    setToken('abc');
    expect(localStorage.getItem(TOKEN_KEY)).toBe('abc');
    expect(getToken()).toBe('abc');
    clearToken();
    expect(getToken()).toBeNull();
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
  });

  it('falls back to memory when localStorage refuses to save, and logout clears that too', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    setToken('in-memory');
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull(); // nothing persisted
    expect(getToken()).toBe('in-memory');
    clearToken();
    expect(getToken()).toBeNull();
  });

  it('returns null instead of crashing when localStorage cannot be read', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    expect(getToken()).toBeNull();
  });
});

describe('the Axios instance', () => {
  it('uses the configured base URL and a 20 second default timeout', () => {
    expect(api.defaults.baseURL).toBe('http://api.test/api');
    expect(DEFAULT_TIMEOUT_MS).toBe(20000);
    expect(api.defaults.timeout).toBe(DEFAULT_TIMEOUT_MS);
  });

  it('sends "Authorization: Bearer <token>" only when a token exists', async () => {
    const server = installFakeServer({ 'GET /posts': () => reply(200, { posts: [] }) });
    await api.get('/posts');
    setToken('tok-1');
    await api.get('/posts');
    expect(server.requests.map((r) => r.authorization)).toEqual([undefined, 'Bearer tok-1']);
  });

  it('sends the in-memory token when storage is blocked (one source of truth)', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    setToken('memory-tok');
    const server = installFakeServer({ 'GET /posts/mine': () => reply(200, { posts: [] }) });
    await api.get('/posts/mine');
    expect(server.requests[0].authorization).toBe('Bearer memory-tok');
  });
});

describe('the 401 rule: only a rejected session token reports "unauthorized"', () => {
  const setup = (route) => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    installFakeServer({ 'GET /posts/mine': route });
    return handler;
  };

  it('a 401 on a request that carried a token reports exactly that token', async () => {
    setToken('tok-A');
    const handler = setup(() => reply(401, { message: 'Not authorized' }));
    await expect(api.get('/posts/mine')).rejects.toMatchObject({ response: { status: 401 } });
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith('tok-A');
  });

  it('a 401 on a request without a token reports nothing', async () => {
    const handler = setup(() => reply(401));
    await expect(api.get('/posts/mine')).rejects.toBeDefined();
    expect(handler).not.toHaveBeenCalled();
  });

  it('a 401 on a request marked skipAuthHandler (login, register, startup check) reports nothing', async () => {
    setToken('tok-A');
    const handler = setup(() => reply(401));
    await expect(api.get('/posts/mine', { skipAuthHandler: true })).rejects.toBeDefined();
    expect(handler).not.toHaveBeenCalled();
  });

  it.each([403, 404, 500, 503])('a %i never reports unauthorized', async (status) => {
    setToken('tok-A');
    const handler = setup(() => reply(status));
    await expect(api.get('/posts/mine')).rejects.toBeDefined();
    expect(handler).not.toHaveBeenCalled();
  });

  it('a network error never reports unauthorized', async () => {
    setToken('tok-A');
    const handler = setup(() => networkError());
    await expect(api.get('/posts/mine')).rejects.toMatchObject({ code: 'ERR_NETWORK' });
    expect(handler).not.toHaveBeenCalled();
  });

  it('still rejects the request so the page can show its own error', async () => {
    setToken('tok-A');
    setup(() => reply(401));
    await expect(api.get('/posts/mine')).rejects.toBeInstanceOf(Error);
  });
});
