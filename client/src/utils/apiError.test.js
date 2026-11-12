import { describe, it, expect } from 'vitest';
import { describeError } from './apiError.js';

const httpError = (status, data) => ({ response: { status, data } });

describe('describeError', () => {
  it('401 is a credentials error and shows the server message', () => {
    expect(describeError(httpError(401, { message: 'Invalid email or password' }))).toEqual({ kind: 'credentials', message: 'Invalid email or password' });
  });

  it('other 4xx is a client error and shows the server message', () => {
    expect(describeError(httpError(409, { message: 'An account with this email already exists' }))).toEqual({
      kind: 'client',
      message: 'An account with this email already exists',
    });
  });

  it('4xx without a usable message gets a generic one', () => {
    expect(describeError(httpError(400, {})).message).toBe('The request could not be completed.');
    expect(describeError(httpError(400, { message: '' })).message).toBe('The request could not be completed.');
    expect(describeError(httpError(400, { message: { $gt: '' } })).message).toBe('The request could not be completed.');
    expect(describeError(httpError(400, null)).message).toBe('The request could not be completed.');
  });

  it.each([500, 502, 503])('%i never shows the raw server text', (status) => {
    const result = describeError(httpError(status, { message: 'boom: internal details' }));
    expect(result.kind).toBe('server');
    expect(result.message).not.toContain('boom');
  });

  it.each(['ECONNABORTED', 'ETIMEDOUT'])('a timeout (%s) is a network error with a timeout message', (code) => {
    expect(describeError({ code })).toEqual({ kind: 'network', message: 'The server took too long to respond. Please try again.' });
  });

  it('no response at all is a network error', () => {
    expect(describeError({ code: 'ERR_NETWORK' })).toEqual({ kind: 'network', message: 'Could not reach the server. Check your connection and try again.' });
  });
});
