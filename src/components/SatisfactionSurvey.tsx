// ---------------------------------------------------------------------------
// Post-submission satisfaction survey (PWS Task 1.7). Appears after a
// successful submission. Accessible dialog: labelled, Escape to close, focus
// moved in on open. Responses are not stored anywhere in this prototype.
// ---------------------------------------------------------------------------
import { useEffect, useRef, useState } from 'react';
import { useFocusTrap } from '../hooks/useFocusTrap';

const EASE_OPTIONS = [
  { value: '5', label: 'Very easy' },
  { value: '4', label: 'Easy' },
  { value: '3', label: 'Neither easy nor difficult' },
  { value: '2', label: 'Difficult' },
  { value: '1', label: 'Very difficult' },
];

const CLARITY_OPTIONS = [
  { value: 'yes', label: 'Yes, they were clear' },
  { value: 'mostly', label: 'Mostly clear' },
  { value: 'no', label: 'No, some were confusing' },
];

export function SatisfactionSurvey({ open, onClose }: { open: boolean; onClose: () => void }) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useFocusTrap(open, dialogRef);
  const [ease, setEase] = useState('');
  const [clarity, setClarity] = useState('');
  const [comment, setComment] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!open) return;
    headingRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="faq-backdrop" onClick={onClose}>
      <div
        className="faq-dialog survey-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="survey-title"
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="faq-dialog-head">
          <h2 id="survey-title" tabIndex={-1} ref={headingRef}>
            {done ? 'Thank you' : 'How did that go?'}
          </h2>
          <button
            type="button"
            className="faq-close"
            onClick={onClose}
            aria-label="Close the survey"
          >
            &#10005;
          </button>
        </div>

        {done ? (
          <p className="survey-thanks" role="status">
            Your feedback helps us improve this form. Nothing you entered has been
            stored.
          </p>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setDone(true);
            }}
          >
            <fieldset className="field field-group">
              <legend className="field-label">
                How easy was it to complete this report?
              </legend>
              <div className="options">
                {EASE_OPTIONS.map((o) => (
                  <label className="option" key={o.value} htmlFor={`ease-${o.value}`}>
                    <input
                      type="radio"
                      id={`ease-${o.value}`}
                      name="ease"
                      value={o.value}
                      checked={ease === o.value}
                      onChange={() => setEase(o.value)}
                    />
                    <span>{o.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="field field-group">
              <legend className="field-label">Were the questions clear?</legend>
              <div className="options">
                {CLARITY_OPTIONS.map((o) => (
                  <label className="option" key={o.value} htmlFor={`clarity-${o.value}`}>
                    <input
                      type="radio"
                      id={`clarity-${o.value}`}
                      name="clarity"
                      value={o.value}
                      checked={clarity === o.value}
                      onChange={() => setClarity(o.value)}
                    />
                    <span>{o.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="field">
              <label className="field-label" htmlFor="survey-comment">
                Anything we could improve?
              </label>
              <textarea
                id="survey-comment"
                className="input"
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary">
                Send feedback
              </button>
              <button type="button" className="btn btn-link" onClick={onClose}>
                No thanks
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
