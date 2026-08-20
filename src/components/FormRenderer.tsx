// ---------------------------------------------------------------------------
// Renders the live form entirely from config: the engine decides which sections
// and fields are visible for the current answers, this component just draws
// them. Section headings switch to plain-language titles on the public path.
//
// Sections marked repeatable in the schema render one group per instance with
// add and remove controls, which VAERS needs because several vaccines are
// commonly given at a single visit.
// ---------------------------------------------------------------------------
import { useEffect, useRef, useState } from 'react';
import { useForm } from '../state/FormContext';
import { getVisibleForm } from '../formEngine/visibility';
import { buildStructuredOutput } from '../formEngine/output';
import { repeatFieldId, type FieldConfig, type SectionConfig } from '../config/types';
import { Field } from './Field';
import { DocSuggestions } from './DocSuggestions';
import { SurveyDialog } from './SurveyDialog';

export function FormRenderer() {
  const {
    config,
    values,
    activePath,
    submitted,
    errors,
    validate,
    reset,
    addInstance,
    removeInstance,
  } = useForm();
  const sections = getVisibleForm(config, values);
  const isPublic = activePath === 'public';
  const errorCount = Object.keys(errors).length;

  const summaryRef = useRef<HTMLDivElement>(null);
  const [showOutput, setShowOutput] = useState(false);
  const [surveyOpen, setSurveyOpen] = useState(false);

  useEffect(() => {
    if (submitted && errorCount > 0) summaryRef.current?.focus();
  }, [submitted, errorCount]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const ok = validate();
    setShowOutput(ok);
    if (ok) setSurveyOpen(true);
  };

  const labelOf = (f: FieldConfig) => (isPublic && f.publicLabel ? f.publicLabel : f.label);

  const downloadOutput = () => {
    const blob = new Blob([JSON.stringify(buildStructuredOutput(config, values), null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'vaers-submission.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderFields = (fields: FieldConfig[], instance = 0) =>
    fields.map((field) => <Field key={field.id} field={field} instance={instance} />);

  const renderRepeatable = (section: SectionConfig, fields: FieldConfig[], instances: number) => (
    <>
      {Array.from({ length: instances }).map((_, i) => (
        <fieldset className="repeat-item" key={i}>
          <legend className="repeat-legend">
            {section.repeat!.itemLabel} {i + 1}
            {instances > section.repeat!.min && (
              <button
                type="button"
                className="btn btn-link btn-danger repeat-remove"
                onClick={() => removeInstance(section, i)}
              >
                Remove
                <span className="sr-only">
                  {' '}
                  {section.repeat!.itemLabel} {i + 1}
                </span>
              </button>
            )}
          </legend>
          <div className="fields">{renderFields(fields, i)}</div>
        </fieldset>
      ))}
      {instances < section.repeat!.max && (
        <button type="button" className="btn btn-outline repeat-add" onClick={() => addInstance(section)}>
          + {section.repeat!.addLabel}
        </button>
      )}
    </>
  );

  return (
    <form className="vaers-form" onSubmit={onSubmit} noValidate>
      {activePath && (
        <div className="path-banner" role="status">
          <span className="path-badge">
            {isPublic ? 'Public reporter' : 'Healthcare provider'}
          </span>
          <span className="path-note">Wording and fields are tailored to this path.</span>
          <button
            type="button"
            className="btn btn-link"
            onClick={() => {
              reset();
              setShowOutput(false);
            }}
          >
            Change
          </button>
        </div>
      )}

      {sections.map(({ section, fields, instances }) => {
        const title = isPublic && section.publicTitle ? section.publicTitle : section.title;
        const desc =
          isPublic && section.publicDescription ? section.publicDescription : section.description;
        return (
          <section className="form-section" key={section.id} aria-labelledby={`${section.id}-heading`}>
            <h2 id={`${section.id}-heading`} className="section-title">
              {title}
            </h2>
            {desc && <p className="section-desc">{desc}</p>}
            {section.repeat ? (
              renderRepeatable(section, fields, instances)
            ) : (
              <div className="fields">{renderFields(fields)}</div>
            )}
            {section.id === 'attachments' && <DocSuggestions />}
          </section>
        );
      })}

      {submitted && errorCount > 0 && (
        <div
          className="error-summary"
          role="alert"
          tabIndex={-1}
          ref={summaryRef}
          aria-labelledby="error-summary-title"
        >
          <p id="error-summary-title" className="error-summary-title">
            There {errorCount === 1 ? 'is' : 'are'} {errorCount}{' '}
            {errorCount === 1 ? 'problem' : 'problems'} to fix:
          </p>
          <ul>
            {sections.flatMap(({ section, fields, instances }) =>
              Array.from({ length: instances }).flatMap((_, i) =>
                fields
                  .filter((f) => errors[repeatFieldId(f.id, i)])
                  .map((f) => {
                    const key = repeatFieldId(f.id, i);
                    const suffix = section.repeat ? ` (${section.repeat.itemLabel} ${i + 1})` : '';
                    return (
                      <li key={key}>
                        <a href={`#${key}`}>
                          {labelOf(f)}
                          {suffix}: {errors[key]}
                        </a>
                      </li>
                    );
                  }),
              ),
            )}
          </ul>
        </div>
      )}

      {activePath && (
        <div className="form-actions">
          <button type="submit" className="btn btn-primary">
            Review submission
          </button>
        </div>
      )}

      {showOutput && errorCount === 0 && (
        <section className="structured-output" aria-labelledby="output-heading">
          <h2 id="output-heading" className="section-title">
            Structured output (VAERS-compatible)
          </h2>
          <p className="section-desc">
            On submit the form emits clean structured JSON mapped to VAERS data
            elements, demonstrating integration-readiness. Nothing is stored or
            transmitted in this prototype.
          </p>
          <div className="form-actions output-actions">
            <button type="button" className="btn btn-outline" onClick={downloadOutput}>
              Download JSON
            </button>
          </div>
          <pre className="json-preview" aria-label="Structured submission data">
            {JSON.stringify(buildStructuredOutput(config, values), null, 2)}
          </pre>
        </section>
      )}

      <SurveyDialog
        open={surveyOpen}
        onClose={() => setSurveyOpen(false)}
        survey={config.surveys.postSubmission}
      />
    </form>
  );
}
