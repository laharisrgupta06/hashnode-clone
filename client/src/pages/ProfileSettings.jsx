import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios.js';
import useAuth from '../hooks/useAuth.js';
import PageMeta from '../components/common/PageMeta.jsx';
import Avatar from '../components/common/Avatar.jsx';
import Icon from '../components/common/Icon.jsx';
import { validateProfile, isHttpUrl, MAX_BIO_LENGTH } from '../utils/validation.js';
import { describeError } from '../utils/apiError.js';

// Edit your own name, bio and avatar URL (PRD 2.1.E). PUT /api/users/me only ever changes the
// logged-in user (the server takes the id from the token).
export default function ProfileSettings() {
  const { user, updateUser } = useAuth();
  const [values, setValues] = useState({ name: user.name, bio: user.bio ?? '', avatarUrl: user.avatarUrl ?? '' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null); // { type: 'success' | 'error', message }
  const formRef = useRef(null);

  const change = (name) => (event) => {
    setValues((current) => ({ ...current, [name]: event.target.value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
    setResult(null);
  };

  const unchanged = values.name.trim() === user.name && values.bio.trim() === (user.bio ?? '') && values.avatarUrl.trim() === (user.avatarUrl ?? '');

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (saving) return;
    const found = validateProfile(values);
    setErrors(found);
    const firstInvalid = Object.keys(found)[0];
    if (firstInvalid) {
      formRef.current?.elements[firstInvalid]?.focus();
      return;
    }

    setSaving(true);
    setResult(null);
    try {
      const { data } = await api.put('/users/me', { name: values.name.trim(), bio: values.bio.trim(), avatarUrl: values.avatarUrl.trim() });
      updateUser(data.user); // the navbar and profile show the new details immediately
      setValues({ name: data.user.name, bio: data.user.bio ?? '', avatarUrl: data.user.avatarUrl ?? '' });
      setResult({ type: 'success', message: 'Your profile was saved.' });
    } catch (error) {
      setResult({ type: 'error', message: describeError(error).message });
    } finally {
      setSaving(false);
    }
  };

  const field = (name) => ({
    id: name,
    name,
    value: values[name],
    onChange: change(name),
    'aria-invalid': errors[name] ? 'true' : 'false',
    'aria-describedby': [errors[name] && `${name}-error`, `${name}-hint`].filter(Boolean).join(' '),
  });

  // Only real web addresses are previewed (never javascript:, data: ...).
  const typedAvatar = values.avatarUrl.trim();
  const previewUser = { name: values.name || user.name, avatarUrl: isHttpUrl(typedAvatar) ? typedAvatar : '' };

  return (
    <section className="narrow-page">
      <PageMeta title="Settings" description="Update your DevPress profile." />
      <header className="page-heading">
        <div>
          <h1>Profile settings</h1>
          <p>This information appears on your public profile and next to your articles.</p>
        </div>
        <Link to={`/profile/${user._id}`} className="btn btn-secondary">
          View public profile
        </Link>
      </header>

      <form className="panel form-panel" onSubmit={handleSubmit} noValidate ref={formRef}>
        {result && (
          <div className={`alert alert-${result.type}`} role={result.type === 'error' ? 'alert' : 'status'}>
            <Icon name={result.type === 'error' ? 'circle-alert' : 'circle-check'} />
            <div className="alert-body">
              <p>{result.message}</p>
            </div>
          </div>
        )}

        <div className="field">
          <label htmlFor="name">Display name</label>
          <input type="text" autoComplete="name" {...field('name')} />
          <p className="field-hint" id="name-hint">
            Up to 50 characters.
          </p>
          {errors.name && (
            <p className="field-error" id="name-error">
              {errors.name}
            </p>
          )}
        </div>

        <div className="field">
          <label htmlFor="bio">Short bio</label>
          <textarea rows={4} {...field('bio')} />
          <p className="field-hint" id="bio-hint">
            {values.bio.trim().length} / {MAX_BIO_LENGTH} characters. Optional.
          </p>
          {errors.bio && (
            <p className="field-error" id="bio-error">
              {errors.bio}
            </p>
          )}
        </div>

        <div className="field">
          <label htmlFor="avatarUrl">Avatar image URL</label>
          <div className="avatar-field">
            <span className="avatar-preview" aria-hidden="true">
              <Avatar key={previewUser.avatarUrl} user={previewUser} />
            </span>
            <input type="url" inputMode="url" placeholder="https://example.com/me.png" {...field('avatarUrl')} />
          </div>
          <p className="field-hint" id="avatarUrl-hint">
            A link to an image. Leave empty to show your initial instead.
          </p>
          {errors.avatarUrl && (
            <p className="field-error" id="avatarUrl-error">
              {errors.avatarUrl}
            </p>
          )}
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={saving || unchanged}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>

      <div className="panel">
        <h2 className="panel-title">Account</h2>
        <p className="muted">
          Signed in as <strong>{user.email}</strong>. Your email is private and never shown on your public profile.
        </p>
      </div>
    </section>
  );
}
