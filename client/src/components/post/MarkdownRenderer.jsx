import { useState } from 'react';
import Markdown, { defaultUrlTransform } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkDevpressFormat from './remarkDevpressFormat.js';
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import oneDark from 'react-syntax-highlighter/dist/esm/styles/prism/one-dark';
import bash from 'react-syntax-highlighter/dist/esm/languages/prism/bash';
import c from 'react-syntax-highlighter/dist/esm/languages/prism/c';
import cpp from 'react-syntax-highlighter/dist/esm/languages/prism/cpp';
import css from 'react-syntax-highlighter/dist/esm/languages/prism/css';
import diff from 'react-syntax-highlighter/dist/esm/languages/prism/diff';
import go from 'react-syntax-highlighter/dist/esm/languages/prism/go';
import java from 'react-syntax-highlighter/dist/esm/languages/prism/java';
import javascript from 'react-syntax-highlighter/dist/esm/languages/prism/javascript';
import json from 'react-syntax-highlighter/dist/esm/languages/prism/json';
import jsx from 'react-syntax-highlighter/dist/esm/languages/prism/jsx';
import markdown from 'react-syntax-highlighter/dist/esm/languages/prism/markdown';
import markup from 'react-syntax-highlighter/dist/esm/languages/prism/markup';
import python from 'react-syntax-highlighter/dist/esm/languages/prism/python';
import rust from 'react-syntax-highlighter/dist/esm/languages/prism/rust';
import sql from 'react-syntax-highlighter/dist/esm/languages/prism/sql';
import tsx from 'react-syntax-highlighter/dist/esm/languages/prism/tsx';
import typescript from 'react-syntax-highlighter/dist/esm/languages/prism/typescript';
import yaml from 'react-syntax-highlighter/dist/esm/languages/prism/yaml';
import Icon from '../common/Icon.jsx';

// Renders an article's Markdown safely. Used by the article page AND the editor preview, so both
// always look the same (PRD 2.1.B, 6.2 MarkdownPreview).
//
// Security (PRD rubric: "content is safely rendered"):
//   - Raw HTML written inside Markdown (<script>, <img onerror>, <iframe>...) is NOT rendered:
//     react-markdown drops it unless a raw-HTML plugin is added, and none is.
//   - Link and image URLs pass through react-markdown's defaultUrlTransform, which removes
//     javascript:, vbscript:, data: and other unsafe protocols.
//   - React escapes all text, so nothing in an article can become executable code.

// Only the languages registered here are highlighted (keeps the bundle small); others show plain.
const LANGUAGES = { bash, c, cpp, css, diff, go, java, javascript, json, jsx, markdown, markup, python, rust, sql, tsx, typescript, yaml };
Object.entries(LANGUAGES).forEach(([name, grammar]) => SyntaxHighlighter.registerLanguage(name, grammar));
const ALIASES = { js: 'javascript', ts: 'typescript', sh: 'bash', shell: 'bash', zsh: 'bash', html: 'markup', xml: 'markup', svg: 'markup', py: 'python', yml: 'yaml', md: 'markdown', 'c++': 'cpp', golang: 'go', rs: 'rust' };

// one-dark with the comment colour lightened: the original fails the 4.5:1 contrast minimum.
const codeTheme = {
  ...oneDark,
  comment: { ...oneDark.comment, color: '#b7aa9c' },
  prolog: { ...oneDark.prolog, color: '#b7aa9c' },
  cdata: { ...oneDark.cdata, color: '#b7aa9c' },
};

export function resolveLanguage(className = '') {
  const match = /language-([\w+#-]+)/.exec(className);
  if (!match) return null;
  const name = match[1].toLowerCase();
  const resolved = ALIASES[name] ?? name;
  return LANGUAGES[resolved] ? resolved : null;
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  if (!navigator.clipboard?.writeText) return null; // no clipboard access: no button that would fail
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };
  return (
    <button type="button" className="code-copy" onClick={copy} aria-label={copied ? 'Code copied' : 'Copy code'}>
      <Icon name={copied ? 'check' : 'copy'} size={14} />
      <span aria-hidden="true">{copied ? 'Copied' : 'Copy'}</span>
    </button>
  );
}

// A fenced code block: ```js ... ```
function CodeBlock({ children }) {
  // react-markdown gives <pre><code className="language-js">...</code></pre>; we take the <code> apart.
  const codeElement = Array.isArray(children) ? children[0] : children;
  const className = codeElement?.props?.className ?? '';
  const text = String(codeElement?.props?.children ?? '').replace(/\n$/, '');
  const language = resolveLanguage(className);
  const label = (/language-([\w+#-]+)/.exec(className) ?? [])[1];

  return (
    <div className="code-block">
      <div className="code-block-header">
        <span className="code-block-language">{label ?? 'code'}</span>
        <CopyButton text={text} />
      </div>
      {language ? (
        <SyntaxHighlighter language={language} style={codeTheme} PreTag="pre" customStyle={{ margin: 0, background: 'transparent', padding: '1rem' }} codeTagProps={{ className: `language-${language}` }}>
          {text}
        </SyntaxHighlighter>
      ) : (
        <pre>
          <code>{text}</code>
        </pre>
      )}
    </div>
  );
}

function MarkdownLink({ href, children }) {
  // After defaultUrlTransform an unsafe href is empty: render the text without a link.
  if (!href) return <span>{children}</span>;
  const external = /^https?:\/\//i.test(href) && !href.startsWith(window.location.origin);
  return external ? (
    <a href={href} target="_blank" rel="noopener noreferrer nofollow ugc">
      {children}
    </a>
  ) : (
    <a href={href}>{children}</a>
  );
}

// The article title is the page's only <h1>, so Markdown headings start one level lower.
const COMPONENTS = {
  h1: ({ children }) => <h2>{children}</h2>,
  h2: ({ children }) => <h3>{children}</h3>,
  h3: ({ children }) => <h4>{children}</h4>,
  h4: ({ children }) => <h5>{children}</h5>,
  h5: ({ children }) => <h6>{children}</h6>,
  h6: ({ children }) => <h6>{children}</h6>,
  pre: CodeBlock,
  a: MarkdownLink,
  img: ({ src, alt }) => (src ? <img src={src} alt={alt ?? ''} loading="lazy" decoding="async" referrerPolicy="no-referrer" /> : null),
};

// GFM adds strikethrough (~~text~~), tables and task lists. DevPress's formatting extensions
// (underline, colour, highlight, font, size, alignment) are an exact allowlist: see
// utils/richFormat.js. No other HTML is rendered.
const REMARK_PLUGINS = [[remarkGfm, { singleTilde: false }], remarkDevpressFormat];

export default function MarkdownRenderer({ content }) {
  return (
    <div className="markdown-body">
      <Markdown components={COMPONENTS} remarkPlugins={REMARK_PLUGINS} urlTransform={defaultUrlTransform}>
        {content}
      </Markdown>
    </div>
  );
}
