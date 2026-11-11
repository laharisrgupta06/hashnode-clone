// A spinning ring. role="status" lets screen readers announce the label;
// sighted users see only the ring.
export default function LoadingSpinner({ label = 'Loading…' }) {
  return (
    <div className="spinner-wrap" role="status">
      <span className="spinner" aria-hidden="true" />
      <span className="visually-hidden">{label}</span>
    </div>
  );
}
