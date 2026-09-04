// ---------------------------------------------------------------------------
// Reactive document suggestions (PWS Task 2.3). Watches the answers and tells
// the reporter which supporting documents would help, with the reason why.
// Announced politely to screen readers so it does not interrupt typing.
// ---------------------------------------------------------------------------
import { useForm } from '../state/FormContext';
import { useLocale } from '../state/LocaleStore';
import { uiText, type UiKey } from '../config/ui';
import { answersOnScreen, getDocSuggestions } from '../formEngine/docSuggestions';

export function DocSuggestions() {
  const { config, values } = useForm();
  const { locale, t } = useLocale();
  // Suggestions follow the live instrument, not retained answers.
  const suggestions = getDocSuggestions(answersOnScreen(config, values));

  if (suggestions.length === 0) return null;

  return (
    <aside className="doc-suggest" aria-labelledby="doc-suggest-title" aria-live="polite">
      <h3 id="doc-suggest-title" className="doc-suggest-title">
        {t('doc.title')}
      </h3>
      <p className="doc-suggest-lede">{t('doc.lede')}</p>
      <ul className="doc-suggest-list">
        {suggestions.map((s) => (
          <li key={s.id}>
            <span className="doc-name">{uiText(`doc.${s.id}.document` as UiKey, locale)}</span>
            <span className="doc-why">{uiText(`doc.${s.id}.why` as UiKey, locale)}</span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
