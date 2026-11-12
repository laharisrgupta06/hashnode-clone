import { afterEach, describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { renderWithAuth } from '../test/renderWithAuth.jsx';
import { installFakeServer, networkError, reply } from '../test/fakeServer.js';
import ForgotPassword from './ForgotPassword.jsx';
import ResetPassword from './ResetPassword.jsx';
import { validateNewPassword } from '../utils/validation.js';

const TOKEN = 'a'.repeat(64);

function LoginProbe() {
  const location = useLocation();
  return <p data-testid="login">{location.state?.passwordChanged ? 'changed' : 'plain'}</p>;
}

afterEach(() => {
  window.history.replaceState(null, '', '/');
});

describe('Forgot password', () => {
  it('sends the email and shows the same neutral confirmation for any address', async () => {
    const server = installFakeServer({ 'POST /auth/forgot-password': () => reply(200, { message: 'If an account exists for that email, a link to reset the password has been sent. It expires in 30 minutes.', delivery: 'email' }) });
    renderWithAuth(<ForgotPassword />);
    fireEvent.change(screen.getByLabelText(/email of your account/i), { target: { value: '  someone@example.com ' } });
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));
    expect(await screen.findByRole('heading', { name: /check your email/i })).toBeTruthy();
    expect(screen.getByText(/if an account exists/i)).toBeTruthy();
    expect(screen.queryByText(/printed in the terminal/i)).toBeNull();
    expect(server.requests).toHaveLength(1);
  });

  it('says plainly when the development server has no email service', async () => {
    installFakeServer({ 'POST /auth/forgot-password': () => reply(200, { message: 'If an account exists…', delivery: 'console' }) });
    renderWithAuth(<ForgotPassword />);
    fireEvent.change(screen.getByLabelText(/email of your account/i), { target: { value: 'someone@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));
    expect(await screen.findByText(/no email service configured/i)).toBeTruthy();
  });

  it('validates the email before sending anything', () => {
    const server = installFakeServer({});
    renderWithAuth(<ForgotPassword />);
    fireEvent.change(screen.getByLabelText(/email of your account/i), { target: { value: 'not-an-email' } });
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));
    expect(screen.getByText(/enter a valid email address/i)).toBeTruthy();
    expect(server.requests).toHaveLength(0);
  });

  it('shows the server refusal when email is not configured in production', async () => {
    installFakeServer({ 'POST /auth/forgot-password': () => reply(503, { message: 'Password reset by email is not available right now. Please contact the site owner.' }) });
    renderWithAuth(<ForgotPassword />);
    fireEvent.change(screen.getByLabelText(/email of your account/i), { target: { value: 'someone@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));
    expect(await screen.findByText(/not available right now/i)).toBeTruthy();
  });

  it('reports a network failure as a network failure', async () => {
    installFakeServer({ 'POST /auth/forgot-password': () => networkError() });
    renderWithAuth(<ForgotPassword />);
    fireEvent.change(screen.getByLabelText(/email of your account/i), { target: { value: 'someone@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));
    expect(await screen.findByText(/could not reach the server/i)).toBeTruthy();
  });
});

describe('Reset password', () => {
  const renderReset = () =>
    renderWithAuth(
      <Routes>
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/login" element={<LoginProbe />} />
      </Routes>,
      { route: '/reset-password' }
    );

  it('takes the token from the link, removes it from the address bar, and changes the password', async () => {
    window.history.replaceState(null, '', `/reset-password#token=${TOKEN}`);
    let sent;
    installFakeServer({
      'POST /auth/reset-password': (config) => {
        sent = JSON.parse(config.data);
        return reply(200, { message: 'ok' });
      },
    });
    renderReset();
    expect(window.location.hash).toBe('');
    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'brand-new-pass' } });
    fireEvent.change(screen.getByLabelText(/repeat the new password/i), { target: { value: 'brand-new-pass' } });
    fireEvent.click(screen.getByRole('button', { name: /change password/i }));
    await waitFor(() => expect(screen.getByTestId('login').textContent).toBe('changed'));
    expect(sent).toEqual({ token: TOKEN, password: 'brand-new-pass' });
  });

  it('shows the server message for an expired or used link', async () => {
    window.history.replaceState(null, '', `/reset-password#token=${TOKEN}`);
    installFakeServer({ 'POST /auth/reset-password': () => reply(400, { message: 'This reset link is invalid or has expired. Ask for a new one.' }) });
    renderReset();
    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'brand-new-pass' } });
    fireEvent.change(screen.getByLabelText(/repeat the new password/i), { target: { value: 'brand-new-pass' } });
    fireEvent.click(screen.getByRole('button', { name: /change password/i }));
    expect(await screen.findByText(/invalid or has expired/i)).toBeTruthy();
  });

  it('explains a link without its code', () => {
    window.history.replaceState(null, '', '/reset-password');
    renderReset();
    expect(screen.getByRole('heading', { name: /not complete/i })).toBeTruthy();
    expect(screen.getByRole('link', { name: /ask for a new reset link/i })).toBeTruthy();
  });

  it('checks length and that both passwords match', () => {
    expect(validateNewPassword({ password: '', confirm: '' }).password).toBeTruthy();
    expect(validateNewPassword({ password: '123', confirm: '123' }).password).toMatch(/at least 6/);
    expect(validateNewPassword({ password: 'abcdef', confirm: 'abcdeg' }).confirm).toMatch(/do not match/);
    expect(validateNewPassword({ password: 'abcdef', confirm: 'abcdef' })).toEqual({});
  });
});
