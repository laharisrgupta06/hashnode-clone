import { useEffect, useRef } from 'react';

// The shared form layout used by both Login and Register.
// It only DISPLAYS things: the page that uses it owns the values, errors and submit logic.
//
// Props:
//   title, submitLabel   - heading and button text
//   fields               - [{ name, label, type, autoComplete, value, error }]
//   onChange(name, value), onSubmit(event)
//   submitting           - true while the request is running (disables the button: no double submit)
//   formError            - a message about the whole form (e.g. "Invalid email or password")
//   notice               - an informational message shown above the form (e.g. "Session expired")
//   focusRequest         - { name, count }: when count changes, the field `name` receives focus
//   footer               - content below the button (the link to the other page)
//   aside                - optional editorial panel shown beside the form on wide screens
export default function AuthForm({
  title,
  submitLabel,
  fields,
  onChange,
  onSubmit,
  submitting,
  formError,
  notice,
  focusRequest,
  footer,
  aside,
}) {
  const formRef = useRef(null);

  // After a failed validation, move the keyboard focus to the first field with a problem.
  useEffect(() => {
    if (focusRequest?.name) {
      formRef.current?.elements[focusRequest.name]?.focus();
    }
  }, [focusRequest]);

  return (
    <div className={aside ? 'auth-layout' : undefined}>
    <section className="auth-card">
      <h1>{title}</h1>

      {notice && (
        <p className="alert alert-info" role="status">
          {notice}
        </p>
      )}

      {/* noValidate: we show our own accessible messages instead of the browser's pop-ups. */}
      <form ref={formRef} onSubmit={onSubmit} noValidate>
        {formError && (
          <p className="alert alert-error" role="alert">
            {formError}
          </p>
        )}

        {fields.map((field) => {
          const errorId = `${field.name}-error`;
          return (
            <div className="field" key={field.name}>
              <label htmlFor={field.name}>{field.label}</label>
              <input
                id={field.name}
                name={field.name}
                type={field.type}
                autoComplete={field.autoComplete}
                value={field.value}
                onChange={(event) => onChange(field.name, event.target.value)}
                aria-invalid={field.error ? 'true' : 'false'}
                aria-describedby={field.error ? errorId : undefined}
              />
              {field.error && (
                <p className="field-error" id={errorId}>
                  {field.error}
                </p>
              )}
            </div>
          );
        })}

        <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
          {submitting ? 'Please wait…' : submitLabel}
        </button>
      </form>

      <p className="auth-footer">{footer}</p>
    </section>
    {aside && (
      <aside className="auth-aside" aria-label="About DevPress">
        {aside}
      </aside>
    )}
    </div>
  );
}
