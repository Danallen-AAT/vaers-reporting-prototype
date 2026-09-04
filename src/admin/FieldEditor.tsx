// ---------------------------------------------------------------------------
// Per-field editor. A CDC program person edits wording/requiredness here; the
// change flows into the config store and the live preview re-renders at once.
//
// The editor is aware of which reporter path is being previewed. Without that,
// an author previewing the provider path can edit the public label, see nothing
// happen, and reasonably conclude the editor is broken. Nothing is hidden;
// fields and inputs that do not affect the current preview are marked instead.
// ---------------------------------------------------------------------------
import { useState } from 'react';
import type { FieldConfig, RequiredRule } from '../config/types';
import { ConfirmAction } from '../components/ConfirmAction';
import { useConfig, type FieldOverride } from '../state/ConfigStore';
import { fieldKey } from '../config/locale';
import { TranslationField } from './TranslationField';
import { OptionTranslations } from './OptionTranslations';
import { allFields, conditionFor, conditionText, eligibleControllers } from './conditions';

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
  const {
    draftConfig: config,
    setFieldOverride,
    resetField,
    isFieldModified,
    isFieldAdded,
    updateAddedField,
    removeAddedField,
    setFieldCondition,
    moveField,
    sectionOf,
    isFieldMoved,
  } = useConfig();
  const modified = isFieldModified(field.id);
  const added = isFieldAdded(field.id);
  const patch = (p: FieldOverride & Partial<Omit<FieldConfig, 'id'>>): void =>
    added ? updateAddedField(field.id, p) : setFieldOverride(field.id, p);
  const cond = field.visibleWhen?.[0];
  const controllerField = cond
    ? allFields(config).find((x) => x.field.id === cond.field)?.field
    : undefined;
  // The reporter-type selector is the instrument's root and never conditional.
  // Compound rules (multiple conditions, or a suppression rule) stay governed
  // configuration changes; the editor covers the single-condition rules that
  // make up the base schema's branching (Amendment 1 Q&A 165).
  const conditionEditable =
    field.id !== 'reporterType' &&
    !field.suppressWhen?.length &&
    (field.visibleWhen?.length ?? 0) <= 1;
  // A refused rule change, explained where the author is looking.
  const [refused, setRefused] = useState<string | null>(null);
  const showPublic = field.path !== 'provider';

  // Does this field appear at all in the path currently being previewed?
  const inPreview = field.path === 'both' || field.path === previewPath;

  // Which wording is actually rendered right now. On the public path the
  // renderer falls back to the clinical label when no public variant is set.
  const publicLabelIsLive = previewPath === 'public' && Boolean(field.publicLabel);
  const publicHelpIsLive = previewPath === 'public' && Boolean(field.publicHelpText);
  const publicTooltipIsLive = previewPath === 'public' && Boolean(field.publicTooltip);

  const liveMark = (isLive: boolean) =>
    inPreview && isLive ? <span className="live-dot" title="Showing in the preview">in preview</span> : null;

  return (
    <fieldset className={`field-editor${inPreview ? '' : ' out-of-view'}`}>
      <legend className="fe-legend">
        <span className="fe-title">{field.label || '(no label)'}</span>
        <code className="fe-id">{field.id}</code>
        <span className={`badge badge-path path-${field.path}`}>{PATH_LABEL[field.path]}</span>
        {added && <span className="badge badge-added">Added here</span>}
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
            onChange={(e) => patch({ label: e.target.value })}
          />
        </label>
        <TranslationField
          tKey={fieldKey(field.id, 'label')}
          english={field.label}
          caption="Label"
          describes={field.id}
        />

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
              onChange={(e) => patch({ publicLabel: e.target.value })}
            />
          </label>
        )}
        {showPublic && (
          <TranslationField
            tKey={fieldKey(field.id, 'publicLabel')}
            english={field.publicLabel}
            caption="Public label"
            describes={field.id}
          />
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
            onChange={(e) => patch({ helpText: e.target.value })}
          />
        </label>
        <TranslationField
          tKey={fieldKey(field.id, 'helpText')}
          english={field.helpText}
          caption="Help text"
          describes={field.id}
          multiline
        />

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
              onChange={(e) => patch({ publicHelpText: e.target.value })}
            />
          </label>
        )}
        {showPublic && (
          <TranslationField
            tKey={fieldKey(field.id, 'publicHelpText')}
            english={field.publicHelpText}
            caption="Public help text"
            describes={field.id}
            multiline
          />
        )}

        <label className="fe-row">
          <span className="fe-cap">
            Tooltip {liveMark(!publicTooltipIsLive && Boolean(field.tooltip))}
          </span>
          <input
            className="fe-input"
            aria-label={`Tooltip for ${field.id}`}
            placeholder="(none)"
            value={field.tooltip ?? ''}
            onChange={(e) => patch({ tooltip: e.target.value })}
          />
        </label>
        <TranslationField
          tKey={fieldKey(field.id, 'tooltip')}
          english={field.tooltip}
          caption="Tooltip"
          describes={field.id}
          multiline
        />

        {showPublic && (
          <label className="fe-row">
            <span className="fe-cap">
              Public tooltip {liveMark(publicTooltipIsLive)}
            </span>
            <input
              className="fe-input"
              aria-label={`Public tooltip for ${field.id}`}
              placeholder="(uses the clinical tooltip)"
              value={field.publicTooltip ?? ''}
              onChange={(e) => patch({ publicTooltip: e.target.value })}
            />
          </label>
        )}
        {showPublic && (
          <TranslationField
            tKey={fieldKey(field.id, 'publicTooltip')}
            english={field.publicTooltip}
            caption="Public tooltip"
            describes={field.id}
            multiline
          />
        )}

        {/* Every answer a reporter can choose is a label too, so a choice
            question is only translated when its choices are. */}
        <OptionTranslations field={field} />

        <label className="fe-row">
          <span className="fe-cap">Required</span>
          <select
            className="fe-input fe-select"
            aria-label={`Required setting for ${field.id}`}
            value={requiredValue(field.required)}
            onChange={(e) => patch({ required: fromRequiredValue(e.target.value) })}
          >
            <option value="required">Required</option>
            <option value="optional">Optional</option>
            <option value="conditional">Conditional (when shown)</option>
          </select>
        </label>

        {field.id !== 'reporterType' && (
        <label className="fe-row">
          <span className="fe-cap">Section</span>
          <select
            className="fe-input fe-select"
            aria-label={`Section for ${field.id}`}
            value={sectionOf(field.id) ?? ''}
            onChange={(e) => setRefused(moveField(field.id, e.target.value).reason ?? null)}
          >
            {config.sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
        </label>
        )}
        {isFieldMoved(field.id) && (
          <p className="fe-note">Moved from the section it shipped in. Revert returns it.</p>
        )}

        {conditionEditable && (
          <label className="fe-row">
            <span className="fe-cap">Shown</span>
            <select
              className="fe-input fe-select"
              aria-label={`Visibility rule for ${field.id}`}
              value={field.visibleWhen?.length ? 'when' : 'always'}
              onChange={(e) => {
                if (e.target.value === 'always') {
                  setRefused(setFieldCondition(field.id, null).reason ?? null);
                } else {
                  const first = eligibleControllers(config, field.id)[0];
                  if (first?.field.options?.length) {
                    const r = setFieldCondition(field.id, [
                      conditionFor(first.field, first.field.options[0].value),
                    ]);
                    setRefused(r.reason ?? null);
                  }
                }
              }}
            >
              <option value="always">Always</option>
              <option value="when">Only when another answer matches</option>
            </select>
          </label>
        )}

        {refused && (
          <p className="fe-refused" role="alert">
            <strong>Change not applied.</strong> {refused}
          </p>
        )}

        {conditionEditable && cond && (
          <>
            <label className="fe-row">
              <span className="fe-cap">Controlling question</span>
              <select
                className="fe-input"
                aria-label={`Controlling question for ${field.id}`}
                value={cond.field}
                onChange={(e) => {
                  const ctl = eligibleControllers(config, field.id).find(
                    (c) => c.field.id === e.target.value,
                  )?.field;
                  if (ctl?.options?.length) {
                    const r = setFieldCondition(field.id, [
                      conditionFor(ctl, ctl.options[0].value),
                    ]);
                    setRefused(r.reason ?? null);
                  }
                }}
              >
                {eligibleControllers(config, field.id).map(({ field: f, sectionTitle }) => (
                  <option key={f.id} value={f.id}>
                    {sectionTitle}: {f.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="fe-row">
              <span className="fe-cap">Shown when the answer is</span>
              <select
                className="fe-input"
                aria-label={`Controlling answer for ${field.id}`}
                value={cond.equals ?? cond.includes ?? ''}
                onChange={(e) => {
                  if (controllerField) {
                    const r = setFieldCondition(field.id, [
                      conditionFor(controllerField, e.target.value),
                    ]);
                    setRefused(r.reason ?? null);
                  }
                }}
              >
                {(controllerField?.options ?? []).map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}

        {conditionText(config, field) && (
          <p className="fe-cond">{conditionText(config, field)}</p>
        )}
      </div>

      <div className="fe-actions">
        {added ? (
          <ConfirmAction
            triggerLabel="Remove this question"
            prompt={`Removing "${field.label}" deletes the question from the form.`}
            confirmLabel="Remove it"
            cancelLabel="Keep it"
            triggerClass="btn btn-link btn-danger"
            fallbackFocusId="main"
            onConfirm={() => removeAddedField(field.id)}
          />
        ) : (
          <button
            type="button"
            className="btn btn-link"
            disabled={!modified}
            onClick={() => resetField(field.id)}
          >
            Revert this field
          </button>
        )}
      </div>
    </fieldset>
  );
}
