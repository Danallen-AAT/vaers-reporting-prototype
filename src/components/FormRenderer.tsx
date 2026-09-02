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
import { ConfirmAction } from './ConfirmAction';
import { DocSuggestions } from './DocSuggestions';
import { SurveyDialog } from './SurveyDialog';
import { ProgressPanel } from './ProgressPanel';
import { handleJump, jumpTo } from '../lib/inPageJump';

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
  const reviewRef = useRef<HTMLElement>(null);
  // A submitted report is a record of consequence (SC 3.3.4), so submission is
  // three stages: editing, review of a plain-language summary, then an explicit
  // confirmation that finalizes it. Nothing becomes final on the first click.
  const [stage, setStage] = useState<'editing' | 'review' | 'final'>('editing');
  const showOutput = stage === 'final';
  const [surveyOpen, setSurveyOpen] = useState(false);

  useEffect(() => {
    if (submitted && errorCount > 0) summaryRef.current?.focus();
  }, [submitted, errorCount]);

  useEffect(() => {
    if (stage === 'review') reviewRef.current?.focus();
  }, [stage]);

  // Switching reporter type invalidates the review summary, so any change to
  // the path drops back to editing rather than leaving a stale review on
  // screen. Answers themselves are preserved by the engine where they apply.
  const reporterType = values['reporterType'];
  useEffect(() => {
    setStage('editing');
  }, [reporterType]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const ok = validate();
    setStage(ok ? 'review' : 'editing');
  };

  const confirmFinal = () => {
    setStage('final');
    setSurveyOpen(true);
  };

  /** Plain-language answer summary for the review stage: option labels, not codes. */
  const displayValue = (f: FieldConfig, v: unknown): string => {
    const lab = (x: unknown) => f.options?.find((o) => o.value === x)?.label ?? String(x);
    if (Array.isArray(v)) return v.map(lab).join('; ');
    return lab(v);
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
    // The survey is a sibling of the form, never a child of it. A form nested
    // inside a form is invalid HTML: the browser drops the inner element, so
    // the survey's own submit handler never runs and the survey submits the
    // reporting form instead, navigating away and destroying the report.
    <>
    <form className="vaers-form" onSubmit={onSubmit} noValidate>
      {activePath && (
        <div className="path-banner" role="status">
          <span className="path-badge">
            {isPublic ? 'Public reporter' : 'Healthcare provider'}
          </span>
          <span className="path-note">Wording and fields are tailored to this path.</span>
          {/* Non-destructive: jumps to the reporter-type question, so both
              ways of switching paths share one behavior and answers survive
              wherever they still apply. Clearing work is a separate control
              behind an explicit confirmation. */}
          <button
            type="button"
            className="btn btn-link"
            aria-label="Change reporter type"
            onClick={() => jumpTo('reporterType')}
          >
            Change
          </button>
          <ConfirmAction
            triggerLabel="Start over"
            prompt="Starting over clears every answer on this report."
            confirmLabel="Clear all answers"
            cancelLabel="Keep my answers"
            triggerClass="btn btn-link"
            fallbackFocusId="reporterType"
            onConfirm={() => {
              reset();
              setStage('editing');
            }}
          />
        </div>
      )}

      <ProgressPanel />

      {sections.map(({ section, fields, instances }) => {
        const title = isPublic && section.publicTitle ? section.publicTitle : section.title;
        const desc =
          isPublic && section.publicDescription ? section.publicDescription : section.description;
        return (
          <section className="form-section" key={section.id} aria-labelledby={`${section.id}-heading`}>
            {/* tabIndex allows the completion-status control to move focus here,
                so keyboard users travel with the scroll rather than being left
                behind in the panel. */}
            <h2 id={`${section.id}-heading`} className="section-title" tabIndex={-1}>
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
                        {/* href is kept for link semantics and middle-click, but
                            the navigation is cancelled: a bare fragment href
                            would be read as a route and bounce the reporter to
                            the landing page. See lib/inPageJump. */}
                        <a href={`#${key}`} onClick={handleJump(key)}>
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

      {stage === 'review' && errorCount === 0 && (
        <section
          className="review-stage"
          aria-labelledby="review-heading"
          ref={reviewRef}
          tabIndex={-1}
        >
          <h2 id="review-heading" className="section-title">
            Review your report before it becomes final
          </h2>
          <p className="section-desc">
            Check each answer below. You can go back and correct anything.
            Nothing is submitted until you confirm.
          </p>
          <dl className="review-list">
            {sections.map(({ section, fields, instances }) =>
              section.repeat
                ? Array.from({ length: instances }).flatMap((_, i) =>
                    fields
                      .filter((f) => {
                        const v = values[repeatFieldId(f.id, i)];
                        return v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0);
                      })
                      .map((f) => (
                        <div key={repeatFieldId(f.id, i)} className="review-row">
                          <dt>
                            {labelOf(f)} ({section.repeat!.itemLabel} {i + 1})
                          </dt>
                          <dd>{displayValue(f, values[repeatFieldId(f.id, i)])}</dd>
                        </div>
                      )),
                  )
                : fields
                    .filter((f) => {
                      const v = values[f.id];
                      return v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0);
                    })
                    .map((f) => (
                      <div key={f.id} className="review-row">
                        <dt>{labelOf(f)}</dt>
                        <dd>{displayValue(f, values[f.id])}</dd>
                      </div>
                    )),
            )}
          </dl>
          <div className="form-actions">
            <button type="button" className="btn btn-primary" onClick={confirmFinal}>
              Confirm and finalize report
            </button>
            <button type="button" className="btn btn-outline" onClick={() => setStage('editing')}>
              Go back and make corrections
            </button>
          </div>
        </section>
      )}

      {showOutput && errorCount === 0 && (
        <section className="structured-output" aria-labelledby="output-heading">
          <h2 id="output-heading" className="section-title">
            Structured output (VAERS-compatible)
          </h2>
          <p className="section-desc">
            Your confirmed report as clean structured JSON from one isolated
            mapping layer, keyed to the published VAERS 2.0 form items where a
            counterpart exists. Fields born of the modernized workflow await the
            data element definitions CDC furnishes at kickoff, and the meta
            block below reports both counts openly (see How it works). Nothing in
            this report is stored or transmitted.
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

    </form>

    <SurveyDialog
      open={surveyOpen}
      onClose={() => setSurveyOpen(false)}
      survey={config.surveys.postSubmission}
    />
    </>
  );
}
