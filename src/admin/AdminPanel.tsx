// ---------------------------------------------------------------------------
// The admin configuration surface (Task 1.8) - the headline differentiator.
//
// Left: a content editor for every section/field plus the FAQ. Right: a LIVE
// preview rendered by the very same FormRenderer/engine the public app uses,
// reading the same effective config. Editing a label on the left updates the
// preview on the right at once, while reporters stay on the published
// version until a publish: the "no redeploy" low-code story, on camera.
// ---------------------------------------------------------------------------
import { useEffect, useMemo, useRef, useState } from 'react';
import { ConfirmAction } from '../components/ConfirmAction';
import { REQUIRED_LOCALES, useConfig } from '../state/ConfigStore';
import { FormProvider } from '../state/FormContext';
import { LocaleOverride } from '../state/LocaleStore';
import { FormRenderer } from '../components/FormRenderer';
import { LOCALES, localizeConfig, translatableKeys, type Locale } from '../config/locale';
import { SectionEditor } from './SectionEditor';
import { FaqEditor } from './FaqEditor';

export function AdminPanel({ onSignOut, user }: { onSignOut?: () => void; user?: string }) {
  const {
    draftConfig,
    isCustomized,
    resetAll,
    configCheck,
    hasDraftChanges,
    publish,
    discardDraft,
    restoreVersion,
    history,
    draftFaqs,
    draftTranslations,
  } = useConfig();
  const [changeLabel, setChangeLabel] = useState('');
  const [publishError, setPublishError] = useState<string | null>(null);
  const refusalRef = useRef<HTMLParagraphElement>(null);
  const [publishedNote, setPublishedNote] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [previewPath, setPreviewPath] = useState<'public' | 'provider'>('provider');
  const [previewLocale, setPreviewLocale] = useState<Locale>('en');

  // Coverage is counted from the draft rather than from a stored total, so a
  // question added a moment ago is in the denominator immediately.
  const coverage = useMemo(() => {
    const keys = translatableKeys(draftConfig, draftFaqs);
    return REQUIRED_LOCALES.map(({ code, label }) => {
      const have = draftTranslations(code);
      return {
        code,
        label,
        total: keys.length,
        missing: keys.filter((k) => !have[k]?.trim()).length,
      };
    });
  }, [draftConfig, draftFaqs, draftTranslations]);

  // A refused publish is announced by its alert, but a keyboard user who
  // pressed the button is left where they were, with the reason rendered below
  // the fold. Moving focus to the reason puts the explanation where the person
  // who asked for it is looking.
  useEffect(() => {
    if (publishError) refusalRef.current?.focus();
  }, [publishError]);

  const previewConfig = useMemo(
    () => localizeConfig(draftConfig, previewLocale, draftTranslations(previewLocale)),
    [draftConfig, previewLocale, draftTranslations],
  );

  return (
    // English by decision: this is a CDC staff tool. The lang attribute marks it
    // as a passage in another language when the document is Spanish (WCAG 3.1.2),
    // and the note says so rather than letting it read as a missing translation.
    <main id="main" className="admin" lang="en" tabIndex={-1}>
      <div className="wrap admin-head">
        <div className="admin-head-top">
          <div>
            <p className="eyebrow">Low-code configuration · Task 1.8</p>
            <h1>Form configuration</h1>
          </div>
          {onSignOut && (
            <button type="button" className="btn btn-link" onClick={onSignOut}>
              Sign out
            </button>
          )}
        </div>
        <p className="admin-lede">
          Edit question labels, help text, requiredness, and FAQs. Add questions,
          set the answer that makes them appear, and move questions between
          sections. Every piece of wording is edited in English and in Spanish
          together, and a question missing its Spanish cannot be published. Edits
          are held as a draft and reach reporters when you publish, with no code
          change and no redeploy. This is how a CDC program owner maintains the
          form.
        </p>
        <div className="admin-actions">
          <a className="btn btn-primary" href="#/">
            Open the live reporting form ↗
          </a>
          <ConfirmAction
            triggerLabel="Reset all to defaults"
            prompt="This returns the draft to the default configuration. Reporters are unaffected until you publish."
            confirmLabel="Reset everything"
            cancelLabel="Keep my changes"
            onConfirm={resetAll}
            disabled={!isCustomized}
            fallbackFocusId="main"
          />
          {isCustomized ? (
            <span className="badge badge-mod" role="status">
              Customized
            </span>
          ) : (
            <span className="badge badge-quiet" role="status">
              Default configuration
            </span>
          )}
        </div>

        <div className="lang-coverage" role="status" aria-label="Translation coverage">
          {coverage.map((c) => (
            <p key={c.code} className={c.missing === 0 ? 'lc-ok' : 'lc-todo'}>
              <strong>{c.label}</strong>{' '}
              {c.missing === 0 ? (
                <>
                  complete. All {c.total} pieces of wording in this draft have a {c.label}{' '}
                  version, so it is ready to publish.
                </>
              ) : (
                <>
                  {c.total - c.missing} of {c.total} pieces of wording done.{' '}
                  {c.missing === 1 ? 'One still needs' : `${c.missing} still need`} a {c.label}{' '}
                  version, and the inputs are marked below. Publishing waits until they are
                  written.
                </>
              )}
            </p>
          ))}
          {configCheck.translationIssues.length > 0 && (
            <ul className="lang-todo-list">
              {configCheck.translationIssues.map((issue) => (
                <li key={`${issue.code}-${issue.target}`}>{issue.message}</li>
              ))}
            </ul>
          )}
        </div>

        <div
          className={`config-check ${configCheck.ok ? 'is-ok' : 'is-bad'}`}
          role="status"
          aria-label="Configuration check"
        >
          <strong>Configuration check</strong>{' '}
          {configCheck.ok ? (
            <>
              passed. Every question can still be reached: {configCheck.fieldsChecked} questions
              tested against {configCheck.combinations} answer combinations generated from the
              branching rules themselves.
            </>
          ) : (
            <>
              found {configCheck.issues.length}{' '}
              {configCheck.issues.length === 1 ? 'problem' : 'problems'} across{' '}
              {configCheck.combinations} answer combinations:
              <ul className="config-check-list">
                {configCheck.issues.map((issue) => (
                  <li key={`${issue.code}-${issue.target}`}>{issue.message}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>

      <div className="wrap">
        <section className="publish-bar" aria-labelledby="publish-title">
          <div className="publish-head">
            <h2 id="publish-title" className="publish-title">
              Draft and publishing
            </h2>
            <span
              className={`badge ${hasDraftChanges ? 'badge-mod' : 'badge-quiet'}`}
              role="status"
            >
              {hasDraftChanges ? 'Unpublished changes' : 'Draft matches what is live'}
            </span>
          </div>
          <p className="publish-lede">
            Edits are saved to a draft. Reporters keep seeing the published form until
            someone publishes, and every publish is recorded with who made it and why.
          </p>
          <div className="publish-actions">
            <label className="publish-label">
              <span className="fe-cap">Describe this change</span>
              <input
                className="publish-input"
                aria-label="Describe this change"
                value={changeLabel}
                placeholder="For example: plainer wording on the vaccine questions"
                onChange={(e) => setChangeLabel(e.target.value)}
              />
            </label>
            <button
              type="button"
              className="btn btn-primary"
              disabled={!hasDraftChanges}
              onClick={() => {
                const r = publish(changeLabel, user ?? 'cdc.program.owner');
                setPublishError(r.reason ?? null);
                if (r.ok) {
                  setPublishedNote('Published. Reporters now see this version.');
                  setChangeLabel('');
                } else {
                  setPublishedNote(null);
                }
              }}
            >
              Publish to the live form
            </button>
            <ConfirmAction
              triggerLabel="Discard draft"
              triggerClass="btn btn-outline"
              prompt="This throws away every unpublished edit and starts again from the published form."
              confirmLabel="Discard it"
              cancelLabel="Keep editing"
              onConfirm={() => {
                discardDraft();
                setPublishError(null);
                setPublishedNote(null);
              }}
              disabled={!hasDraftChanges}
              fallbackFocusId="main"
            />
          </div>
          {publishError && (
            <p className="fe-refused" role="alert" tabIndex={-1} ref={refusalRef}>
              <strong>Not published.</strong> {publishError}
            </p>
          )}
          {publishedNote && !hasDraftChanges && (
            <p className="publish-ok" role="status">
              {publishedNote}
            </p>
          )}

          <button
            type="button"
            className="btn btn-link"
            aria-expanded={historyOpen}
            onClick={() => setHistoryOpen((v) => !v)}
          >
            {historyOpen ? 'Hide' : 'Show'} publish history ({history.length})
          </button>
          {historyOpen && (
            <ol className="publish-history">
              {history.length === 0 && <li className="publish-empty">Nothing published yet.</li>}
              {history.map((v) => (
                <li key={v.id}>
                  <span className="ph-label">{v.label}</span>
                  <span className="ph-meta">
                    {new Date(v.at).toLocaleString()} by {v.by}
                  </span>
                  {hasDraftChanges ? (
                    <ConfirmAction
                      triggerLabel="Load into draft"
                      triggerClass="btn btn-link"
                      prompt="This replaces your unpublished draft edits with this version."
                      confirmLabel="Load it"
                      cancelLabel="Keep my draft"
                      onConfirm={() => restoreVersion(v.id)}
                      fallbackFocusId="main"
                    />
                  ) : (
                    <button
                      type="button"
                      className="btn btn-link"
                      onClick={() => restoreVersion(v.id)}
                    >
                      Load into draft
                    </button>
                  )}
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <div className="wrap admin-layout">
        <div className="admin-editor">
          <div className="editor-head">
            <h2 className="admin-col-title">Content</h2>
            <p className="editor-context" role="status">
              Editing for the{' '}
              <strong>{previewPath === 'public' ? 'public' : 'healthcare provider'}</strong> view.
              Inputs marked <span className="live-dot">in preview</span> are the ones showing on the
              right.
            </p>
          </div>
          {draftConfig.sections.map((section, i) => (
            <SectionEditor
              key={section.id}
              section={section}
              defaultOpen={i === 0}
              previewPath={previewPath}
            />
          ))}
          <FaqEditor />
        </div>

        <aside className="admin-preview" aria-label="Live form preview">
          <div className="preview-head">
            <h2 className="admin-col-title">Live preview</h2>
            <div className="preview-toggle" role="group" aria-label="Preview as reporter type">
              <button
                type="button"
                className="seg"
                aria-pressed={previewPath === 'public'}
                onClick={() => setPreviewPath('public')}
              >
                Public
              </button>
              <button
                type="button"
                className="seg"
                aria-pressed={previewPath === 'provider'}
                onClick={() => setPreviewPath('provider')}
              >
                Provider
              </button>
            </div>
            <div className="preview-toggle" role="group" aria-label="Preview language">
              {LOCALES.map((l) => (
                <button
                  key={l.code}
                  type="button"
                  className="seg"
                  lang={l.code}
                  aria-pressed={previewLocale === l.code}
                  onClick={() => setPreviewLocale(l.code)}
                >
                  {l.endonym}
                </button>
              ))}
            </div>
          </div>
          <p className="preview-note">
            Rendered by the same engine as the public form, showing the draft as you
            edit it, in either language. Reporters keep seeing the published version
            until you publish.
          </p>
          <div className="preview-frame" lang={previewLocale}>
            <LocaleOverride locale={previewLocale}>
              <FormProvider
                key={`${previewPath}-${previewLocale}`}
                config={previewConfig}
                initialValues={{ reporterType: previewPath }}
              >
                <FormRenderer />
              </FormProvider>
            </LocaleOverride>
          </div>
        </aside>
      </div>
    </main>
  );
}
