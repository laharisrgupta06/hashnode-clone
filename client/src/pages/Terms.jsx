import { Link } from 'react-router-dom';
import PageMeta from '../components/common/PageMeta.jsx';
import { SITE } from '../config/site.js';

export default function Terms() {
  return (
    <article className="prose-page">
      <PageMeta title="Terms and Conditions" description={`The rules for using ${SITE.name}.`} />
      <h1>Terms and Conditions</h1>
      <p className="prose-updated">Last updated: November 12, 2026</p>

      <p>
        {SITE.name} is an independent blogging platform built as an individual software project. It is not affiliated with Hashnode. By creating an account or publishing on {SITE.name}, you agree to these terms.
      </p>

      <h2>Your account</h2>
      <ul>
        <li>Provide a working email address and keep your password to yourself.</li>
        <li>You are responsible for what is published from your account.</li>
      </ul>

      <h2>Your content</h2>
      <ul>
        <li>You keep ownership of the articles you write. Publishing an article makes it publicly visible on its publication&apos;s website and elsewhere on {SITE.name}.</li>
        <li>Publication names, addresses and domains must not impersonate other people, companies or projects.</li>
        <li>Only publish content you have the right to share. Credit sources and respect licences of code and images you include.</li>
        <li>Do not publish content that is illegal, harassing, hateful, or that attempts to harm readers, for example malicious code presented as safe or links to malware.</li>
        <li>Content that breaks these rules may be removed, and accounts used to break them may be closed.</li>
      </ul>

      <h2>Availability</h2>
      <p>
        {SITE.name} is provided as it is, without guarantees of availability or that data will never be lost. Keep your own copies of anything important you write.
      </p>

      <h2>Privacy</h2>
      <p>
        How your data is stored and used is described in the <Link to="/privacy">Privacy Policy</Link>.
      </p>

      <h2>Changes</h2>
      <p>These terms may be updated as the platform changes. The date above shows the latest version.</p>
    </article>
  );
}
