// ---------------------------------------------------------------------------
// The translated answers of one choice question (Amendment 2, Q&A 270).
//
// Answers are labels too, so a choice question is only translated when its
// choices are. But some lists are long and are not the reason anyone opened
// this screen: the state selector alone carries fifty-one. So they are grouped
// behind a disclosure that says how many still need work, which keeps the gap
// visible while keeping the wording an editor actually came to change in front
// of them.
//
// The group renders its inputs only while it is open. That is not a detail: a
// closed <details> still puts its children in the page, and a few hundred extra
// inputs across the whole configuration made every keystroke slower.
// ---------------------------------------------------------------------------
import { useState } from 'react';
import type { FieldConfig } from '../config/types';
import { optionKey } from '../config/locale';
import { REQUIRED_LOCALES, useConfig } from '../state/ConfigStore';
import { TranslationField } from './TranslationField';

export function OptionTranslations({ field }: { field: FieldConfig }) {
  const { missingTranslations } = useConfig();
  const [open, setOpen] = useState(false);

  const options = field.options ?? [];
  if (options.length === 0) return null;

  const language = REQUIRED_LOCALES[0];
  if (!language) return null;

  const missing = options.filter((o) => missingTranslations.has(optionKey(field.id, o.value))).length;

  return (
    <details
      className="fe-options"
      open={open}
      onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}
    >
      <summary>
        Answers in {language.label} ({options.length})
        {missing > 0 && (
          <span className="badge badge-missing">
            {missing} need{missing === 1 ? 's' : ''} {language.label}
          </span>
        )}
      </summary>
      {open &&
        options.map((o) => (
          <TranslationField
            key={o.value}
            tKey={optionKey(field.id, o.value)}
            english={o.label}
            caption={`Answer "${o.label}"`}
            describes={field.id}
          />
        ))}
    </details>
  );
}
