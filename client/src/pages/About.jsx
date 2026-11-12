import { Link } from 'react-router-dom';
import PageMeta from '../components/common/PageMeta.jsx';
import { SITE } from '../config/site.js';

// What DevPress is and how it is organised. Facts only; no claims about users or traffic.
export default function About() {
  return (
    <article className="prose-page">
      <PageMeta title="About" description={`What ${SITE.name} is and how publications work.`} />
      <p className="eyebrow">About</p>
      <h1>About {SITE.name}</h1>
      <p>
        {SITE.name} is a publishing platform for developers. Instead of posting into one shared feed, every writer creates a <strong>publication</strong>: a blog with its own name, address, look and archive.
      </p>

      <h2>How it is organised</h2>
      <ul>
        <li>
          <strong>Accounts</strong> belong to people. One account can run several publications.
        </li>
        <li>
          <strong>Publications</strong> have a public website at <code>/p/your-address</code>, a workspace for managing it, and appearance settings that shape how the website looks.
        </li>
        <li>
          <strong>Articles</strong> are written in Markdown inside a publication. Drafts stay private; published articles appear on the publication&apos;s website, in Explore and under their topics.
        </li>
      </ul>

      <h2>Writing</h2>
      <p>The editor has a formatting toolbar, keyboard shortcuts and a live preview. Fenced code blocks are highlighted for common languages, and a local backup protects unsaved text.</p>

      <h2>Addresses and domains</h2>
      <p>
        Every publication can be read at its <code>/p/</code> address today. Subdomain addresses and custom domains are prepared in each publication&apos;s Domain settings; a custom domain only counts as connected after its DNS record has been verified.
      </p>

      <p>
        Ready to start? <Link to="/register">Create an account</Link> or <Link to="/explore">explore publications</Link>.
      </p>
      <p className="muted">
        {SITE.name} is an independent project inspired by Hashnode and is not affiliated with it. Read the <Link to="/privacy">Privacy Policy</Link> and <Link to="/terms">Terms and Conditions</Link>.
      </p>
    </article>
  );
}
