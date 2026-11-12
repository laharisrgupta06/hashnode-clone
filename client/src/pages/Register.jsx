import { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import useAuth from '../hooks/useAuth.js';
import AuthForm from '../components/common/AuthForm.jsx';
import PageMeta from '../components/common/PageMeta.jsx';
import { SITE } from '../config/site.js';
import LoadingSpinner from '../components/common/LoadingSpinner.jsx';
import { validateRegister } from '../utils/validation.js';
import { safeRedirect } from '../utils/safeRedirect.js';
import { describeError } from '../utils/apiError.js';

export default function Register() {
  const { status, register } = useAuth();
  const location = useLocation();

  const [values, setValues] = useState({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [focusRequest, setFocusRequest] = useState({ name: null, count: 0 });

  // Registering logs the user in straight away. They continue to the page they originally asked for
  // (the Login page passes it along), or to the dashboard. safeRedirect blocks any outside address.
  const destination = safeRedirect(location.state?.from);

  if (status === 'authenticated') return <Navigate to={destination} replace />;
  if (status === 'loading') return <LoadingSpinner label="Checking your session…" />;

  const handleChange = (name, value) => {
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;

    const found = validateRegister(values);
    setErrors(found);
    setFormError('');
    const firstInvalid = Object.keys(found)[0];
    if (firstInvalid) {
      setFocusRequest((current) => ({ name: firstInvalid, count: current.count + 1 }));
      return;
    }

    setSubmitting(true);
    try {
      await register(values.name.trim(), values.email.trim(), values.password);
      setValues((current) => ({ ...current, password: '' })); // success: do not keep the password around
    } catch (error) {
      // The password is kept on purpose: "email already exists" or a network problem
      // should not force the user to type it again.
      setFormError(describeError(error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const fields = [
    { name: 'name', label: 'Name', type: 'text', autoComplete: 'name', value: values.name, error: errors.name },
    { name: 'email', label: 'Email', type: 'email', autoComplete: 'email', value: values.email, error: errors.email },
    { name: 'password', label: 'Password', type: 'password', autoComplete: 'new-password', value: values.password, error: errors.password },
  ];

  return (
    <>
      <PageMeta title="Create your account" description={`Create a ${SITE.name} account to publish articles for developers.`} />
      <AuthForm
        title="Create your account"
        submitLabel="Register"
        fields={fields}
        onChange={handleChange}
        onSubmit={handleSubmit}
        submitting={submitting}
        formError={formError}
        focusRequest={focusRequest}
        footer={
          <>
            Already have an account? <Link to="/login" state={location.state}>Log in</Link>
          </>
        }
        aside={
          <>
            <p className="auth-aside-kicker">After you register</p>
            <p className="auth-aside-title">Three steps to your first article.</p>
            <ol className="auth-aside-steps">
              <li>Create a publication with its own name and address.</li>
              <li>Write in Markdown with a live preview.</li>
              <li>Publish when it reads right. Drafts stay private.</li>
            </ol>
          </>
        }
      />
    </>
  );
}
