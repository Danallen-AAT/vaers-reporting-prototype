// ---------------------------------------------------------------------------
// Collapsible editor for one section: its heading text plus each of its fields.
// Uses a native <details> for accessible, keyboard-friendly expand/collapse.
// ---------------------------------------------------------------------------
import type { SectionConfig } from '../config/types';
import { useConfig } from '../state/ConfigStore';
import { AddQuestion } from './AddQuestion';
import { FieldEditor } from './FieldEditor';

export function SectionEditor({
  section,
  defaultOpen,
  previewPath,
}: {
  section: SectionConfig;
  defaultOpen?: boolean;
  previewPath: 'public' | 'provider';
}) {
  const { setSectionOverride, resetSection, isSectionModified } = useConfig();
  const modified = isSectionModified(section.id);

  return (
    <details className="section-editor" open={defaultOpen}>
      <summary className="section-editor-summary">
        <span className="se-title">{section.title}</span>
        <span className="se-meta">
          {section.fields.length} field{section.fields.length === 1 ? '' : 's'}
        </span>
        {modified && <span className="badge badge-mod">Modified</span>}
      </summary>

      <div className="se-body">
        <div className="fe-grid se-headings">
          <label className="fe-row">
            <span className="fe-cap">Section title</span>
            <input
              className="fe-input"
              aria-label={`Title for section ${section.id}`}
              value={section.title}
              onChange={(e) => setSectionOverride(section.id, { title: e.target.value })}
            />
          </label>
          <label className="fe-row">
            <span className="fe-cap">Public title</span>
            <input
              className="fe-input"
              aria-label={`Public title for section ${section.id}`}
              placeholder="(uses the section title)"
              value={section.publicTitle ?? ''}
              onChange={(e) => setSectionOverride(section.id, { publicTitle: e.target.value })}
            />
          </label>
          <div className="fe-actions">
            <button
              type="button"
              className="btn btn-link"
              disabled={!modified}
              onClick={() => resetSection(section.id)}
            >
              Revert section heading
            </button>
          </div>
        </div>

        {section.fields.map((field) => (
          <FieldEditor key={field.id} field={field} previewPath={previewPath} />
        ))}

        <AddQuestion section={section} />
      </div>
    </details>
  );
}
