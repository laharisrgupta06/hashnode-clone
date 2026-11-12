import { useId, useState } from 'react';
import Icon from '../common/Icon.jsx';
import { normalizeTag, validateTag, MAX_TAGS } from '../../utils/validation.js';

// Pick existing tags or create new ones while writing (PRD 2.1.C). Type a tag and press Enter
// (or comma, or the Add button). Existing tags are offered as suggestions. Backspace in an empty
// box removes the last tag. New tags are created by the server when the article is saved.
export default function TagInput({ tags, onChange, suggestions = [] }) {
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const listId = useId();
  const errorId = useId();
  const hintId = useId();

  // Adds tag names one by one; stops at the first invalid one and shows why.
  // Returns the text that could not be added (so it stays in the box for fixing).
  const addNames = (rawNames) => {
    let next = tags;
    for (let i = 0; i < rawNames.length; i++) {
      const name = normalizeTag(rawNames[i]);
      if (!name) continue;
      const problem = validateTag(name, next);
      if (problem) {
        if (next !== tags) onChange(next);
        setError(problem);
        return rawNames.slice(i).join(', ');
      }
      next = [...next, name];
    }
    if (next !== tags) onChange(next);
    setError('');
    return '';
  };

  const add = () => setInput(addNames([input]));

  // A comma finishes a tag. Handled on the TEXT (not the key) so it also works for pasted lists
  // ("react, node") and on phone keyboards, which often do not report which key was pressed.
  const handleChange = (value) => {
    if (!value.includes(',')) {
      setInput(value);
      setError('');
      return;
    }
    const parts = value.split(',');
    const unfinished = parts.pop(); // text after the last comma: still being typed
    const leftover = addNames(parts);
    setInput(leftover ? `${leftover}, ${unfinished}`.replace(/,\s*$/, '') : unfinished.trimStart());
  };

  const remove = (name) => {
    onChange(tags.filter((tag) => tag !== name));
    setError('');
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      add();
    } else if (event.key === 'Backspace' && !input && tags.length > 0) {
      remove(tags[tags.length - 1]);
    }
  };

  const available = suggestions.filter((name) => !tags.includes(name));
  const full = tags.length >= MAX_TAGS;

  return (
    <div className="field">
      <label htmlFor="tag-input">Tags</label>
      {tags.length > 0 && (
        <ul className="tag-chips" aria-label="Selected tags">
          {tags.map((tag) => (
            <li key={tag} className="tag-chip">
              <span>#{tag}</span>
              <button type="button" onClick={() => remove(tag)} aria-label={`Remove tag ${tag}`}>
                <Icon name="close" size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="inline-input">
        <input
          id="tag-input"
          type="text"
          list={listId}
          value={input}
          disabled={full}
          placeholder={full ? `Maximum of ${MAX_TAGS} tags reached` : 'e.g. javascript'}
          onChange={(event) => handleChange(event.target.value)}
          onKeyDown={handleKeyDown}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={[error && errorId, hintId].filter(Boolean).join(' ')}
          autoComplete="off"
        />
        <button type="button" className="btn btn-secondary" onClick={add} disabled={full || !input.trim()}>
          Add
        </button>
      </div>
      <datalist id={listId}>
        {available.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>
      <p className="field-hint" id={hintId}>
        Press Enter or type a comma to add. Up to {MAX_TAGS} tags; new tags are created when you save.
      </p>
      {error && (
        <p className="field-error" id={errorId} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
