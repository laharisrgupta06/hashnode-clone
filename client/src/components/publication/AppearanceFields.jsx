import { ACCENTS, FONT_PRESETS, LAYOUTS } from '../../utils/publication.js';

// The curated appearance choices for a publication website: accent colour, typography, layout.
// Native radio groups, so they work with keyboard (arrow keys), touch and screen readers.
export default function AppearanceFields({ appearance, onChange, idPrefix = 'appearance' }) {
  const set = (key) => (event) => onChange({ ...appearance, [key]: event.target.value });

  return (
    <div className="appearance-fields">
      <fieldset className="choice-group">
        <legend>Accent colour</legend>
        <div className="swatch-row">
          {ACCENTS.map((accent) => (
            <label key={accent.value} className="swatch-choice">
              <input type="radio" name={`${idPrefix}-accent`} value={accent.value} checked={appearance.accentColor === accent.value} onChange={set('accentColor')} />
              <span className="swatch-dot" style={{ background: accent.value }} aria-hidden="true" />
              <span className="swatch-label">{accent.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="choice-group">
        <legend>Typography</legend>
        <div className="option-row">
          {FONT_PRESETS.map((preset) => (
            <label key={preset.value} className="option-choice">
              <input type="radio" name={`${idPrefix}-font`} value={preset.value} checked={appearance.fontPreset === preset.value} onChange={set('fontPreset')} />
              <span>
                <strong className={`font-sample font-${preset.value}`}>{preset.label}</strong>
                <small>{preset.hint}</small>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="choice-group">
        <legend>Article layout</legend>
        <div className="option-row">
          {LAYOUTS.map((layout) => (
            <label key={layout.value} className="option-choice">
              <input type="radio" name={`${idPrefix}-layout`} value={layout.value} checked={appearance.layout === layout.value} onChange={set('layout')} />
              <span>
                <strong>{layout.label}</strong>
                <small>{layout.hint}</small>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  );
}
