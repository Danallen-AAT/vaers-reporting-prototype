// ---------------------------------------------------------------------------
// Reactive document suggestions (PWS Task 2.3). Watches the answers and tells
// the reporter which supporting documents would help, with the reason why.
// Announced politely to screen readers so it does not interrupt typing.
// ---------------------------------------------------------------------------
import { useForm } from '../state/FormContext';
import { getDocSuggestions } from '../formEngine/docSuggestions';

export function DocSuggestions() {
  const { values } = useForm();
  const suggestions = getDocSuggestions(values);

  if (suggestions.length === 0) return null;

  return (
    <aside className="doc-suggest" aria-labelledby="doc-suggest-title" aria-live="polite">
      <h3 id="doc-suggest-title" className="doc-suggest-title">
        Documents that would help
      </h3>
      <p className="doc-suggest-lede">
        Based on your answers, these records would strengthen this report. All are
        optional.
      </p>
      <ul className="doc-suggest-list">
        {suggestions.map((s) => (
          <li key={s.id}>
            <span className="doc-name">{s.document}</span>
            <span className="doc-why">{s.why}</span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
