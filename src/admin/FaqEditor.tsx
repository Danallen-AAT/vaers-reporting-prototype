// ---------------------------------------------------------------------------
// FAQ editor (Task 1.8). Add / edit / remove FAQ entries; the reactive FAQ
// panel on the reporting form reflects changes immediately.
// ---------------------------------------------------------------------------
import { useConfig } from '../state/ConfigStore';

export function FaqEditor() {
  const { faqs, addFaq, updateFaq, removeFaq } = useConfig();

  return (
    <details className="section-editor" >
      <summary className="section-editor-summary">
        <span className="se-title">FAQ entries</span>
        <span className="se-meta">
          {faqs.length} item{faqs.length === 1 ? '' : 's'}
        </span>
      </summary>

      <div className="se-body">
        {faqs.map((faq, i) => (
          <fieldset className="field-editor" key={faq.id}>
            <legend className="fe-legend">
              <span className="fe-title">FAQ {i + 1}</span>
            </legend>
            <div className="fe-grid">
              <label className="fe-row">
                <span className="fe-cap">Question</span>
                <input
                  className="fe-input"
                  aria-label={`Question for FAQ ${i + 1}`}
                  value={faq.question}
                  onChange={(e) => updateFaq(faq.id, { question: e.target.value })}
                />
              </label>
              <label className="fe-row">
                <span className="fe-cap">Answer</span>
                <textarea
                  className="fe-input"
                  aria-label={`Answer for FAQ ${i + 1}`}
                  rows={3}
                  value={faq.answer}
                  onChange={(e) => updateFaq(faq.id, { answer: e.target.value })}
                />
              </label>
            </div>
            <div className="fe-actions">
              <button
                type="button"
                className="btn btn-link btn-danger"
                onClick={() => removeFaq(faq.id)}
              >
                Remove FAQ {i + 1}
              </button>
            </div>
          </fieldset>
        ))}

        <button type="button" className="btn btn-outline" onClick={addFaq}>
          + Add FAQ entry
        </button>
      </div>
    </details>
  );
}
