// ---------------------------------------------------------------------------
// Reactive FAQ popup (Task 1.3). Reads FAQ content from the config store, so
// admin edits appear here immediately. Accessible dialog: labelled, Escape to
// close, backdrop click to close, focus moved to the close control on open.
// ---------------------------------------------------------------------------
import { useEffect, useRef } from 'react';
import type { FaqItem } from '../config/faqs';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface FaqPanelProps {
  open: boolean;
  onClose: () => void;
  faqs: FaqItem[];
}

export function FaqPanel({ open, onClose, faqs }: FaqPanelProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useFocusTrap(open, dialogRef);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="faq-backdrop" onClick={onClose}>
      <div
        className="faq-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="faq-dialog-title"
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="faq-dialog-head">
          <h2 id="faq-dialog-title">Frequently asked questions</h2>
          <button
            ref={closeRef}
            type="button"
            className="faq-close"
            onClick={onClose}
            aria-label="Close frequently asked questions"
          >
            ✕
          </button>
        </div>
        {faqs.length === 0 ? (
          <p className="faq-empty">No FAQ entries yet.</p>
        ) : (
          <dl className="faq-list">
            {faqs.map((f) => (
              <div className="faq-item" key={f.id}>
                <dt>{f.question || '(untitled question)'}</dt>
                <dd>{f.answer}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </div>
  );
}
