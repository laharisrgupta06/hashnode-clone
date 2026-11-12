import { useEffect, useRef, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import api from '../../api/axios.js';
import PageMeta from '../../components/common/PageMeta.jsx';
import Icon from '../../components/common/Icon.jsx';
import AppearanceFields from '../../components/publication/AppearanceFields.jsx';
import PublicationPreview from '../../components/publication/PublicationPreview.jsx';
import { describeError } from '../../utils/apiError.js';
import { publicationPath, workspacePath } from '../../utils/publication.js';
import SiteLink from '../../components/publication/SiteLink.jsx';

// Curated appearance settings for the publication website, with a live preview. Logo, cover and
// description are edited in Settings and shown here in the preview.
export default function Appearance() {
  const { publication, setPublication } = useOutletContext();
  const [appearance, setAppearance] = useState(publication.appearance);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);
  const resultRef = useRef(null);
  useEffect(() => {
    if (result) resultRef.current?.focus();
  }, [result]);

  const saved = publication.appearance;
  const unchanged = appearance.accentColor === saved.accentColor && appearance.fontPreset === saved.fontPreset && appearance.layout === saved.layout;

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setResult(null);
    try {
      const { data } = await api.put(`/publications/${publication.slug}`, { appearance });
      setPublication(data.publication);
      setAppearance(data.publication.appearance);
      setResult({ type: 'success', text: 'Appearance saved. Your website uses it now.' });
    } catch (err) {
      setResult({ type: 'error', text: describeError(err).message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section>
      <PageMeta title={`Appearance of ${publication.name}`} />
      <header className="page-heading">
        <div>
          <p className="eyebrow">{publication.name}</p>
          <h1>Appearance</h1>
          <p>
            Choose how your publication website looks. Logo, cover image and description are in <Link to={workspacePath(publication.slug, 'settings')}>Settings</Link>.
          </p>
        </div>
        <SiteLink to={publicationPath(publication.slug)} className="btn btn-secondary">
          <Icon name="external-link" size={16} />
          View site
        </SiteLink>
      </header>

      <div className="create-pub-grid">
        <form className="panel form-panel" onSubmit={save}>
          {result && (
            <div className={`alert alert-${result.type}`} role={result.type === 'error' ? 'alert' : 'status'} tabIndex={-1} ref={resultRef}>
              <Icon name={result.type === 'error' ? 'circle-alert' : 'circle-check'} />
              <div className="alert-body">
                <p>{result.text}</p>
              </div>
            </div>
          )}
          <AppearanceFields appearance={appearance} onChange={(next) => { setAppearance(next); setResult(null); }} idPrefix="ws" />
          <div className="form-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setAppearance(saved)} disabled={unchanged || saving}>
              Reset
            </button>
            <button type="submit" className="btn btn-primary" disabled={unchanged || saving}>
              {saving ? 'Saving…' : 'Save appearance'}
            </button>
          </div>
        </form>
        <aside className="create-pub-preview" aria-label="Live preview">
          <p className="eyebrow">Live preview</p>
          <PublicationPreview publication={{ ...publication, appearance }} />
        </aside>
      </div>
    </section>
  );
}
