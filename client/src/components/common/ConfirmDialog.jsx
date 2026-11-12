import { useEffect, useId, useRef } from 'react';

// A modal confirmation (e.g. "Delete this article?"), PRD 2.1.B "confirmation step before deletion".
// Accessibility: role="alertdialog" with a title and description; focus starts on Cancel (the safe
// choice); Tab stays inside; Escape cancels; focus returns to whatever opened it.
export default function ConfirmDialog({ open, title, children, confirmLabel, busyLabel, busy = false, danger = false, error, onConfirm, onCancel }) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef(null);
  const cancelRef = useRef(null);
  // Latest values for the key handler, so the effect below runs only when the dialog opens/closes
  // (re-running it would move focus around while the user is in the dialog).
  const latest = useRef({ busy, onCancel });
  latest.current = { busy, onCancel };

  useEffect(() => {
    if (!open) return undefined;
    const opener = document.activeElement;
    cancelRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event) => {
      if (event.key === 'Escape' && !latest.current.busy) {
        event.preventDefault();
        latest.current.onCancel();
        return;
      }
      if (event.key !== 'Tab' || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll('button:not([disabled])');
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="dialog-backdrop">
      <div className="dialog" role="alertdialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId} ref={panelRef}>
        <h2 id={titleId}>{title}</h2>
        <div id={descriptionId} className="dialog-body">
          {children}
        </div>
        {error && (
          <p className="alert alert-error" role="alert">
            {error}
          </p>
        )}
        <div className="dialog-actions">
          <button type="button" className="btn btn-secondary" onClick={onCancel} ref={cancelRef} disabled={busy}>
            Cancel
          </button>
          <button type="button" className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm} disabled={busy}>
            {busy ? busyLabel ?? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
