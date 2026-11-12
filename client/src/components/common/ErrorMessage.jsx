import Icon from './Icon.jsx';

// A visible error box. role="alert" makes screen readers announce it as soon as it appears.
// Pass onRetry to show a working "Try again" button.
export default function ErrorMessage({ message, onRetry }) {
  return (
    <div className="alert alert-error" role="alert">
      <Icon name="circle-alert" />
      <div className="alert-body">
        <p>{message}</p>
        {onRetry && (
          <button type="button" className="btn btn-secondary" onClick={onRetry}>
            Try again
          </button>
        )}
      </div>
    </div>
  );
}
