// ---------------------------------------------------------------------------
// Collapsible editor for one section: its heading text plus each of its fields.
// Uses a native <details> for accessible, keyboard-friendly expand/collapse.
//
// A closed <details> still puts its children in the page, so the body is
// rendered only while the section is open. With every question carrying its
// wording in two languages, building all seven sections at once put several
// hundred inputs on the page that nobody was looking at, and every keystroke
// paid for them.
// ---------------------------------------------------------------------------
import { useState } from 'react';
import type { SectionConfig } from '../config/types';
import { useConfig } from '../state/ConfigStore';
import { sectionKey } from '../config/locale';
import { AddQuestion } from './AddQuestion';
import { FieldEditor } from './FieldEditor';
import { TranslationField } from './TranslationField';

export function SectionEditor({
  section,
  defaultOpen,
  previewPath,
}: {
  section: SectionConfig;
  defaultOpen?: boolean;
  previewPath: 'public' | 'provider';
}) {
  const { setSectionOverride, resetSection, isSectionModified, missingTranslations } = useConfig();
  const modified = isSectionModified(section.id);
  const [open, setOpen] = useState(Boolean(defaultOpen));
  // Counted from the keys rather than from the inputs, so a closed section
  // still says how much of it needs translating.
  const needsTranslation = [...missingTranslations].filter(
    (k) =>
      k.startsWith(`section.${section.id}.`) ||
      section.fields.some((f) => k.startsWith(`field.${f.id}.`)),
  ).length;

  return (
    <details
      className="section-editor"
      open={open}
      onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}
    >
      <summary className="section-editor-summary">
        <span className="se-title">{section.title}</span>
        <span className="se-meta">
          {section.fields.length} field{section.fields.length === 1 ? '' : 's'}
        </span>
        {modified && <span className="badge badge-mod">Modified</span>}
        {needsTranslation > 0 && (
          <span className="badge badge-missing">{needsTranslation} need translating</span>
        )}
      </summary>

      {open && (
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
          <TranslationField
            tKey={sectionKey(section.id, 'title')}
            english={section.title}
            caption="Section title"
            describes={section.id}
          />
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
          <TranslationField
            tKey={sectionKey(section.id, 'publicTitle')}
            english={section.publicTitle}
            caption="Public title"
            describes={section.id}
          />
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
      )}
    </details>
  );
}
