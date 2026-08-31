// ---------------------------------------------------------------------------
// Point-and-click question creation (Task 1.8, PRS#8). The administrator names
// the question, picks its type and audience, lists its choices where the type
// has choices, and the new question joins the section's configuration exactly
// as if it had shipped with the schema: the same renderer draws it, the same
// validation applies, and the structured output carries it, reported openly as
// unmapped until an analyst maps it to a VAERS element. No developer, no
// build, no deployment.
// ---------------------------------------------------------------------------
import { useRef, useState } from 'react';
import type { FieldType, ReporterPath, SectionConfig } from '../config/types';
import { useConfig } from '../state/ConfigStore';

const TYPES: { value: FieldType; label: string; hasOptions: boolean }[] = [
  { value: 'text', label: 'Short answer', hasOptions: false },
  { value: 'textarea', label: 'Paragraph', hasOptions: false },
  { value: 'radio', label: 'Choose one (buttons)', hasOptions: true },
  { value: 'select', label: 'Choose one (dropdown)', hasOptions: true },
  { value: 'checkbox', label: 'Checkboxes, choose any', hasOptions: true },
  { value: 'date', label: 'Date', hasOptions: false },
  { value: 'number', label: 'Number', hasOptions: false },
];

export function AddQuestion({ section }: { section: SectionConfig }) {
  const { addField } = useConfig();
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [type, setType] = useState<FieldType>('text');
  const [path, setPath] = useState<ReporterPath>('both');
  const [required, setRequired] = useState(false);
  const [helpText, setHelpText] = useState('');
  const [optionsText, setOptionsText] = useState('');
  const [error, setError] = useState('');
  const [announce, setAnnounce] = useState('');
  const labelRef = useRef<HTMLInputElement>(null);

  const needsOptions = TYPES.find((t) => t.value === type)?.hasOptions ?? false;

  const reset = () => {
    setLabel('');
    setType('text');
    setPath('both');
    setRequired(false);
    setHelpText('');
    setOptionsText('');
    setError('');
  };

  const submit = () => {
    if (!label.trim()) {
      setError('Give the question a label.');
      labelRef.current?.focus();
      return;
    }
    const options = optionsText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((lab) => ({
        value: lab.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || lab,
        label: lab,
      }));
    if (needsOptions && options.length < 2) {
      setError('List at least two choices, one per line.');
      return;
    }
    addField(section.id, {
      label: label.trim(),
      type,
      path,
      required: required ? true : undefined,
      helpText: helpText.trim() || undefined,
      options: needsOptions ? options : undefined,
    });
    setAnnounce(`Question "${label.trim()}" added to ${section.title}.`);
    reset();
    setOpen(false);
  };

  return (
    <div className="add-question">
      <div aria-live="polite" className="sr-only">
        {announce}
      </div>
      {!open ? (
        <button type="button" className="btn btn-outline" onClick={() => setOpen(true)}>
          + Add a question to {section.title}
        </button>
      ) : (
        <fieldset className="field-editor aq-form">
          <legend className="fe-legend">
            <span className="fe-title">New question in {section.title}</span>
          </legend>
          <div className="fe-grid">
            <label className="fe-row">
              <span className="fe-cap">Question label</span>
              <input
                ref={labelRef}
                className="fe-input"
                aria-label={`Label for the new question in ${section.id}`}
                value={label}
                onChange={(e) => setLabel(e.target.value)}
              />
            </label>
            <label className="fe-row">
              <span className="fe-cap">Answer type</span>
              <select
                className="fe-input"
                aria-label={`Answer type for the new question in ${section.id}`}
                value={type}
                onChange={(e) => setType(e.target.value as FieldType)}
              >
                {TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
            {needsOptions && (
              <label className="fe-row">
                <span className="fe-cap">Choices, one per line</span>
                <textarea
                  className="fe-input"
                  rows={3}
                  aria-label={`Choices for the new question in ${section.id}`}
                  value={optionsText}
                  onChange={(e) => setOptionsText(e.target.value)}
                />
              </label>
            )}
            <label className="fe-row">
              <span className="fe-cap">Asked on</span>
              <select
                className="fe-input"
                aria-label={`Reporter paths for the new question in ${section.id}`}
                value={path}
                onChange={(e) => setPath(e.target.value as ReporterPath)}
              >
                <option value="both">Both paths</option>
                <option value="public">Public only</option>
                <option value="provider">Provider only</option>
              </select>
            </label>
            <label className="fe-row">
              <span className="fe-cap">Help text</span>
              <input
                className="fe-input"
                placeholder="(none)"
                aria-label={`Help text for the new question in ${section.id}`}
                value={helpText}
                onChange={(e) => setHelpText(e.target.value)}
              />
            </label>
            <label className="fe-row fe-check">
              <input
                type="checkbox"
                checked={required}
                aria-label={`Required for the new question in ${section.id}`}
                onChange={(e) => setRequired(e.target.checked)}
              />
              <span className="fe-cap">Required</span>
            </label>
            {error && (
              <p className="field-error" role="alert">
                {error}
              </p>
            )}
            <div className="fe-actions">
              <button type="button" className="btn btn-primary btn-small" onClick={submit}>
                Add question
              </button>
              <button
                type="button"
                className="btn btn-outline btn-small"
                onClick={() => {
                  reset();
                  setOpen(false);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </fieldset>
      )}
    </div>
  );
}
