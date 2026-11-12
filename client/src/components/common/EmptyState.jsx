import Icon from './Icon.jsx';

// A designed "nothing here yet" panel with an optional action, used instead of blank pages.
export default function EmptyState({ icon = 'file-text', title, children, action }) {
  return (
    <div className="empty-state">
      <span className="empty-state-icon">
        <Icon name={icon} size={22} />
      </span>
      <h2>{title}</h2>
      {children && <p>{children}</p>}
      {action && <div className="empty-state-action">{action}</div>}
    </div>
  );
}
