import { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import useAuth from '../hooks/useAuth.js';
import AuthForm from '../components/common/AuthForm.jsx';
import LoadingSpinner from '../components/common/LoadingSpinner.jsx';
import { validateLogin } from '../utils/validation.js';
import { safeRedirect } from '../utils/safeRedirect.js';
import { describeError } from '../utils/apiError.js';

export default function Login() {
  const { status, login } = useAuth();
  const location = useLocation();

  const [values, setValues] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [focusRequest, setFocusRequest] = useState({ name: null, count: 0 });

  // Where to go after logging in: the page the user was sent away from (if any), checked by
  // safeRedirect so it can never point to another website. Otherwise the dashboard.
  const destination = safeRedirect(location.state?.from);
  const sessionExpired = location.state?.expired === true;

  // Already logged in (or just logged in): leave this page.
  if (status === 'authenticated') return <Navigate to={destination} replace />;
  // A stored token is being checked: showing the form for a moment would flash.
  if (status === 'loading') return <LoadingSpinner label="Checking your session…" />;

  const handleChange = (name, value) => {
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined })); // clear that field's error while typing
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;

    const found = validateLogin(values);
    setErrors(found);
    setFormError('');
    const firstInvalid = Object.keys(found)[0];
    if (firstInvalid) {
      setFocusRequest((current) => ({ name: firstInvalid, count: current.count + 1 }));
      return;
    }

    setSubmitting(true);
    try {
      await login(values.email.trim(), values.password);
      setValues((current) => ({ ...current, password: '' })); // success: do not keep the password around
      // Nothing else to do: status is now 'authenticated', so the <Navigate> above takes over.
    } catch (error) {
      const { kind, message } = describeError(error);
      setFormError(message);
      // Wrong credentials: clear the password. Network/server problems: keep it, so the user can just retry.
      if (kind === 'credentials') setValues((current) => ({ ...current, password: '' }));
    } finally {
      setSubmitting(false);
    }
  };

  const fields = [
    { name: 'email', label: 'Email', type: 'email', autoComplete: 'email', value: values.email, error: errors.email },
    { name: 'password', label: 'Password', type: 'password', autoComplete: 'current-password', value: values.password, error: errors.password },
  ];

  return (
    <AuthForm
      title="Log in"
      submitLabel="Log in"
      fields={fields}
      onChange={handleChange}
      onSubmit={handleSubmit}
      submitting={submitting}
      formError={formError}
      notice={sessionExpired ? 'Your session has expired. Please log in again.' : ''}
      focusRequest={focusRequest}
      footer={
        <>
          New here? <Link to="/register" state={location.state}>Create an account</Link>
        </>
      }
    />
  );
}
