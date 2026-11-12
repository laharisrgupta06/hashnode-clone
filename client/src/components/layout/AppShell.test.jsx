import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent, within } from '@testing-library/react';
import { Routes, Route, Link } from 'react-router-dom';
import AppShell from './AppShell.jsx';
import { renderWithAuth } from '../../test/renderWithAuth.jsx';

const ADA = { _id: 'u1', name: 'Ada Lovelace', avatarUrl: '' };

const renderShell = (auth = { status: 'guest' }, route = '/') =>
  renderWithAuth(
    <AppShell>
      <Routes>
        <Route path="/" element={<p>home page</p>} />
        <Route path="/login" element={<p>login page</p>} />
        <Route path="/somewhere" element={<Link to="/">in-page link home</Link>} />
      </Routes>
    </AppShell>,
    { auth, route }
  );

const menuButton = () => screen.getByRole('button', { name: 'Open menu' });
const drawer = () => screen.queryByRole('dialog', { name: 'Menu' });

describe('AppShell layout', () => {
  it('has a skip link to the main content, and the main region can take focus', () => {
    renderShell();
    expect(screen.getByRole('link', { name: 'Skip to content' }).getAttribute('href')).toBe('#main');
    const main = screen.getByRole('main');
    expect(main.id).toBe('main');
    expect(main.getAttribute('tabindex')).toBe('-1');
  });

  it('the menu lists the platform destinations; guests get no workspace links', () => {
    renderShell();
    fireEvent.click(menuButton());
    const nav = within(within(drawer()).getByRole('navigation', { name: 'Main' }));
    expect(nav.getAllByRole('link').map((a) => [a.textContent, a.getAttribute('href')])).toEqual([
      ['Home', '/'],
      ['Explore', '/explore'],
      ['Topics', '/tags'],
      ['About', '/about'],
    ]);
  });

  it('a logged-in user also gets their workspace in the menu: My publications, profile, account settings', () => {
    renderShell({ status: 'authenticated', user: ADA });
    fireEvent.click(menuButton());
    const nav = within(within(drawer()).getByRole('navigation', { name: 'Main' }));
    expect(nav.getAllByRole('link').map((a) => [a.textContent, a.getAttribute('href')]).slice(4)).toEqual([
      ['My publications', '/publications'],
      ['Your profile', '/profile/u1'],
      ['Account settings', '/settings'],
    ]);
  });

  it('marks the current page in the navigation', () => {
    renderShell({ status: 'guest' }, '/explore');
    const platform = within(screen.getByRole('navigation', { name: 'Platform' }));
    expect(platform.getByRole('link', { name: 'Explore' }).getAttribute('aria-current')).toBe('page');
    expect(platform.getByRole('link', { name: 'Topics' }).getAttribute('aria-current')).toBeNull();
  });

  it('the footer shows the current year and only working links', () => {
    renderShell();
    const footer = screen.getByRole('contentinfo');
    expect(footer.textContent).toContain(`© ${new Date().getFullYear()}`);
    expect(within(footer).getAllByRole('link').map((a) => a.getAttribute('href'))).toEqual(['/', '/explore', '/tags', '/about', '/register', '/login', '/privacy', '/terms']);
  });
});

describe('mobile navigation drawer', () => {
  it('is closed at first; the menu button opens it and reports aria-expanded', () => {
    renderShell();
    expect(drawer()).toBeNull();
    expect(menuButton().getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(menuButton());
    expect(drawer()).toBeTruthy();
    expect(drawer().getAttribute('aria-modal')).toBe('true');
    expect(menuButton().getAttribute('aria-expanded')).toBe('true');
  });

  it('moves focus into the drawer and locks page scrolling while open', () => {
    renderShell();
    fireEvent.click(menuButton());
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Close menu' }));
    expect(document.body.style.overflow).toBe('hidden');
  });

  it.each([
    ['Escape', () => fireEvent.keyDown(document, { key: 'Escape' })],
    ['the close button', () => fireEvent.click(screen.getByRole('button', { name: 'Close menu' }))],
    ['a click on the backdrop', () => fireEvent.click(document.querySelector('.drawer-backdrop'))],
  ])('closes with %s, unlocks scrolling and returns focus to the menu button', (_label, close) => {
    renderShell();
    fireEvent.click(menuButton());
    close();
    expect(drawer()).toBeNull();
    expect(document.body.style.overflow).toBe('');
    expect(document.activeElement).toBe(menuButton());
  });

  it('keeps Tab inside the drawer (wraps from last to first and back)', () => {
    renderShell();
    fireEvent.click(menuButton());
    const items = drawer().querySelectorAll('a[href], button:not([disabled])');
    const first = items[0];
    const last = items[items.length - 1];
    last.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).toBe(first);
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(last);
  });

  it('choosing a link navigates and closes the drawer', () => {
    renderShell({ status: 'guest' }, '/somewhere');
    fireEvent.click(menuButton());
    fireEvent.click(within(drawer()).getByRole('link', { name: 'Log in' }));
    expect(screen.getByText('login page')).toBeTruthy();
    expect(drawer()).toBeNull();
  });

  it('any navigation (e.g. browser Back or an in-page link) closes it', () => {
    renderShell({ status: 'guest' }, '/somewhere');
    fireEvent.click(menuButton());
    fireEvent.click(screen.getByText('in-page link home'));
    expect(screen.getByText('home page')).toBeTruthy();
    expect(drawer()).toBeNull();
  });

  it('for a guest: Log in and Create account', () => {
    renderShell({ status: 'guest' });
    fireEvent.click(menuButton());
    const links = within(drawer()).getAllByRole('link').map((a) => [a.textContent, a.getAttribute('href')]);
    expect(links).toEqual(
      expect.arrayContaining([
        ['Log in', '/login'],
        ['Create account', '/register'],
      ])
    );
  });

  it('for a logged-in user: their name and a Log out that logs out and goes home', () => {
    const logout = vi.fn();
    renderShell({ status: 'authenticated', user: ADA, logout }, '/somewhere');
    fireEvent.click(menuButton());
    expect(within(drawer()).getByText('Ada Lovelace')).toBeTruthy();
    fireEvent.click(within(drawer()).getByRole('button', { name: 'Log out' }));
    expect(logout).toHaveBeenCalledTimes(1);
    expect(screen.getByText('home page')).toBeTruthy();
    expect(drawer()).toBeNull();
  });

  it('when the session cannot be verified: a working retry, no Log in link', () => {
    const retry = vi.fn();
    renderShell({ status: 'unavailable', retry });
    fireEvent.click(menuButton());
    expect(within(drawer()).queryByRole('link', { name: 'Log in' })).toBeNull();
    fireEvent.click(within(drawer()).getByRole('button', { name: 'Retry session check' }));
    expect(retry).toHaveBeenCalledTimes(1);
  });
});
