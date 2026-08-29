// ---------------------------------------------------------------------------
// Functional client-side upload (PWS 2.1, 2.4, PRS#9). Files are selected,
// validated against the configured Phase 1 policy, listed, and removable, all
// in the browser: nothing is read, stored, or transmitted. The accepted types
// and the size limit come from the field's configuration, which is the Phase 2
// provision in working form: extending to images and medical imaging is a
// change to that policy, not to this component.
// ---------------------------------------------------------------------------
import { useRef, useState } from 'react';
import { useForm } from '../state/FormContext';
import type { FieldConfig } from '../config/types';

interface Props {
  fieldKey: string;
  field: FieldConfig;
  describedBy?: string;
}

const fmtSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export function FileUpload({ fieldKey, field, describedBy }: Props) {
  const { values, setValue } = useForm();
  const names: string[] = Array.isArray(values[fieldKey]) ? (values[fieldKey] as string[]) : [];
  const meta = useRef(new Map<string, string>());
  const inputRef = useRef<HTMLInputElement>(null);
  const [rejections, setRejections] = useState<string[]>([]);

  const accept = field.fileAccept ?? ['.pdf'];
  const maxMB = field.fileMaxMB ?? 10;

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []);
    const rejected: string[] = [];
    const added: string[] = [];
    for (const f of picked) {
      const ext = '.' + (f.name.split('.').pop() ?? '').toLowerCase();
      if (!accept.includes(ext)) {
        rejected.push(
          `${f.name}: Phase 1 accepts medical record and vaccine documents as ${accept.join(
            ', ',
          )}. Pictures and medical imaging arrive in Phase 2.`,
        );
        continue;
      }
      if (f.size > maxMB * 1024 * 1024) {
        rejected.push(`${f.name}: larger than the ${maxMB} MB limit (${fmtSize(f.size)}).`);
        continue;
      }
      if (names.includes(f.name) || added.includes(f.name)) continue;
      meta.current.set(f.name, fmtSize(f.size));
      added.push(f.name);
    }
    if (added.length) setValue(fieldKey, [...names, ...added]);
    setRejections(rejected);
    // Allow re-selecting the same file after a remove.
    if (inputRef.current) inputRef.current.value = '';
  };

  const remove = (name: string) => {
    meta.current.delete(name);
    setValue(
      fieldKey,
      names.filter((n) => n !== name),
    );
  };

  return (
    <div className="file-upload">
      <input
        id={fieldKey}
        ref={inputRef}
        className="input"
        type="file"
        multiple
        accept={accept.join(',')}
        aria-describedby={describedBy}
        onChange={onChange}
      />
      <p className="file-policy">
        Accepted: {accept.join(', ')} up to {maxMB} MB each. Attach as many documents as apply.
      </p>
      {rejections.map((r) => (
        <p key={r} className="field-error" role="alert">
          {r}
        </p>
      ))}
      <div aria-live="polite" className="sr-only">
        {names.length === 0
          ? 'No documents attached.'
          : `${names.length} ${names.length === 1 ? 'document' : 'documents'} attached.`}
      </div>
      {names.length > 0 && (
        <ul className="file-list" aria-label="Attached documents">
          {names.map((n) => (
            <li key={n} className="file-item">
              <span className="file-name">{n}</span>
              <span className="file-size">{meta.current.get(n) ?? ''}</span>
              <button
                type="button"
                className="btn btn-outline btn-small"
                onClick={() => remove(n)}
                aria-label={`Remove ${n}`}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
