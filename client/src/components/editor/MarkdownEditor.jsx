import { useLayoutEffect, useRef } from 'react';
import Icon from '../common/Icon.jsx';
import { FORMATS, applyEdit } from '../../utils/markdownFormat.js';

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
const MOD = isMac ? 'Cmd' : 'Ctrl';

// Toolbar buttons. Every one inserts real Markdown (PRD 2.1.B formatting).
const TOOLS = [
  { id: 'heading', label: 'Heading', icon: 'heading' },
  { id: 'bold', label: 'Bold', icon: 'bold', shortcut: 'B' },
  { id: 'italic', label: 'Italic', icon: 'italic', shortcut: 'I' },
  { id: 'link', label: 'Link', icon: 'link', shortcut: 'K' },
  { id: 'bulletList', label: 'Bulleted list', icon: 'list' },
  { id: 'numberedList', label: 'Numbered list', icon: 'list-ordered' },
  { id: 'quote', label: 'Quote', icon: 'text-quote' },
  { id: 'code', label: 'Inline code', icon: 'code' },
  { id: 'codeBlock', label: 'Code block', icon: 'square-code' },
];
const SHORTCUTS = Object.fromEntries(TOOLS.filter((t) => t.shortcut).map((t) => [t.shortcut.toLowerCase(), t.id]));

// The Markdown textarea with a formatting toolbar (PRD 6.2 MarkdownEditor).
// The textarea stays a real, native textarea: selection, undo, spell-check and mobile keyboards all work.
export default function MarkdownEditor({ value, onChange, onSave, invalid, describedBy }) {
  const textareaRef = useRef(null);

  // The document grows with the article, so the whole text reads as one continuous page
  // (the page scrolls, not a small box inside it).
  useLayoutEffect(() => {
    const box = textareaRef.current;
    if (!box) return;
    const scrollY = window.scrollY;
    box.style.height = 'auto';
    box.style.height = `${Math.max(box.scrollHeight + 2, 420)}px`;
    window.scrollTo(window.scrollX, scrollY); // measuring must not make the page jump
  }, [value]);

  const format = (id) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    applyEdit(textarea, FORMATS[id](textarea.value, textarea.selectionStart, textarea.selectionEnd));
  };

  const handleKeyDown = (event) => {
    const mod = isMac ? event.metaKey : event.ctrlKey;
    if (!mod || event.altKey) return;
    const key = event.key.toLowerCase();
    if (key === 's') {
      event.preventDefault();
      onSave?.();
    } else if (SHORTCUTS[key] && !event.shiftKey) {
      event.preventDefault();
      format(SHORTCUTS[key]);
    }
  };

  return (
    <div className={`md-editor${invalid ? ' is-invalid' : ''}`}>
      <div className="md-toolbar" role="toolbar" aria-label="Formatting" aria-controls="post-content">
        {TOOLS.map((tool) => (
          <button
            key={tool.id}
            type="button"
            className="md-tool"
            onClick={() => format(tool.id)}
            aria-label={tool.shortcut ? `${tool.label} (${MOD}+${tool.shortcut})` : tool.label}
            title={tool.shortcut ? `${tool.label} (${MOD}+${tool.shortcut})` : tool.label}
          >
            <Icon name={tool.icon} size={18} />
          </button>
        ))}
      </div>
      <label htmlFor="post-content" className="visually-hidden">
        Article content (Markdown)
      </label>
      <textarea
        id="post-content"
        name="content"
        ref={textareaRef}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={'Write your article in Markdown.\n\n## A heading\n\nSome **bold** text, a [link](https://example.com) and code:\n\n```js\nconsole.log("hello");\n```'}
        spellCheck="true"
        aria-invalid={invalid ? 'true' : 'false'}
        aria-describedby={describedBy}
      />
    </div>
  );
}
