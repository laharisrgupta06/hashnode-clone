import { describe, it, expect } from 'vitest';
import { validateLogin, validateRegister, validateProfile, validatePost, MAX_NAME_LENGTH, MIN_PASSWORD_LENGTH } from './validation.js';

const okRegister = { name: 'Ada Lovelace', email: 'ada@example.com', password: 'secret1' };

describe('validateLogin', () => {
  it('accepts a valid email and any non-empty password', () => {
    expect(validateLogin({ email: 'ada@example.com', password: 'x' })).toEqual({});
  });

  it('requires both fields', () => {
    expect(validateLogin({ email: '', password: '' })).toEqual({ email: 'Email is required', password: 'Password is required' });
  });

  it('treats a whitespace-only email as missing', () => {
    expect(validateLogin({ email: '   ', password: 'x' }).email).toBe('Email is required');
  });

  it.each(['abc', 'a@b', '@b.c', 'a b@c.d', 'a@b.', 'a@@b.c'])('rejects the email shape %j', (email) => {
    expect(validateLogin({ email, password: 'x' }).email).toBe('Enter a valid email address');
  });

  it('accepts surrounding spaces around a valid email', () => {
    expect(validateLogin({ email: '  ada@example.com ', password: 'x' })).toEqual({});
  });

  it('does not apply the minimum length to login (older accounts may have shorter passwords)', () => {
    expect(validateLogin({ email: 'ada@example.com', password: '1' })).toEqual({});
  });
});

describe('validateRegister', () => {
  it('accepts valid input', () => {
    expect(validateRegister(okRegister)).toEqual({});
  });

  it('requires a name (spaces only do not count)', () => {
    expect(validateRegister({ ...okRegister, name: '   ' }).name).toBe('Name is required');
  });

  it(`accepts a name of exactly ${MAX_NAME_LENGTH} characters and rejects ${MAX_NAME_LENGTH + 1}`, () => {
    expect(validateRegister({ ...okRegister, name: 'x'.repeat(MAX_NAME_LENGTH) })).toEqual({});
    expect(validateRegister({ ...okRegister, name: 'x'.repeat(MAX_NAME_LENGTH + 1) }).name).toBe(`Name must be at most ${MAX_NAME_LENGTH} characters`);
  });

  it('counts an emoji as one character, like the server', () => {
    expect(validateRegister({ ...okRegister, name: '😀'.repeat(MAX_NAME_LENGTH) })).toEqual({});
    expect(validateRegister({ ...okRegister, name: '😀'.repeat(MAX_NAME_LENGTH + 1) }).name).toBeDefined();
  });

  it('trims the name before measuring it', () => {
    expect(validateRegister({ ...okRegister, name: `   ${'x'.repeat(MAX_NAME_LENGTH)}   ` })).toEqual({});
  });

  it(`requires a password of at least ${MIN_PASSWORD_LENGTH} characters`, () => {
    expect(validateRegister({ ...okRegister, password: '' }).password).toBe('Password is required');
    expect(validateRegister({ ...okRegister, password: '12345' }).password).toBe(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
    expect(validateRegister({ ...okRegister, password: '123456' })).toEqual({});
  });

  it('reports every problem at once', () => {
    expect(Object.keys(validateRegister({ name: '', email: 'bad', password: '1' })).sort()).toEqual(['email', 'name', 'password']);
  });
});

describe('validateProfile (settings)', () => {
  it('accepts a valid profile with an empty bio and avatar', () => {
    expect(validateProfile({ name: 'Ada', bio: '', avatarUrl: '' })).toEqual({});
  });
  it('mirrors the server rules for name, bio length and avatar URL', () => {
    expect(validateProfile({ name: '  ', bio: '', avatarUrl: '' }).name).toBe('Name is required');
    expect(validateProfile({ name: 'Ada', bio: 'x'.repeat(201), avatarUrl: '' }).bio).toBe('Bio must be at most 200 characters');
    expect(validateProfile({ name: 'Ada', bio: 'x'.repeat(200), avatarUrl: '' })).toEqual({});
    for (const bad of ['javascript:alert(1)', 'data:image/png;base64,AAAA', 'not a url', 'ftp://x.com/a.png']) {
      expect(validateProfile({ name: 'Ada', bio: '', avatarUrl: bad }).avatarUrl).toBeDefined();
    }
    expect(validateProfile({ name: 'Ada', bio: '', avatarUrl: 'https://x.com/a.png' })).toEqual({});
  });
});

describe('validatePost (editor)', () => {
  it('requires a title and content even for drafts (the server does too)', () => {
    expect(validatePost({ title: ' ', content: '', coverImage: '' })).toEqual({ title: 'Add a title', content: 'Write some content first' });
  });
  it('accepts an empty cover, rejects a non-http cover', () => {
    expect(validatePost({ title: 'T', content: 'C', coverImage: '' })).toEqual({});
    expect(validatePost({ title: 'T', content: 'C', coverImage: 'javascript:alert(1)' }).coverImage).toBeDefined();
  });
});
