import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import api from '../api/axios.js';
import useAuth from '../hooks/useAuth.js';
import AuthForm from '../components/common/AuthForm.jsx';
import PageMeta from '../components/common/PageMeta.jsx';
import Icon from '../components/common/Icon.jsx';
import { validateForgotPassword } from '../utils/validation.js';
import { describeError } from '../utils/apiError.js';

// Step 1 of a password reset: ask for the account's email. The answer is the same whether or not
// the email is registered, so this page never reveals who has an account.
export default function ForgotPassword() {
  const { status } = useAuth();
  const [values, setValues] = useState({ email: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [focusRequest, setFocusRequest] = useState({ name: null, count: 0 });
  const [sent, setSent] = useState(null); // { message, delivery }

  if (status === 'authenticated') return <Navigate to="/settings" replace />;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;
    const found = validateForgotPassword(values);
    setErrors(found);
    setFormError('');
    if (found.email) {
      setFocusRequest((current) => ({ name: 'email', count: current.count + 1 }));
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await api.post('/auth/forgot-password', { email: values.email.trim() });
      setSent({ message: data.message, delivery: data.delivery });
    } catch (error) {
      // 503 = the server has no email service (production): its own plain message explains that.
      const unavailable = error.response?.status === 503 && typeof error.response.data?.message === 'string';
      setFormError(unavailable ? error.response.data.message : describeError(error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const aside = (
    <>
      <p className="auth-aside-kicker">Forgot your password</p>
      <p className="auth-aside-title">It happens to everyone.</p>
      <p className="auth-aside-text">We will email you a link to choose a new password. The link works once and expires after 30 minutes.</p>
    </>
  );

  if (sent) {
    return (
      <div className="auth-layout">
        <PageMeta title="Check your email" />
        <section className="auth-card" aria-live="polite">
          <h1>Check your email</h1>
          <p className="alert alert-success" role="status">
            <Icon name="circle-check" /> {sent.message}
          </p>
          {sent.delivery === 'console' && (
            <p className="alert alert-info">
              This development server has no email service configured, so no email was sent. The reset link was printed in the terminal running the API server.
            </p>
          )}
          <p className="auth-footer">
            Not there after a few minutes? Check your spam folder or <button type="button" className="btn-link" onClick={() => setSent(null)}>try again</button>.
          </p>
          <p className="auth-footer">
            <Link to="/login">Back to log in</Link>
          </p>
        </section>
        <aside className="auth-aside" aria-label="About password reset">
          {aside}
        </aside>
      </div>
    );
  }

  return (
    <>
      <PageMeta title="Reset your password" description="Get a link to choose a new password for your DevPress account." />
      <AuthForm
        title="Reset your password"
        submitLabel="Send reset link"
        fields={[{ name: 'email', label: 'Email of your account', type: 'email', autoComplete: 'email', value: values.email, error: errors.email }]}
        onChange={(name, value) => {
          setValues({ [name]: value });
          setErrors({});
        }}
        onSubmit={handleSubmit}
        submitting={submitting}
        formError={formError}
        focusRequest={focusRequest}
        footer={
          <>
            Remembered it? <Link to="/login">Back to log in</Link>
          </>
        }
        aside={aside}
      />
    </>
  );
}
