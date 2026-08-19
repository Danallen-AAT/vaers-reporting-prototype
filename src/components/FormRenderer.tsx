// ---------------------------------------------------------------------------
// Renders the live form entirely from config: the engine decides which sections
// and fields are visible for the current answers, this component just draws
// them. Section headings switch to plain-language titles on the public path.
// ---------------------------------------------------------------------------
import { useEffect, useRef, useState } from 'react';
import { useForm } from '../state/FormContext';
import { getVisibleForm } from '../formEngine/visibility';
import { buildStructuredOutput } from '../formEngine/output';
import { Field } from './Field';
import { DocSuggestions } from './DocSuggestions';
import { SatisfactionSurvey } from './SatisfactionSurvey';

export function FormRenderer() {
  const { config, values, activePath, submitted, errors, validate, reset } = useForm();
  const sections = getVisibleForm(config, values);
  const isPublic = activePath === 'public';
  const errorCount = Object.keys(errors).length;

  const summaryRef = useRef<HTMLDivElement>(null);
  const [showOutput, setShowOutput] = useState(false);
  const [surveyOpen, setSurveyOpen] = useState(false);

  // Move focus to the error summary when a submit attempt fails (a11y).
  useEffect(() => {
    if (submitted && errorCount > 0) summaryRef.current?.focus();
  }, [submitted, errorCount]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const ok = validate();
    setShowOutput(ok);
    // Satisfaction survey follows a successful submission (PWS 1.7).
    if (ok) setSurveyOpen(true);
  };

  return (
    <form className="vaers-form" onSubmit={onSubmit} noValidate>
      {activePath && (
        <div className="path-banner" role="status">
          <span className="path-badge">
            {isPublic ? 'Public reporter' : 'Healthcare provider'}
          </span>
          <span className="path-note">
            Wording and fields are tailored to this path.
          </span>
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

      {sections.map(({ section, fields }) => {
        const title = isPublic && section.publicTitle ? section.publicTitle : section.title;
        const desc =
          isPublic && section.publicDescription
            ? section.publicDescription
            : section.description;
        return (
          <section
            className="form-section"
            key={section.id}
            aria-labelledby={`${section.id}-heading`}
          >
            <h2 id={`${section.id}-heading`} className="section-title">
              {title}
            </h2>
            {desc && <p className="section-desc">{desc}</p>}
            <div className="fields">
              {fields.map((field) => (
                <Field key={field.id} field={field} />
              ))}
            </div>
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
            {sections.flatMap(({ fields }) =>
              fields
                .filter((f) => errors[f.id])
                .map((f) => (
                  <li key={f.id}>
                    <a href={`#${f.id}`}>
                      {(isPublic && f.publicLabel ? f.publicLabel : f.label)}: {errors[f.id]}
                    </a>
                  </li>
                )),
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
          <pre className="json-preview" aria-label="Structured submission data">
            {JSON.stringify(buildStructuredOutput(config, values), null, 2)}
          </pre>
        </section>
      )}

      <SatisfactionSurvey open={surveyOpen} onClose={() => setSurveyOpen(false)} />
    </form>
  );
}
