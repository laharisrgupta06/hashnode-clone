import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import api from '../../api/axios.js';
import useRequest from '../../hooks/useRequest.js';
import PageMeta from '../../components/common/PageMeta.jsx';
import Icon from '../../components/common/Icon.jsx';
import LoadingSpinner from '../../components/common/LoadingSpinner.jsx';
import ErrorMessage from '../../components/common/ErrorMessage.jsx';
import ConfirmDialog from '../../components/common/ConfirmDialog.jsx';
import { describeError } from '../../utils/apiError.js';
import { formatDateTime } from '../../utils/format.js';
import { publicationAddresses, publicationPath, PLATFORM_DOMAIN } from '../../utils/publication.js';
import SiteLink from '../../components/publication/SiteLink.jsx';

const STATUS_LABEL = { pending: 'Waiting for DNS record', verified: 'Verified', failed: 'Verification lost' };

function CopyValue({ value, label }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };
  return (
    <span className="copy-value">
      <code>{value}</code>
      {navigator.clipboard?.writeText && (
        <button type="button" className="icon-button" onClick={copy} aria-label={copied ? `${label} copied` : `Copy ${label}`}>
          <Icon name={copied ? 'check' : 'copy'} size={16} />
        </button>
      )}
    </span>
  );
}

// Addresses for this publication: the path address that works today, the planned subdomain, and
// custom domains. A custom domain is only "verified" after a real DNS lookup finds its TXT record.
export default function Domain() {
  const { publication } = useOutletContext();
  const addresses = publicationAddresses(publication.slug);
  const { status, data: domains, error, reload, setData } = useRequest(
    (signal) => api.get(`/publications/${publication.slug}/domains`, { signal }).then((r) => r.data.domains),
    [publication.slug]
  );
  const [hostname, setHostname] = useState('');
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState(null);
  const [checkingId, setCheckingId] = useState(null);
  const [removing, setRemoving] = useState(null);
  const [removeBusy, setRemoveBusy] = useState(false);

  const add = async (event) => {
    event.preventDefault();
    if (!hostname.trim()) return;
    setAdding(true);
    setMessage(null);
    try {
      const { data } = await api.post(`/publications/${publication.slug}/domains`, { hostname: hostname.trim() });
      setData((current) => [...(current ?? []), data.domain]);
      setHostname('');
      setMessage({ type: 'success', text: `${data.domain.hostname} was added. Create the DNS record below, then check verification.` });
    } catch (err) {
      setMessage({ type: 'error', text: describeError(err).message });
    } finally {
      setAdding(false);
    }
  };

  const verify = async (domain) => {
    setCheckingId(domain._id);
    setMessage(null);
    try {
      const { data } = await api.post(`/publications/${publication.slug}/domains/${domain._id}/verify`);
      setData((current) => current.map((d) => (d._id === domain._id ? data.domain : d)));
      setMessage(data.domain.status === 'verified' ? { type: 'success', text: `${domain.hostname} is verified.` } : { type: 'error', text: data.domain.lastError });
    } catch (err) {
      setMessage({ type: 'error', text: describeError(err).message });
    } finally {
      setCheckingId(null);
    }
  };

  const remove = async () => {
    setRemoveBusy(true);
    try {
      await api.delete(`/publications/${publication.slug}/domains/${removing._id}`);
      setData((current) => current.filter((d) => d._id !== removing._id));
      setMessage({ type: 'success', text: `${removing.hostname} was removed.` });
      setRemoving(null);
    } catch (err) {
      setMessage({ type: 'error', text: describeError(err).message });
      setRemoving(null);
    } finally {
      setRemoveBusy(false);
    }
  };

  return (
    <section>
      <PageMeta title={`Domain for ${publication.name}`} />
      <header className="page-heading">
        <div>
          <p className="eyebrow">{publication.name}</p>
          <h1>Domain</h1>
          <p>Where readers can find this publication.</p>
        </div>
      </header>

      <div className="panel">
        <h2 className="panel-title">Default address</h2>
        <p className="muted">Works now, on every DevPress installation.</p>
        <p>
          <SiteLink to={publicationPath(publication.slug)}>{addresses.current}</SiteLink>
        </p>
        <p className="field-hint">
          The address comes from the publication&apos;s slug, <code>{publication.slug}</code>, which is fixed once the publication is created so links never break.
        </p>
      </div>

      <div className="panel">
        <h2 className="panel-title">
          DevPress subdomain {!PLATFORM_DOMAIN && <span className="planned-badge">Not configured</span>}
        </h2>
        {PLATFORM_DOMAIN ? (
          <p>
            <code>{addresses.subdomain}</code> serves this publication once wildcard DNS for <code>{PLATFORM_DOMAIN}</code> points to DevPress.
          </p>
        ) : (
          <p className="muted">
            Each publication will get an address like <code>{publication.slug}.your-platform-domain</code> once the platform&apos;s own domain is chosen and configured. Nothing is published at such an address yet.
          </p>
        )}
      </div>

      <div className="panel">
        <h2 className="panel-title">Custom domains</h2>
        <p className="muted">
          Use a domain you own, such as <code>blog.example.com</code>. You prove ownership with a DNS TXT record; DevPress checks it with a real DNS lookup. Serving the publication at that domain also needs the domain to point to where DevPress is hosted, which becomes possible after deployment.
        </p>

        {message && (
          <div className={`alert alert-${message.type}`} role={message.type === 'error' ? 'alert' : 'status'}>
            <Icon name={message.type === 'error' ? 'circle-alert' : 'circle-check'} />
            <div className="alert-body">
              <p>{message.text}</p>
            </div>
          </div>
        )}

        <form className="inline-input domain-form" onSubmit={add}>
          <label htmlFor="domain-input" className="visually-hidden">
            Domain name
          </label>
          <input id="domain-input" type="text" inputMode="url" autoCapitalize="none" spellCheck="false" placeholder="blog.example.com" value={hostname} onChange={(event) => setHostname(event.target.value)} />
          <button type="submit" className="btn btn-primary" disabled={adding || !hostname.trim()}>
            {adding ? 'Adding…' : 'Add domain'}
          </button>
        </form>

        {status === 'loading' && !domains && <LoadingSpinner label="Loading domains…" />}
        {status === 'error' && <ErrorMessage message={describeError(error).message} onRetry={reload} />}
        {domains && domains.length === 0 && <p className="muted">No custom domains yet.</p>}
        {domains && domains.length > 0 && (
          <ul className="domain-list">
            {domains.map((domain) => (
              <li key={domain._id} className="domain-item">
                <div className="domain-item-head">
                  <strong>{domain.hostname}</strong>
                  <span className={`status-badge domain-${domain.status}`}>{STATUS_LABEL[domain.status]}</span>
                </div>
                {domain.status !== 'verified' && (
                  <div className="dns-record">
                    <p>Add this TXT record at your DNS provider:</p>
                    <dl>
                      <dt>Type</dt>
                      <dd>
                        <code>TXT</code>
                      </dd>
                      <dt>Name</dt>
                      <dd>
                        <CopyValue value={domain.record.name} label="record name" />
                      </dd>
                      <dt>Value</dt>
                      <dd>
                        <CopyValue value={domain.record.value} label="record value" />
                      </dd>
                    </dl>
                  </div>
                )}
                <p className="field-hint">
                  {domain.lastCheckedAt ? `Last checked ${formatDateTime(domain.lastCheckedAt)}.` : 'Not checked yet.'}
                  {domain.verifiedAt && ` Verified ${formatDateTime(domain.verifiedAt)}.`}
                  {domain.lastError && ` ${domain.lastError}`}
                </p>
                <div className="domain-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => verify(domain)} disabled={checkingId === domain._id}>
                    {checkingId === domain._id ? 'Checking DNS…' : 'Check verification'}
                  </button>
                  <button type="button" className="btn btn-ghost btn-ghost-danger" onClick={() => setRemoving(domain)}>
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ConfirmDialog open={Boolean(removing)} title="Remove this domain?" confirmLabel="Remove domain" busyLabel="Removing…" danger busy={removeBusy} onConfirm={remove} onCancel={() => setRemoving(null)}>
        <p>{removing?.hostname} will no longer be linked to this publication. You can add it again later; it will need to be verified again.</p>
      </ConfirmDialog>
    </section>
  );
}
