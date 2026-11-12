import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AuthForm from './AuthForm.jsx';

const fields = (errors = {}) => [
  { name: 'email', label: 'Email', type: 'email', autoComplete: 'email', value: 'ada@example.com', error: errors.email },
  { name: 'password', label: 'Password', type: 'password', autoComplete: 'current-password', value: '', error: errors.password },
];

const renderForm = (props = {}) => {
  const handlers = { onChange: vi.fn(), onSubmit: vi.fn((e) => e.preventDefault()) };
  const ui = (p) => <AuthForm title="Log in" submitLabel="Log in" fields={fields()} submitting={false} footer="footer text" {...handlers} {...p} />;
  const result = render(ui(props));
  return { ...result, ...handlers, update: (p) => result.rerender(ui(p)) };
};

describe('AuthForm', () => {
  it('labels every field so it can be found by its name', () => {
    renderForm();
    expect(screen.getByLabelText('Email').getAttribute('autocomplete')).toBe('email');
    expect(screen.getByLabelText('Password').getAttribute('type')).toBe('password');
  });

  it('marks a field with an error as invalid and links the message to it', () => {
    renderForm({ fields: fields({ password: 'Password is required' }) });
    const input = screen.getByLabelText('Password');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(document.getElementById(input.getAttribute('aria-describedby')).textContent).toBe('Password is required');
    expect(screen.getByLabelText('Email').getAttribute('aria-invalid')).toBe('false');
    expect(screen.getByLabelText('Email').hasAttribute('aria-describedby')).toBe(false);
  });

  it('moves focus to the requested field each time a new focus request arrives', () => {
    const { update } = renderForm();
    update({ focusRequest: { name: 'password', count: 1 } });
    expect(document.activeElement).toBe(screen.getByLabelText('Password'));
    screen.getByLabelText('Email').focus();
    update({ focusRequest: { name: 'password', count: 2 } });
    expect(document.activeElement).toBe(screen.getByLabelText('Password'));
  });

  it('reports typing with the field name and value', () => {
    const { onChange } = renderForm();
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret1' } });
    expect(onChange).toHaveBeenCalledWith('password', 'secret1');
  });

  it('submits, and disables the button while a request is running', () => {
    const { onSubmit, update } = renderForm();
    fireEvent.click(screen.getByRole('button', { name: 'Log in' }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    update({ submitting: true });
    const button = screen.getByRole('button', { name: 'Please wait…' });
    expect(button.disabled).toBe(true);
  });

  it('announces a form error as an alert and a notice as a status', () => {
    renderForm({ formError: 'Invalid email or password', notice: 'Your session has expired. Please log in again.' });
    expect(screen.getByRole('alert').textContent).toBe('Invalid email or password');
    expect(screen.getByRole('status').textContent).toBe('Your session has expired. Please log in again.');
  });

  it('uses its own messages instead of browser validation pop-ups', () => {
    const { container } = renderForm();
    expect(container.querySelector('form').noValidate).toBe(true);
  });
});
