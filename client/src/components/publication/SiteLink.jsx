import { Link } from 'react-router-dom';

// A link that opens in a NEW tab, so the page it starts from stays open: used from the workspace
// to the PUBLIC publication website, and from My publications into a publication's workspace.
// Screen readers are told about the new tab.
// (Links between public pages, such as Explore, and within a workspace keep same-tab navigation.)
export default function SiteLink({ to, children, 'aria-label': ariaLabel, ...rest }) {
  return (
    <Link to={to} target="_blank" rel="noopener noreferrer" aria-label={ariaLabel ? `${ariaLabel} (opens in a new tab)` : undefined} {...rest}>
      {children}
      {!ariaLabel && <span className="visually-hidden"> (opens in a new tab)</span>}
    </Link>
  );
}
