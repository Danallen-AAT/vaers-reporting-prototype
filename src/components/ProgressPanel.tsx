// ---------------------------------------------------------------------------
// Completion status (PWS 1.3, intelligent completion assistance).
//
// The production VAERS form carries a "Completion Status" rail, so this is
// table stakes rather than a flourish. The difference here is that the list is
// derived from the branching engine, so suppressed sections leave the readout
// entirely instead of sitting unfinished forever.
//
// State is never carried by colour alone: every entry has a glyph and a
// screen-reader status string, which is a Section 508 requirement and the thing
// most progress indicators get wrong.
// ---------------------------------------------------------------------------
import { getFormProgress, type SectionState } from '../formEngine/progress';
import { useForm } from '../state/FormContext';
import { jumpTo } from '../lib/inPageJump';

const MARK: Record<SectionState, string> = {
  complete: '✓',
  partial: '•',
  empty: '○',
  optional: '-',
};

const STATUS: Record<SectionState, string> = {
  complete: 'complete',
  partial: 'in progress',
  empty: 'not started',
  optional: 'optional',
};

// These are buttons rather than anchors on purpose. They are not navigation,
// they scroll, and a fragment href would be swallowed by the hash router. See
// lib/inPageJump for the whole story.

export function ProgressPanel() {
  const { config, values, activePath } = useForm();

  // Before a reporter type is chosen there is only the one question, and a
  // progress bar reading zero percent would be noise.
  if (!activePath) return null;

  const progress = getFormProgress(config, values, activePath === 'public');
  if (progress.sections.length === 0) return null;

  return (
    <section className="progress-panel" aria-labelledby="progress-heading">
      <div className="progress-head">
        <h2 id="progress-heading" className="progress-title">
          Completion status
        </h2>
        <p className="progress-count">
          <strong>{progress.requiredFilled}</strong> of {progress.requiredTotal} required
          {progress.requiredTotal === 1 ? ' answer' : ' answers'}
        </p>
      </div>

      <div
        className="progress-track"
        role="progressbar"
        aria-valuenow={progress.percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-labelledby="progress-heading"
        aria-valuetext={`${progress.percent} percent of required questions answered`}
      >
        <div
          className={`progress-fill${progress.complete ? ' is-complete' : ''}`}
          style={{ width: `${progress.percent}%` }}
        />
      </div>

      <ul className="progress-list">
        {progress.sections.map((s) => (
          <li key={s.id} className={`progress-item is-${s.state}`}>
            <button type="button" onClick={() => jumpTo(`${s.id}-heading`)}>
              <span className="progress-mark" aria-hidden="true">
                {MARK[s.state]}
              </span>
              <span className="progress-label">{s.title}</span>
              <span className="sr-only">
                , {STATUS[s.state]}
                {s.required > 0 ? `, ${s.filled} of ${s.required} required answered` : ''}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
