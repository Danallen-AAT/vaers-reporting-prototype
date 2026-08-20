// ---------------------------------------------------------------------------
// Per-field editor. A CDC program person edits wording/requiredness here; the
// change flows into the config store and the live preview re-renders at once.
//
// The editor is aware of which reporter path is being previewed. Without that,
// an author previewing the provider path can edit the public label, see nothing
// happen, and reasonably conclude the editor is broken. Nothing is hidden;
// fields and inputs that do not affect the current preview are marked instead.
// ---------------------------------------------------------------------------
import type { FieldConfig, RequiredRule } from '../config/types';
import { useConfig } from '../state/ConfigStore';

function requiredValue(r?: RequiredRule): 'required' | 'optional' | 'conditional' {
  return r === true ? 'required' : r === 'conditional' ? 'conditional' : 'optional';
}
function fromRequiredValue(v: string): RequiredRule {
  return v === 'required' ? true : v === 'conditional' ? 'conditional' : false;
}

const PATH_LABEL: Record<string, string> = {
  both: 'Both paths',
  public: 'Public only',
  provider: 'Provider only',
};

export function FieldEditor({
  field,
  previewPath,
}: {
  field: FieldConfig;
  previewPath: 'public' | 'provider';
}) {
  const { setFieldOverride, resetField, isFieldModified } = useConfig();
  const modified = isFieldModified(field.id);
  const showPublic = field.path !== 'provider';

  // Does this field appear at all in the path currently being previewed?
  const inPreview = field.path === 'both' || field.path === previewPath;

  // Which wording is actually rendered right now. On the public path the
  // renderer falls back to the clinical label when no public variant is set.
  const publicLabelIsLive = previewPath === 'public' && Boolean(field.publicLabel);
  const publicHelpIsLive = previewPath === 'public' && Boolean(field.publicHelpText);

  const liveMark = (isLive: boolean) =>
    inPreview && isLive ? <span className="live-dot" title="Showing in the preview">in preview</span> : null;

  return (
    <fieldset className={`field-editor${inPreview ? '' : ' out-of-view'}`}>
      <legend className="fe-legend">
        <span className="fe-title">{field.label || '(no label)'}</span>
        <code className="fe-id">{field.id}</code>
        <span className={`badge badge-path path-${field.path}`}>{PATH_LABEL[field.path]}</span>
        {modified && <span className="badge badge-mod">Modified</span>}
      </legend>

      {!inPreview && (
        <p className="fe-outnote">
          Not shown in the {previewPath === 'public' ? 'public' : 'provider'} preview. Still editable.
        </p>
      )}

      <div className="fe-grid">
        <label className="fe-row">
          <span className="fe-cap">
            Label {liveMark(!publicLabelIsLive)}
          </span>
          <input
            className="fe-input"
            aria-label={`Label for ${field.id}`}
            value={field.label}
            onChange={(e) => setFieldOverride(field.id, { label: e.target.value })}
          />
        </label>

        {showPublic && (
          <label className="fe-row">
            <span className="fe-cap">
              Public label {liveMark(publicLabelIsLive)}
            </span>
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
          <span className="fe-cap">
            Help text {liveMark(!publicHelpIsLive && Boolean(field.helpText))}
          </span>
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
            <span className="fe-cap">
              Public help text {liveMark(publicHelpIsLive)}
            </span>
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
