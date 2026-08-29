// ---------------------------------------------------------------------------
// The admin configuration surface (Task 1.8) - the headline differentiator.
//
// Left: a content editor for every section/field plus the FAQ. Right: a LIVE
// preview rendered by the very same FormRenderer/engine the public app uses,
// reading the same effective config. Editing a label on the left updates the
// preview on the right instantly - the "no redeploy" low-code story, on camera.
// ---------------------------------------------------------------------------
import { useState } from 'react';
import { ConfirmAction } from '../components/ConfirmAction';
import { useConfig } from '../state/ConfigStore';
import { FormProvider } from '../state/FormContext';
import { FormRenderer } from '../components/FormRenderer';
import { SectionEditor } from './SectionEditor';
import { FaqEditor } from './FaqEditor';

export function AdminPanel({ onSignOut }: { onSignOut?: () => void }) {
  const { config, isCustomized, resetAll } = useConfig();
  const [previewPath, setPreviewPath] = useState<'public' | 'provider'>('provider');

  return (
    <main id="main" className="admin" tabIndex={-1}>
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
          Edit question labels, help text, requiredness, and FAQs. Changes save to
          this browser and the live form updates instantly, with no code change
          and no redeploy. This is how a CDC program owner maintains the form.
        </p>
        <div className="admin-actions">
          <a className="btn btn-primary" href="#/">
            Open the live reporting form ↗
          </a>
          <ConfirmAction
            triggerLabel="Reset all to defaults"
            prompt="This removes every customization and returns the form to its default configuration."
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
          {config.sections.map((section, i) => (
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
          </div>
          <p className="preview-note">
            Rendered by the same engine as the public form. Reflects your edits as
            you type.
          </p>
          <div className="preview-frame">
            <FormProvider key={previewPath} config={config} initialValues={{ reporterType: previewPath }}>
              <FormRenderer />
            </FormProvider>
          </div>
        </aside>
      </div>
    </main>
  );
}
