import { useEffect, useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import api from '../../api/axios.js';
import PageMeta from '../../components/common/PageMeta.jsx';
import Icon from '../../components/common/Icon.jsx';
import IdentityFields, { validateIdentity } from '../../components/publication/IdentityFields.jsx';
import PublicationPreview from '../../components/publication/PublicationPreview.jsx';
import { isHttpUrl } from '../../utils/validation.js';
import { describeError } from '../../utils/apiError.js';

const pick = (p) => ({ name: p.name, tagline: p.tagline ?? '', description: p.description ?? '', logoUrl: p.logoUrl ?? '', coverImage: p.coverImage ?? '' });

// Publication identity: name, tagline, description, logo and cover. The address (slug) is fixed.
export default function PublicationSettings() {
  const { publication, setPublication } = useOutletContext();
  const [values, setValues] = useState(pick(publication));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);
  const formRef = useRef(null);
  const resultRef = useRef(null);
  useEffect(() => {
    if (result) resultRef.current?.focus();
  }, [result]);

  const saved = pick(publication);
  const unchanged = Object.keys(saved).every((key) => values[key].trim() === saved[key]);

  const update = (name, value) => {
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
    setResult(null);
  };

  const save = async (event) => {
    event.preventDefault();
    const found = validateIdentity(values, isHttpUrl);
    setErrors(found);
    const first = Object.keys(found)[0];
    if (first) {
      formRef.current?.querySelector(`#pub-${first}`)?.focus();
      return;
    }
    setSaving(true);
    try {
      const body = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value.trim()]));
      const { data } = await api.put(`/publications/${publication.slug}`, body);
      setPublication(data.publication);
      setValues(pick(data.publication));
      setResult({ type: 'success', text: 'Settings saved.' });
    } catch (err) {
      setResult({ type: 'error', text: describeError(err).message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section>
      <PageMeta title={`Settings for ${publication.name}`} />
      <header className="page-heading">
        <div>
          <p className="eyebrow">{publication.name}</p>
          <h1>Settings</h1>
          <p>
            The publication address <code>/p/{publication.slug}</code> is fixed so existing links keep working.
          </p>
        </div>
      </header>
      <div className="create-pub-grid">
        <form className="panel form-panel" onSubmit={save} noValidate ref={formRef}>
          {result && (
            <div className={`alert alert-${result.type}`} role={result.type === 'error' ? 'alert' : 'status'} tabIndex={-1} ref={resultRef}>
              <Icon name={result.type === 'error' ? 'circle-alert' : 'circle-check'} />
              <div className="alert-body">
                <p>{result.text}</p>
              </div>
            </div>
          )}
          <IdentityFields values={values} errors={errors} onChange={update} />
          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={saving || unchanged}>
              {saving ? 'Saving…' : 'Save settings'}
            </button>
          </div>
        </form>
        <aside className="create-pub-preview" aria-label="Live preview">
          <p className="eyebrow">Live preview</p>
          <PublicationPreview publication={{ ...publication, ...values }} />
        </aside>
      </div>
    </section>
  );
}
