// ---------------------------------------------------------------------------
// Per-field editor. A CDC program person edits wording/requiredness here; the
// change flows into the config store and the live preview re-renders at once.
// Inputs carry per-field aria-labels so each control is uniquely addressable.
// ---------------------------------------------------------------------------
import type { FieldConfig, RequiredRule } from '../config/types';
import { useConfig } from '../state/ConfigStore';

function requiredValue(r?: RequiredRule): 'required' | 'optional' | 'conditional' {
  return r === true ? 'required' : r === 'conditional' ? 'conditional' : 'optional';
}
function fromRequiredValue(v: string): RequiredRule {
  return v === 'required' ? true : v === 'conditional' ? 'conditional' : false;
}

export function FieldEditor({ field }: { field: FieldConfig }) {
  const { setFieldOverride, resetField, isFieldModified } = useConfig();
  const modified = isFieldModified(field.id);
  const showPublic = field.path !== 'provider';

  return (
    <fieldset className="field-editor">
      <legend className="fe-legend">
        <span className="fe-title">{field.label || '(no label)'}</span>
        <code className="fe-id">{field.id}</code>
        {modified && <span className="badge badge-mod">Modified</span>}
      </legend>

      <div className="fe-grid">
        <label className="fe-row">
          <span className="fe-cap">Label</span>
          <input
            className="fe-input"
            aria-label={`Label for ${field.id}`}
            value={field.label}
            onChange={(e) => setFieldOverride(field.id, { label: e.target.value })}
          />
        </label>

        {showPublic && (
          <label className="fe-row">
            <span className="fe-cap">Public label</span>
            <input
              className="fe-input"
              aria-label={`Public label for ${field.id}`}
              placeholder="(uses the clinical label)"
              value={field.publicLabel ?? ''}
              onChange={(e) => setFieldOverride(field.id, { publicLabel: e.target.value })}
            />
          </label>
        )}

        <label className="fe-row">
          <span className="fe-cap">Help text</span>
          <input
            className="fe-input"
            aria-label={`Help text for ${field.id}`}
            placeholder="(none)"
            value={field.helpText ?? ''}
            onChange={(e) => setFieldOverride(field.id, { helpText: e.target.value })}
          />
        </label>

        {showPublic && (
          <label className="fe-row">
            <span className="fe-cap">Public help text</span>
            <input
              className="fe-input"
              aria-label={`Public help text for ${field.id}`}
              placeholder="(uses the clinical help text)"
              value={field.publicHelpText ?? ''}
              onChange={(e) => setFieldOverride(field.id, { publicHelpText: e.target.value })}
            />
          </label>
        )}

        <label className="fe-row">
          <span className="fe-cap">Required</span>
          <select
            className="fe-input fe-select"
            aria-label={`Required setting for ${field.id}`}
            value={requiredValue(field.required)}
            onChange={(e) => setFieldOverride(field.id, { required: fromRequiredValue(e.target.value) })}
          >
            <option value="required">Required</option>
            <option value="optional">Optional</option>
            <option value="conditional">Conditional (when shown)</option>
          </select>
        </label>
      </div>

      <div className="fe-actions">
        <button
          type="button"
          className="btn btn-link"
          disabled={!modified}
          onClick={() => resetField(field.id)}
        >
          Revert this field
        </button>
      </div>
    </fieldset>
  );
}
