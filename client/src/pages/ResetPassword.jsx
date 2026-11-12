import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios.js';
import AuthForm from '../components/common/AuthForm.jsx';
import PageMeta from '../components/common/PageMeta.jsx';
import { validateNewPassword } from '../utils/validation.js';
import { describeError } from '../utils/apiError.js';

// The token arrives in the link's fragment (#token=...), which is never sent to any server.
// It is read once, kept in memory, and removed from the address bar straight away.
function takeTokenFromUrl() {
  const match = /(?:^|[#&])token=([a-f0-9]{64})(?:&|$)/.exec(window.location.hash);
  if (window.location.hash) window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search);
  return match ? match[1] : null;
}

// Step 2 of a password reset: choose the new password.
export default function ResetPassword() {
  const navigate = useNavigate();
  const [token] = useState(takeTokenFromUrl);
  const [values, setValues] = useState({ password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [focusRequest, setFocusRequest] = useState({ name: null, count: 0 });

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;
    const found = validateNewPassword(values);
    setErrors(found);
    setFormError('');
    const first = Object.keys(found)[0];
    if (first) {
      setFocusRequest((current) => ({ name: first, count: current.count + 1 }));
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/auth/reset-password', { token, password: values.password });
      navigate('/login', { replace: true, state: { passwordChanged: true } });
    } catch (error) {
      setFormError(describeError(error).message);
      setValues({ password: '', confirm: '' });
    } finally {
      setSubmitting(false);
    }
  };

  if (!token) {
    return (
      <section className="auth-card">
        <PageMeta title="Reset link not valid" />
        <h1>This link is not complete</h1>
        <p className="alert alert-error" role="alert">
          The reset link is missing its code. Open the link from the email again, or ask for a new one.
        </p>
        <p className="auth-footer">
          <Link to="/forgot-password">Ask for a new reset link</Link>
        </p>
      </section>
    );
  }

  return (
    <>
      <PageMeta title="Choose a new password" />
      <AuthForm
        title="Choose a new password"
        submitLabel="Change password"
        fields={[
          { name: 'password', label: 'New password', type: 'password', autoComplete: 'new-password', value: values.password, error: errors.password },
          { name: 'confirm', label: 'Repeat the new password', type: 'password', autoComplete: 'new-password', value: values.confirm, error: errors.confirm },
        ]}
        onChange={(name, value) => {
          setValues((current) => ({ ...current, [name]: value }));
          setErrors((current) => ({ ...current, [name]: undefined }));
        }}
        onSubmit={handleSubmit}
        submitting={submitting}
        formError={formError}
        focusRequest={focusRequest}
        footer={
          <>
            Link expired? <Link to="/forgot-password">Ask for a new one</Link>
          </>
        }
        aside={
          <>
            <p className="auth-aside-kicker">Almost done</p>
            <p className="auth-aside-title">Pick a password you have not used here before.</p>
            <p className="auth-aside-text">At least 6 characters. After this, the link stops working and you can log in with the new password.</p>
          </>
        }
      />
    </>
  );
}
