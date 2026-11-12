import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios.js';
import PageMeta from '../components/common/PageMeta.jsx';
import Icon from '../components/common/Icon.jsx';
import IdentityFields, { validateIdentity } from '../components/publication/IdentityFields.jsx';
import AppearanceFields from '../components/publication/AppearanceFields.jsx';
import PublicationPreview from '../components/publication/PublicationPreview.jsx';
import { checkSlugFormat, suggestSlug, publicationAddresses, DEFAULT_APPEARANCE, SLUG_MAX, workspacePath } from '../utils/publication.js';
import { isHttpUrl } from '../utils/validation.js';
import { describeError } from '../utils/apiError.js';

const CHECK_DELAY_MS = 350;

// Create a publication: identity, address (slug) with a live availability check, appearance, preview.
export default function NewPublication() {
  const navigate = useNavigate();
  const formRef = useRef(null);
  const [values, setValues] = useState({ name: '', tagline: '', description: '', logoUrl: '', coverImage: '' });
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [slugState, setSlugState] = useState({ status: 'idle', message: '' }); // idle | checking | available | unavailable | error
  const [appearance, setAppearance] = useState(DEFAULT_APPEARANCE);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const updateField = (name, value) => {
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
    setFormError('');
    if (name === 'name' && !slugTouched) setSlug(suggestSlug(value)); // follow the name until edited by hand
  };

  // Availability: format first (instant), then the server (debounced, stale answers ignored).
  useEffect(() => {
    if (!slug) {
      setSlugState({ status: 'idle', message: '' });
      return undefined;
    }
    const formatProblem = checkSlugFormat(slug);
    if (formatProblem) {
      setSlugState({ status: 'unavailable', message: formatProblem });
      return undefined;
    }
    setSlugState({ status: 'checking', message: 'Checking availability…' });
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const { data } = await api.get('/publications/check-slug', { params: { slug }, signal: controller.signal });
        setSlugState(data.available ? { status: 'available', message: 'This address is available' } : { status: 'unavailable', message: data.reason });
      } catch (error) {
        if (!controller.signal.aborted) setSlugState({ status: 'error', message: 'Could not check the address. It will be checked again when you create the publication.' });
      }
    }, CHECK_DELAY_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [slug]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (saving) return;
    const found = validateIdentity(values, isHttpUrl);
    const slugProblem = checkSlugFormat(slug) || (slugState.status === 'unavailable' ? slugState.message : null);
    if (slugProblem) found.slug = slugProblem;
    setErrors(found);
    const first = Object.keys(found)[0];
    if (first) {
      formRef.current?.querySelector(`#pub-${first}`)?.focus();
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const { data } = await api.post('/publications', {
        name: values.name.trim(),
        slug,
        tagline: values.tagline.trim(),
        description: values.description.trim(),
        logoUrl: values.logoUrl.trim(),
        coverImage: values.coverImage.trim(),
        appearance,
      });
      navigate(workspacePath(data.publication.slug), { state: { notice: `"${data.publication.name}" was created. Write your first article when you are ready.` } });
    } catch (error) {
      const { message } = describeError(error);
      if (error.response?.status === 409) {
        setErrors((current) => ({ ...current, slug: message }));
        setSlugState({ status: 'unavailable', message });
        formRef.current?.querySelector('#pub-slug')?.focus();
      } else {
        setFormError(message);
      }
    } finally {
      setSaving(false);
    }
  };

  const addresses = publicationAddresses(slug || 'your-address');
  const slugHintId = 'pub-slug-status';

  return (
    <section className="create-pub">
      <PageMeta title="Create a publication" />
      <header className="page-heading">
        <div>
          <Link to="/publications" className="back-link">
            <Icon name="arrow-left" size={16} />
            My publications
          </Link>
          <h1>Create a publication</h1>
          <p>A publication is your blog on DevPress: it has its own name, address, look and articles. You can change everything except the address later.</p>
        </div>
      </header>

      <div className="create-pub-grid">
        <form className="panel form-panel" onSubmit={handleSubmit} noValidate ref={formRef}>
          {formError && (
            <div className="alert alert-error" role="alert">
              <Icon name="circle-alert" />
              <div className="alert-body">
                <p>{formError}</p>
              </div>
            </div>
          )}

          <h2 className="form-section-title">Identity</h2>
          <IdentityFields values={values} errors={errors} onChange={updateField} />

          <h2 className="form-section-title">Address</h2>
          <div className="field">
            <label htmlFor="pub-slug">Publication address</label>
            <div className="slug-input">
              <span className="slug-prefix" aria-hidden="true">
                /p/
              </span>
              <input
                id="pub-slug"
                type="text"
                value={slug}
                maxLength={SLUG_MAX}
                autoComplete="off"
                autoCapitalize="none"
                spellCheck="false"
                onChange={(event) => {
                  setSlugTouched(true);
                  setSlug(event.target.value.toLowerCase().replace(/\s+/g, '-'));
                  setErrors((current) => ({ ...current, slug: undefined }));
                }}
                aria-invalid={errors.slug || slugState.status === 'unavailable' ? 'true' : 'false'}
                aria-describedby={slugHintId}
              />
            </div>
            <p id={slugHintId} className={`slug-status slug-${slugState.status}`} role="status">
              {errors.slug || slugState.message || 'Lowercase letters, numbers and hyphens. It cannot be changed later.'}
            </p>
            <p className="field-hint">
              Readers will find it at <code>{addresses.current}</code>
              {addresses.subdomain ? (
                <>
                  , and at <code>{addresses.subdomain}</code> once subdomains are enabled.
                </>
              ) : (
                '. Subdomain and custom-domain addresses can be set up later in Domain settings.'
              )}
            </p>
          </div>

          <h2 className="form-section-title">Appearance</h2>
          <AppearanceFields appearance={appearance} onChange={setAppearance} idPrefix="create" />

          <div className="form-actions">
            <Link to="/publications" className="btn btn-ghost">
              Cancel
            </Link>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Creating…' : 'Create publication'}
            </button>
          </div>
        </form>

        <aside className="create-pub-preview" aria-label="Live preview">
          <p className="eyebrow">Live preview</p>
          <PublicationPreview publication={{ ...values, slug, appearance }} />
        </aside>
      </div>
    </section>
  );
}
