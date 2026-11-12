import { Link, useOutletContext } from 'react-router-dom';
import PageMeta from '../../components/common/PageMeta.jsx';
import Icon from '../../components/common/Icon.jsx';
import { workspacePath } from '../../utils/publication.js';

// Analytics is planned, not built: DevPress does not record page views yet, so this page says so
// plainly instead of showing invented numbers. The counts that DO exist are on the Overview.
export default function Analytics() {
  const { publication } = useOutletContext();
  return (
    <section>
      <PageMeta title={`Analytics for ${publication.name}`} />
      <header className="page-heading">
        <div>
          <p className="eyebrow">{publication.name}</p>
          <h1>
            Analytics <span className="planned-badge">Planned</span>
          </h1>
        </div>
      </header>
      <div className="panel planned-panel">
        <Icon name="chart-no-axes-column" size={28} />
        <h2>Reader statistics are not available yet</h2>
        <p>DevPress does not record page views or reader data today, so there is nothing to show here. When analytics are added, they will appear on this page and the Privacy Policy will be updated first.</p>
        <p>
          Article counts for this publication are on the{' '}
          <Link to={workspacePath(publication.slug)}>Overview</Link>.
        </p>
      </div>
    </section>
  );
}
