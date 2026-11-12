import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Icon from '../common/Icon.jsx';
import { FORMATS, applyEdit, formatState } from '../../utils/markdownFormat.js';
import { ALIGNMENTS, FONTS, HIGHLIGHTS, SIZES, TEXT_COLORS } from '../../utils/richFormat.js';
import { isHttpUrl } from '../../utils/validation.js';

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
const MOD = isMac ? 'Cmd' : 'Ctrl';

// Languages the article renderer highlights (components/post/MarkdownRenderer.jsx).
const CODE_LANGUAGES = [
  ['javascript', 'JavaScript'],
  ['typescript', 'TypeScript'],
  ['jsx', 'JSX'],
  ['tsx', 'TSX'],
  ['python', 'Python'],
  ['java', 'Java'],
  ['go', 'Go'],
  ['rust', 'Rust'],
  ['c', 'C'],
  ['cpp', 'C++'],
  ['css', 'CSS'],
  ['markup', 'HTML'],
  ['json', 'JSON'],
  ['yaml', 'YAML'],
  ['sql', 'SQL'],
  ['bash', 'Shell'],
  ['diff', 'Diff'],
  ['markdown', 'Markdown'],
];

const SHORTCUTS = { b: 'bold', i: 'italic', k: 'editLink', u: 'underline' };

// One toolbar button: an icon, a visible label (hidden when the toolbar is narrow) and a tooltip.
function Tool({ icon, label, shortcut, pressed, disabled, onClick }) {
  const hint = shortcut ? `${label} (${MOD}+${shortcut})` : label;
  return (
    <button type="button" className="md-tool" onClick={onClick} aria-label={hint} title={hint} aria-pressed={pressed === undefined ? undefined : pressed} disabled={disabled}>
      <Icon name={icon} size={17} />
      <span className="md-tool-label" aria-hidden="true">
        {label}
      </span>
    </button>
  );
}

// A dropdown that applies a value and shows the one active at the cursor.
function Choice({ icon, label, value, options, onChoose, emptyLabel }) {
  return (
    <label className="md-choice" title={label}>
      <Icon name={icon} size={16} />
      <span className="visually-hidden">{label}</span>
      <select value={value} onChange={(event) => onChoose(event.target.value)}>
        <option value="">{emptyLabel}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

// The Markdown textarea with a grouped formatting toolbar (PRD 6.2 MarkdownEditor).
// The textarea stays a real, native textarea: selection, undo, spell-check and mobile keyboards all work.
// Every control writes Markdown, or one of DevPress's allowlisted formatting tags (utils/richFormat.js),
// so formatting is part of the article text and survives every view, saving and publishing.
export default function MarkdownEditor({ value, onChange, onSave, invalid, describedBy }) {
  const textareaRef = useRef(null);
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const [imageForm, setImageForm] = useState(null); // { url, alt, failed } while inserting an image
  const state = useMemo(() => formatState(value, selection.start, selection.end), [value, selection]);

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

  const readSelection = () => {
    const box = textareaRef.current;
    if (box) setSelection({ start: box.selectionStart, end: box.selectionEnd });
  };

  const format = (id, option) => {
    const box = textareaRef.current;
    if (!box) return;
    const edit = FORMATS[id](box.value, box.selectionStart, box.selectionEnd, option);
    if (!edit) {
      box.focus();
      return;
    }
    applyEdit(box, edit);
    readSelection();
  };

  const handleKeyDown = (event) => {
    const mod = isMac ? event.metaKey : event.ctrlKey;
    if (!mod || event.altKey) return;
    const key = event.key.toLowerCase();
    if (key === 's') {
      event.preventDefault();
      onSave?.();
    } else if (key === 'x' && event.shiftKey) {
      event.preventDefault();
      format('strikethrough');
    } else if (SHORTCUTS[key] && !event.shiftKey) {
      event.preventDefault();
      format(SHORTCUTS[key]);
    }
  };

  const imageUrlValid = Boolean(imageForm && isHttpUrl(imageForm.url.trim()));
  // The preview loads only after typing pauses, so half-typed addresses are never requested.
  const [previewUrl, setPreviewUrl] = useState('');
  const typedUrl = imageUrlValid ? imageForm.url.trim() : '';
  useEffect(() => {
    if (!typedUrl) {
      setPreviewUrl('');
      return undefined;
    }
    const timer = setTimeout(() => setPreviewUrl(typedUrl), 600);
    return () => clearTimeout(timer);
  }, [typedUrl]);
  const insertImage = (event) => {
    event.preventDefault();
    if (!imageUrlValid || imageForm.failed) return;
    const { url, alt } = imageForm;
    setImageForm(null);
    format('image', { url: url.trim(), alt: alt.trim() });
  };

  return (
    <div className={`md-editor${invalid ? ' is-invalid' : ''}`}>
      <div className="md-toolbar" role="toolbar" aria-label="Formatting" aria-controls="post-content">
        <div className="md-group" role="group" aria-label="Text">
          <label className="md-choice md-choice-style" title="Text style">
            <span className="visually-hidden">Text style</span>
            <select value={state.block} onChange={(event) => format(event.target.value)}>
              <option value="paragraph">Paragraph</option>
              <option value="heading1">Heading 1</option>
              <option value="heading2">Heading 2</option>
              <option value="heading3">Heading 3</option>
            </select>
          </label>
          <Tool icon="bold" label="Bold" shortcut="B" pressed={state.bold} onClick={() => format('bold')} />
          <Tool icon="italic" label="Italic" shortcut="I" pressed={state.italic} onClick={() => format('italic')} />
          <Tool icon="underline" label="Underline" shortcut="U" pressed={state.underline} onClick={() => format('underline')} />
          <Tool icon="strikethrough" label="Strike" shortcut="Shift+X" pressed={state.strikethrough} onClick={() => format('strikethrough')} />
        </div>

        <div className="md-group" role="group" aria-label="Style">
          <Choice icon="type" label="Font" value={state.font} options={FONTS} emptyLabel="Default font" onChoose={(v) => format('font', v)} />
          <Choice icon="a-large-small" label="Size" value={state.size} options={SIZES} emptyLabel="Normal size" onChoose={(v) => format('size', v)} />
          <Choice icon="baseline" label="Text colour" value={state.color} options={TEXT_COLORS} emptyLabel="Default colour" onChoose={(v) => format('color', v)} />
          <Choice icon="highlighter" label="Highlight" value={state.highlight} options={HIGHLIGHTS} emptyLabel="No highlight" onChoose={(v) => format('highlight', v)} />
          <Tool icon="remove-formatting" label="Clear" onClick={() => format('clear')} />
        </div>

        <div className="md-group" role="group" aria-label="Structure">
          <Tool icon="list" label="Bullets" pressed={state.bulletList} onClick={() => format('bulletList')} />
          <Tool icon="list-ordered" label="Numbers" pressed={state.numberedList} onClick={() => format('numberedList')} />
          <Tool icon="indent-increase" label="Indent" disabled={!state.bulletList && !state.numberedList} onClick={() => format('indent')} />
          <Tool icon="indent-decrease" label="Outdent" disabled={!state.bulletList && !state.numberedList} onClick={() => format('outdent')} />
          <Tool icon="text-quote" label="Quote" pressed={state.quote} onClick={() => format('quote')} />
          <Tool icon="minus" label="Separator" onClick={() => format('separator')} />
          <Choice icon="align-left" label="Alignment" value={state.align} options={ALIGNMENTS} emptyLabel="Align left" onChoose={(v) => format('align', v)} />
        </div>

        <div className="md-group" role="group" aria-label="Insert">
          <Tool icon="link" label={state.link ? 'Edit link' : 'Link'} shortcut="K" pressed={state.link} onClick={() => format('editLink')} />
          <Tool icon="unlink" label="Unlink" disabled={!state.link} onClick={() => format('removeLink')} />
          <Tool icon="code" label="Code" pressed={state.code} onClick={() => format('code')} />
          <label className="md-choice" title={state.codeLanguage !== null ? 'Language of this code block' : 'Insert a code block'}>
            <Icon name="square-code" size={16} />
            <span className="visually-hidden">{state.codeLanguage !== null ? 'Language of this code block' : 'Insert a code block in a language'}</span>
            <select value={state.codeLanguage ?? ''} onChange={(event) => event.target.value && format('codeBlock', event.target.value)}>
              <option value="">{state.codeLanguage !== null ? 'Plain code' : 'Code block…'}</option>
              {CODE_LANGUAGES.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <Tool icon="image" label="Image" pressed={Boolean(imageForm)} onClick={() => setImageForm(imageForm ? null : { url: '', alt: '', failed: false })} />
        </div>
      </div>

      {imageForm && (
        <form className="md-image-form" onSubmit={insertImage} aria-label="Insert an image">
          <div className="md-image-fields">
            <label>
              Image address (URL)
              <input type="url" inputMode="url" placeholder="https://example.com/diagram.png" value={imageForm.url} onChange={(event) => setImageForm({ ...imageForm, url: event.target.value, failed: false })} />
            </label>
            <label>
              Description for screen readers
              <input type="text" placeholder="What the image shows" value={imageForm.alt} onChange={(event) => setImageForm({ ...imageForm, alt: event.target.value })} />
            </label>
          </div>
          {previewUrl && previewUrl === typedUrl && !imageForm.failed && <img className="md-image-preview" src={previewUrl} alt="Preview of the image" referrerPolicy="no-referrer" onError={() => setImageForm((current) => (current ? { ...current, failed: true } : current))} />}
          {imageUrlValid && imageForm.failed && <p className="field-error">This image could not be loaded. Check the address.</p>}
          <div className="md-image-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setImageForm(null)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={!imageUrlValid || imageForm.failed}>
              Insert image
            </button>
          </div>
        </form>
      )}

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
        onSelect={readSelection}
        placeholder={'Write your article in Markdown.\n\n## A heading\n\nSome **bold** text, a [link](https://example.com) and code:\n\n```js\nconsole.log("hello");\n```'}
        spellCheck="true"
        aria-invalid={invalid ? 'true' : 'false'}
        aria-describedby={describedBy}
      />
    </div>
  );
}
