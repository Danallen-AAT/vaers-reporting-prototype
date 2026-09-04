// ---------------------------------------------------------------------------
// One translated string, edited beside the English it translates (PWS 1.13).
//
// The English is shown, not just implied by an adjacent input, because a person
// translating a question needs to read the sentence they are translating. The
// input is marked when the translation is missing, and the same fact reaches
// the configuration check, which refuses to publish until it is filled: the
// badge and the gate are two views of one list, so they cannot disagree.
//
// It renders nothing when there is no English text. There is nothing to
// translate, and an empty pair of inputs would read as work still to do.
// ---------------------------------------------------------------------------
import { REQUIRED_LOCALES, useConfig } from '../state/ConfigStore';

export function TranslationField({
  tKey,
  english,
  caption,
  describes,
  multiline,
}: {
  /** The translation key, built by the helpers in config/locale. */
  tKey: string;
  /** The English text this translates, shown for reference. */
  english?: string;
  /** What this string is, for example "Label". */
  caption: string;
  /** What it belongs to, for the accessible name, for example "vaxLot". */
  describes: string;
  multiline?: boolean;
}) {
  const { translationOf, setTranslation, draftTranslations, missingTranslations } = useConfig();

  if (!english || english.trim() === '') return null;

  return (
    <>
      {REQUIRED_LOCALES.map(({ code, label }) => {
        const shipped = draftTranslations(code)[tKey] ?? '';
        const edited = translationOf(code, tKey);
        const missing = missingTranslations.has(tKey);
        const inputId = `t-${code}-${tKey}`;
        return (
          <label className="fe-row fe-translation" key={code} htmlFor={inputId}>
            <span className="fe-cap">
              {caption} in {label}
              {missing && (
                <span className="badge badge-missing" title={`No ${label} version yet`}>
                  needs {label}
                </span>
              )}
            </span>
            {multiline ? (
              <textarea
                id={inputId}
                className="fe-input"
                rows={2}
                aria-label={`${caption} in ${label} for ${describes}`}
                aria-invalid={missing || undefined}
                placeholder={english}
                value={edited || shipped}
                onChange={(e) => setTranslation(code, tKey, e.target.value)}
              />
            ) : (
              <input
                id={inputId}
                className="fe-input"
                aria-label={`${caption} in ${label} for ${describes}`}
                aria-invalid={missing || undefined}
                placeholder={english}
                value={edited || shipped}
                onChange={(e) => setTranslation(code, tKey, e.target.value)}
              />
            )}
          </label>
        );
      })}
    </>
  );
}
