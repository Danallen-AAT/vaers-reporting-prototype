// ---------------------------------------------------------------------------
// Satisfaction survey dialog, rendered from configuration.
//
// The solicitation asks for two instruments: one about site navigation
// (PWS 1.5) and one after submission (PWS 1.7). Both are defined as data in
// the form config and drawn by this one component, so the admin surface can
// edit their wording the same way it edits the form. Responses are not stored.
// ---------------------------------------------------------------------------
import { useEffect, useRef, useState } from 'react';
import type { SurveyConfig } from '../config/types';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { useLocale } from '../state/LocaleStore';

export function SurveyDialog({
  open,
  onClose,
  survey,
}: {
  open: boolean;
  onClose: () => void;
  survey: SurveyConfig;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);
  const { t } = useLocale();

  useFocusTrap(open, dialogRef);

  useEffect(() => {
    if (!open) return;
    headingRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Reset for the next time it opens.
  useEffect(() => {
    if (!open) {
      setDone(false);
      setAnswers({});
    }
  }, [open]);

  if (!open) return null;

  const titleId = `${survey.id}-title`;

  return (
    <div className="faq-backdrop" onClick={onClose}>
      <div
        className="faq-dialog survey-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="faq-dialog-head">
          <h2 id={titleId} tabIndex={-1} ref={headingRef}>
            {done ? t('survey.thankYou') : survey.title}
          </h2>
          <button
            type="button"
            className="faq-close"
            onClick={onClose}
            aria-label={t('survey.close', { title: survey.title })}
          >
            &#10005;
          </button>
        </div>

        {done ? (
          <p className="survey-thanks" role="status">
            {survey.thanks}
          </p>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setDone(true);
            }}
          >
            {survey.intro && <p className="survey-intro">{survey.intro}</p>}

            {survey.questions.map((q) =>
              q.type === 'radio' ? (
                <fieldset className="field field-group" key={q.id}>
                  <legend className="field-label">{q.label}</legend>
                  <div className="options">
                    {q.options?.map((o) => {
                      const id = `${survey.id}-${q.id}-${o.value}`;
                      return (
                        <label className="option" key={o.value} htmlFor={id}>
                          <input
                            type="radio"
                            id={id}
                            name={`${survey.id}-${q.id}`}
                            value={o.value}
                            checked={answers[q.id] === o.value}
                            onChange={() => setAnswers((a) => ({ ...a, [q.id]: o.value }))}
                          />
                          <span>{o.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              ) : (
                <div className="field" key={q.id}>
                  <label className="field-label" htmlFor={`${survey.id}-${q.id}`}>
                    {q.label}
                  </label>
                  <textarea
                    id={`${survey.id}-${q.id}`}
                    className="input"
                    rows={3}
                    value={answers[q.id] ?? ''}
                    onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                  />
                </div>
              ),
            )}

            <div className="form-actions">
              <button type="submit" className="btn btn-primary">
                {t('survey.send')}
              </button>
              <button type="button" className="btn btn-link" onClick={onClose}>
                {t('survey.noThanks')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
