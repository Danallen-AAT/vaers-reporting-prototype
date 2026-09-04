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
import { useLocale } from '../state/LocaleStore';
import type { UiKey } from '../config/ui';
import { jumpTo } from '../lib/inPageJump';

const MARK: Record<SectionState, string> = {
  complete: '✓',
  partial: '•',
  empty: '○',
  optional: '-',
};

// State is announced in words as well as drawn as a glyph, so the readout does
// not depend on seeing the mark. The words are interface text like any other.
const STATUS: Record<SectionState, UiKey> = {
  complete: 'progress.complete',
  partial: 'progress.partial',
  empty: 'progress.empty',
  optional: 'progress.optional',
};

// These are buttons rather than anchors on purpose. They are not navigation,
// they scroll, and a fragment href would be swallowed by the hash router. See
// lib/inPageJump for the whole story.

export function ProgressPanel() {
  const { config, values, activePath } = useForm();
  const { t } = useLocale();

  // Before a reporter type is chosen there is only the one question, and a
  // progress bar reading zero percent would be noise.
  if (!activePath) return null;

  const progress = getFormProgress(config, values, activePath === 'public');
  if (progress.sections.length === 0) return null;

  return (
    <section className="progress-panel" aria-labelledby="progress-heading">
      <div className="progress-head">
        <h2 id="progress-heading" className="progress-title">
          {t('progress.heading')}
        </h2>
        <p className="progress-count">
          <strong>{progress.requiredFilled}</strong>{' '}
          {progress.requiredTotal === 1
            ? t('progress.countOne', { total: progress.requiredTotal })
            : t('progress.countMany', { total: progress.requiredTotal })}
        </p>
      </div>

      <div
        className="progress-track"
        role="progressbar"
        aria-valuenow={progress.percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-labelledby="progress-heading"
        aria-valuetext={t('progress.valueText', { percent: progress.percent })}
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
                , {t(STATUS[s.state])}
                {s.required > 0
                  ? `, ${t('progress.detail', { filled: s.filled, required: s.required })}`
                  : ''}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
