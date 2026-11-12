import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent, within } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './Navbar.jsx';
import { renderWithAuth } from '../../test/renderWithAuth.jsx';
import { SITE } from '../../config/site.js';

const ADA = { _id: 'u1', name: 'Ada Lovelace', avatarUrl: '' };

const renderNavbar = (auth, route = '/') =>
  renderWithAuth(
    <>
      <Navbar menuOpen={false} onOpenMenu={() => {}} />
      <Routes>
        <Route path="/" element={<p>home page</p>} />
        <Route path="*" element={<p>other page</p>} />
      </Routes>
    </>,
    { auth, route }
  );

const account = () => within(screen.getByRole('navigation', { name: 'Account' }));
const accountLinks = () => account().queryAllByRole('link').map((a) => a.textContent);

describe('Navbar (top bar)', () => {
  it('the logo is a link to the home page named after the product', () => {
    renderNavbar({ status: 'guest' });
    expect(screen.getByRole('link', { name: `${SITE.name} home` }).getAttribute('href')).toBe('/');
  });

  it('has a menu button that controls the mobile navigation and reports its state', () => {
    const onOpenMenu = vi.fn();
    renderWithAuth(<Navbar menuOpen={false} onOpenMenu={onOpenMenu} />, { auth: { status: 'guest' } });
    const button = screen.getByRole('button', { name: 'Open menu' });
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(button.getAttribute('aria-controls')).toBe('mobile-nav');
    fireEvent.click(button);
    expect(onOpenMenu).toHaveBeenCalledTimes(1);
  });

  it('while loading: no account actions at all', () => {
    renderNavbar({ status: 'loading' });
    expect(accountLinks()).toEqual([]);
    expect(account().queryByRole('button')).toBeNull();
  });

  it('for a guest: Log in and Get started', () => {
    renderNavbar({ status: 'guest' });
    expect(accountLinks()).toEqual(['Log in', 'Get started']);
    expect(account().getByRole('link', { name: 'Log in' }).getAttribute('href')).toBe('/login');
    expect(account().getByRole('link', { name: 'Get started' }).getAttribute('href')).toBe('/register');
  });

  it('shows the platform links Explore, Topics and About', () => {
    renderNavbar({ status: 'guest' });
    const platform = within(screen.getByRole('navigation', { name: 'Platform' }));
    expect(platform.getAllByRole('link').map((a) => [a.textContent, a.getAttribute('href')])).toEqual([
      ['Explore', '/explore'],
      ['Topics', '/tags'],
      ['About', '/about'],
    ]);
  });

  it('for a logged-in user: My publications, a profile link named for screen readers, and Log out (no guest links)', () => {
    renderNavbar({ status: 'authenticated', user: ADA });
    expect(account().getByRole('link', { name: 'My publications' }).getAttribute('href')).toBe('/publications');
    expect(account().getByRole('link', { name: 'Your profile (Ada Lovelace)' }).getAttribute('href')).toBe('/profile/u1');
    expect(accountLinks()).not.toContain('Log in');
    expect(account().getByRole('button', { name: 'Log out' })).toBeTruthy();
  });

  it('shows the first letter when there is no avatar, and the image when there is one', () => {
    const { unmount } = renderNavbar({ status: 'authenticated', user: ADA });
    expect(account().getByText('A')).toBeTruthy();
    unmount();
    renderNavbar({ status: 'authenticated', user: { ...ADA, avatarUrl: 'https://example.com/a.png' } });
    expect(document.querySelector('img.avatar').getAttribute('src')).toBe('https://example.com/a.png');
  });

  it('falls back to the letter when the avatar image fails to load', () => {
    renderNavbar({ status: 'authenticated', user: { ...ADA, avatarUrl: 'https://example.com/broken.png' } });
    fireEvent.error(document.querySelector('img.avatar'));
    expect(document.querySelector('img.avatar')).toBeNull();
    expect(account().getByText('A')).toBeTruthy();
  });

  it('Log out logs out and goes to the home page', () => {
    const logout = vi.fn();
    renderNavbar({ status: 'authenticated', user: ADA, logout }, '/dashboard');
    expect(screen.getByText('other page')).toBeTruthy();
    fireEvent.click(account().getByRole('button', { name: 'Log out' }));
    expect(logout).toHaveBeenCalledTimes(1);
    expect(screen.getByText('home page')).toBeTruthy();
  });

  it('when the session cannot be verified: a banner with a working Retry, and no Log in link', () => {
    const retry = vi.fn();
    renderNavbar({ status: 'unavailable', retry });
    expect(screen.getByRole('status').textContent).toContain("We can't verify your session right now.");
    expect(accountLinks()).not.toContain('Log in');
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(retry).toHaveBeenCalledTimes(1);
  });
});
