import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { Routes, Route, useLocation } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute.jsx';
import { renderWithAuth } from '../../test/renderWithAuth.jsx';

const ADA = { _id: 'u1', name: 'Ada' };

// The login page here just prints the router state it received.
function LoginProbe() {
  const { state } = useLocation();
  return (
    <p>
      login page from={state?.from?.pathname ?? 'none'}
      {state?.from?.search ?? ''} expired={String(state?.expired ?? 'none')}
    </p>
  );
}

const app = (
  <Routes>
    <Route path="/" element={<p>home page</p>} />
    <Route path="/login" element={<LoginProbe />} />
    <Route
      path="/dashboard"
      element={
        <ProtectedRoute>
          <p>secret dashboard</p>
        </ProtectedRoute>
      }
    />
  </Routes>
);

describe('ProtectedRoute', () => {
  it('shows only a spinner while the session is being checked (no protected content flash)', () => {
    renderWithAuth(app, { auth: { status: 'loading' }, route: '/dashboard' });
    expect(screen.getByRole('status').textContent).toContain('Checking your session');
    expect(screen.queryByText('secret dashboard')).toBeNull();
  });

  it('renders the page for an authenticated user', () => {
    renderWithAuth(app, { auth: { status: 'authenticated', user: ADA }, route: '/dashboard' });
    expect(screen.getByText('secret dashboard')).toBeTruthy();
  });

  it('sends a guest to /login and remembers where they wanted to go', () => {
    renderWithAuth(app, { auth: { status: 'guest' }, route: '/dashboard?tab=drafts' });
    expect(screen.getByText('login page from=/dashboard?tab=drafts expired=false')).toBeTruthy();
    expect(screen.queryByText('secret dashboard')).toBeNull();
  });

  it('when the server ended the session, goes to /login marked as expired', () => {
    renderWithAuth(app, { auth: { status: 'guest', sessionExpired: true }, route: '/dashboard' });
    expect(screen.getByText('login page from=/dashboard expired=true')).toBeTruthy();
  });

  it('a deliberate logout on a protected page goes home, without remembering the page', () => {
    const { setAuth } = renderWithAuth(app, { auth: { status: 'authenticated', user: ADA }, route: '/dashboard' });
    expect(screen.getByText('secret dashboard')).toBeTruthy();
    setAuth({ status: 'guest', user: null, sessionExpired: false });
    expect(screen.getByText('home page')).toBeTruthy();
  });

  it('an expiry while on the page goes to /login (not home), remembering the page', () => {
    const { setAuth } = renderWithAuth(app, { auth: { status: 'authenticated', user: ADA }, route: '/dashboard' });
    setAuth({ status: 'guest', user: null, sessionExpired: true });
    expect(screen.getByText('login page from=/dashboard expired=true')).toBeTruthy();
  });

  it('when the server is unreachable: no redirect, an error with a working retry button', () => {
    const retry = vi.fn();
    renderWithAuth(app, { auth: { status: 'unavailable', retry }, route: '/dashboard' });
    expect(screen.getByRole('alert').textContent).toContain('You are still logged in');
    expect(screen.queryByText(/login page/)).toBeNull();
    expect(screen.queryByText('secret dashboard')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(retry).toHaveBeenCalledTimes(1);
  });
});
