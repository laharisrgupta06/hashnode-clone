import { useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import api from '../api/axios.js';
import useAuth from '../hooks/useAuth.js';
import useRequest from '../hooks/useRequest.js';
import useReveal from '../hooks/useReveal.js';
import PageMeta from '../components/common/PageMeta.jsx';
import Icon from '../components/common/Icon.jsx';
import LoadingSpinner from '../components/common/LoadingSpinner.jsx';
import PublicationMark from '../components/publication/PublicationMark.jsx';
import TypewriterScene from '../components/landing/TypewriterScene.jsx';
import { ACCENTS, publicationPath } from '../utils/publication.js';
import { plural } from '../utils/format.js';

// "Create your publication": the form when logged in, otherwise registration that continues to it.
function CreateLink({ className, children }) {
  const { status } = useAuth();
  if (status === 'authenticated') {
    return (
      <Link to="/publications/new" className={className}>
        {children}
      </Link>
    );
  }
  return (
    <Link to="/register" state={{ from: { pathname: '/publications/new' } }} className={className}>
      {children}
    </Link>
  );
}

export default function Landing() {
  const location = useLocation();
  const rootRef = useRef(null);
  const pubs = useRequest((signal) => api.get('/publications', { signal }).then((r) => r.data.publications), []);
  const topics = useRequest((signal) => api.get('/tags', { signal }).then((r) => r.data.tags), []);
  useReveal(rootRef, [pubs.status, topics.status]);

  useEffect(() => {
    if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView();
  }, [location.hash]);

  const featured = (pubs.data ?? []).slice(0, 5);
  const topTopics = (topics.data ?? []).slice(0, 14);

  return (
    <div className="landing" ref={rootRef}>
      <PageMeta description="DevPress is a publishing platform for developers. Create a publication with its own address and identity, write technical articles in Markdown, and share your work with readers." />

      {/* ---------- Hero ---------- */}
      <section className="lp-hero">
        <div className="lp-grain" aria-hidden="true" />
        <div className="lp-inner lp-hero-grid">
          <div className="lp-hero-copy">
            <p className="lp-eyebrow">
              <span className="lp-eyebrow-rule" aria-hidden="true" />A publishing house for developers
            </p>
            <h1 className="lp-hero-title">
              <span className="lp-hl">Your own publication</span> for the things you <em className="lp-hl">know</em> best.
            </h1>
            <p className="lp-hero-lede">
              Create a publication with its own name, address and look. Write technical articles in Markdown with a live preview and highlighted code, then publish them to a website readers can follow.
            </p>
            <div className="lp-hero-actions">
              <CreateLink className="btn btn-primary btn-lg">
                Create your publication
                <Icon name="arrow-right" size={18} />
              </CreateLink>
              <Link to="/explore" className="btn btn-quiet btn-lg">
                Explore publications
              </Link>
            </div>
            <p className="lp-hero-note">Free to start. Drafts stay private until you publish.</p>
          </div>
          <div className="lp-hero-art">
            <TypewriterScene />
          </div>
        </div>
      </section>

      {/* ---------- 01 Create ---------- */}
      <section className="lp-chapter" id="how-it-works" aria-labelledby="ch1-title">
        <div className="lp-inner lp-split" data-reveal>
          <div className="lp-chapter-copy">
            <p className="lp-step">01</p>
            <h2 id="ch1-title">Create your publication</h2>
            <p>Every writer on DevPress starts with a publication of their own: a name, a short description and an address that never changes, so links keep working for years.</p>
          </div>
          <div className="lp-address" aria-label="Example publication address">
            <span className="lp-address-label">Your address</span>
            <p className="lp-address-url">
              <span>devpress</span>/p/<strong>field-notes</strong>
            </p>
            <p className="lp-address-status">
              <Icon name="check" size={16} /> Checked for availability as you type
            </p>
          </div>
        </div>
      </section>

      {/* ---------- 02 Customise ---------- */}
      <section className="lp-chapter lp-chapter-alt" aria-labelledby="ch2-title">
        <div className="lp-inner lp-split lp-split-reverse" data-reveal>
          <div className="lp-chapter-copy">
            <p className="lp-step">02</p>
            <h2 id="ch2-title">Give it an identity</h2>
            <p>Choose an accent, a typography preset and a layout. Your publication website follows your choices, with a live preview while you decide.</p>
          </div>
          <div className="lp-identity" aria-label="The accent colours and typography presets available to every publication">
            <ul className="lp-swatches">
              {ACCENTS.map((accent) => (
                <li key={accent.value} style={{ '--swatch': accent.value }}>
                  <span className="lp-swatch" />
                  <span className="lp-swatch-name">{accent.label}</span>
                </li>
              ))}
            </ul>
            <div className="lp-specimens">
              <p className="lp-specimen serif">
                Aa<span>Editorial</span>
              </p>
              <p className="lp-specimen sans">
                Aa<span>Clean sans</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- 03 Write (dark band) ---------- */}
      <section className="lp-band" aria-labelledby="ch3-title">
        <div className="lp-inner" data-reveal>
          <div className="lp-band-head">
            <p className="lp-step lp-step-dark">03</p>
            <h2 id="ch3-title">Write in Markdown. See it as readers will.</h2>
            <p>A focused editor with a formatting toolbar and shortcuts, and a preview that renders exactly like the published article, code highlighting included.</p>
          </div>
          <div className="lp-editor-demo" aria-label="Illustration: Markdown on the left, the rendered article on the right">
            <pre className="lp-source">
              <code>
                {'## Caching the build\n\nProfile **first**, then cache.\n\n```js\nconst hit = cache.get(key);\n```'}
              </code>
            </pre>
            <div className="lp-rendered">
              <p className="lp-rendered-h">Caching the build</p>
              <p>
                Profile <strong>first</strong>, then cache.
              </p>
              <pre>
                <code>
                  <span className="tk-k">const</span> hit = cache.<span className="tk-f">get</span>(key);
                </code>
              </pre>
            </div>
          </div>
          <p className="lp-caption">Illustration of the editor and preview.</p>
        </div>
      </section>

      {/* ---------- 04 Publish and share (real publications) ---------- */}
      <section className="lp-chapter" aria-labelledby="ch4-title">
        <div className="lp-inner" data-reveal>
          <div className="lp-row-head">
            <div className="lp-chapter-copy">
              <p className="lp-step">04</p>
              <h2 id="ch4-title">Publish and share</h2>
              <p>Published articles appear on your publication&apos;s own website and in Explore. These publications are on DevPress now.</p>
            </div>
            <Link to="/explore" className="text-link">
              Explore everything <Icon name="arrow-right" size={16} />
            </Link>
          </div>

          {pubs.status === 'loading' && !pubs.data && <LoadingSpinner label="Loading publications…" />}
          {pubs.status === 'error' && <p className="muted">Publications could not be loaded right now.</p>}
          {pubs.data && featured.length === 0 && (
            <div className="lp-empty">
              <p className="lp-empty-title">The first publications will appear here.</p>
              <CreateLink className="btn btn-primary">Start the first one</CreateLink>
            </div>
          )}
          {featured.length > 0 && (
            <ol className="lp-pub-list">
              {featured.map((pub) => (
                <li key={pub._id}>
                  <Link to={publicationPath(pub.slug)} className="lp-pub">
                    <PublicationMark publication={pub} size={52} />
                    <span className="lp-pub-text">
                      <span className="lp-pub-name">{pub.name}</span>
                      {(pub.tagline || pub.description) && <span className="lp-pub-desc">{pub.tagline || pub.description}</span>}
                    </span>
                    <span className="lp-pub-meta">
                      <code>/p/{pub.slug}</code>
                      <span>{plural(pub.publishedCount, 'article')}</span>
                    </span>
                    <Icon name="arrow-right" size={20} />
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>

      {/* ---------- 05 Archive (real topics) ---------- */}
      <section className="lp-chapter lp-chapter-alt" aria-labelledby="ch5-title">
        <div className="lp-inner lp-split" data-reveal>
          <div className="lp-chapter-copy">
            <p className="lp-step">05</p>
            <h2 id="ch5-title">Build an archive of your work</h2>
            <p>Every article stays on your publication, tagged by topic, so readers can find everything you have written about a subject.</p>
          </div>
          <div className="lp-topics">
            {topics.data && topTopics.length === 0 && <p className="muted">Topics appear here as soon as articles are published with tags.</p>}
            {topTopics.length > 0 && (
              <ul aria-label="Topics on DevPress">
                {topTopics.map((tag) => (
                  <li key={tag._id}>
                    <Link to={`/tag/${tag.slug}`} className="lp-topic">
                      #{tag.name}
                      <small>{tag.postCount}</small>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      {/* ---------- Final call to action ---------- */}
      <section className="lp-final" aria-labelledby="final-title">
        <div className="lp-grain" aria-hidden="true" />
        <div className="lp-inner lp-final-inner" data-reveal>
          <h2 id="final-title">Start the publication you keep meaning to write.</h2>
          <p>It takes a minute to create, and your first draft stays private until it reads right.</p>
          <CreateLink className="btn btn-light btn-lg">
            Create your publication
            <Icon name="arrow-right" size={18} />
          </CreateLink>
        </div>
      </section>
    </div>
  );
}
