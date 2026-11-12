import { NAME_MAX, TAGLINE_MAX, DESCRIPTION_MAX } from '../../utils/publication.js';

// Name, tagline, description, logo and cover inputs, shared by "Create publication" and the
// workspace Settings page. The parent owns values and errors.
export default function IdentityFields({ values, errors, onChange }) {
  const field = (name) => ({
    id: `pub-${name}`,
    name,
    value: values[name],
    onChange: (event) => onChange(name, event.target.value),
    'aria-invalid': errors[name] ? 'true' : 'false',
    'aria-describedby': [`pub-${name}-hint`, errors[name] && `pub-${name}-error`].filter(Boolean).join(' '),
  });
  const error = (name) =>
    errors[name] && (
      <p className="field-error" id={`pub-${name}-error`}>
        {errors[name]}
      </p>
    );

  return (
    <>
      <div className="field">
        <label htmlFor="pub-name">Publication name</label>
        <input type="text" autoComplete="off" {...field('name')} />
        <p className="field-hint" id="pub-name-hint">
          Up to {NAME_MAX} characters, for example &ldquo;Field Notes&rdquo;.
        </p>
        {error('name')}
      </div>
      <div className="field">
        <label htmlFor="pub-tagline">Tagline</label>
        <input type="text" {...field('tagline')} />
        <p className="field-hint" id="pub-tagline-hint">
          Optional. One short line under the name, up to {TAGLINE_MAX} characters.
        </p>
        {error('tagline')}
      </div>
      <div className="field">
        <label htmlFor="pub-description">Short description</label>
        <textarea rows={3} {...field('description')} />
        <p className="field-hint" id="pub-description-hint">
          Optional. {values.description.trim().length} / {DESCRIPTION_MAX} characters. Shown on your publication&apos;s homepage and About page.
        </p>
        {error('description')}
      </div>
      <div className="field">
        <label htmlFor="pub-logoUrl">Logo image URL</label>
        <input type="url" inputMode="url" placeholder="https://example.com/logo.png" {...field('logoUrl')} />
        <p className="field-hint" id="pub-logoUrl-hint">
          Optional. A square image works best. Without one, the first letter of the name is used.
        </p>
        {error('logoUrl')}
      </div>
      <div className="field">
        <label htmlFor="pub-coverImage">Cover image URL</label>
        <input type="url" inputMode="url" placeholder="https://example.com/cover.jpg" {...field('coverImage')} />
        <p className="field-hint" id="pub-coverImage-hint">
          Optional. A wide image shown at the top of your publication&apos;s homepage.
        </p>
        {error('coverImage')}
      </div>
    </>
  );
}

// Client-side checks matching the server's rules.
export function validateIdentity(values, isHttpUrl) {
  const errors = {};
  if (!values.name.trim()) errors.name = 'Give your publication a name';
  else if ([...values.name.trim()].length > NAME_MAX) errors.name = `The name can have at most ${NAME_MAX} characters`;
  if (values.tagline.trim().length > TAGLINE_MAX) errors.tagline = `The tagline can have at most ${TAGLINE_MAX} characters`;
  if (values.description.trim().length > DESCRIPTION_MAX) errors.description = `The description can have at most ${DESCRIPTION_MAX} characters`;
  for (const key of ['logoUrl', 'coverImage']) {
    const url = values[key].trim();
    if (url && !isHttpUrl(url)) errors[key] = 'Enter a full image address starting with http:// or https://';
  }
  return errors;
}
