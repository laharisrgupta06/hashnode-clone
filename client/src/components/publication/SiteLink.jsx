import { Link } from 'react-router-dom';

// A link from the creator's workspace to the PUBLIC publication website. It opens in a new tab,
// so the workspace stays open in the first one. Screen readers are told about the new tab.
// (Links between public pages, such as Explore, keep normal same-tab navigation.)
export default function SiteLink({ to, children, 'aria-label': ariaLabel, ...rest }) {
  return (
    <Link to={to} target="_blank" rel="noopener noreferrer" aria-label={ariaLabel ? `${ariaLabel} (opens in a new tab)` : undefined} {...rest}>
      {children}
      {!ariaLabel && <span className="visually-hidden"> (opens in a new tab)</span>}
    </Link>
  );
}
