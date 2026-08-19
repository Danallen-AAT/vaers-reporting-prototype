// ---------------------------------------------------------------------------
// Generic, accessible field renderer. Every input type in the schema is drawn
// from here - labels/help swap to plain language on the public path, groups use
// <fieldset>/<legend>, and errors are wired via aria-describedby / aria-invalid.
// ---------------------------------------------------------------------------
import type { FieldConfig } from '../config/types';
import { useForm } from '../state/FormContext';

function labelFor(field: FieldConfig, isPublic: boolean): string {
  return isPublic && field.publicLabel ? field.publicLabel : field.label;
}

function helpFor(field: FieldConfig, isPublic: boolean): string | undefined {
  return isPublic && field.publicHelpText ? field.publicHelpText : field.helpText;
}

export function Field({ field }: { field: FieldConfig }) {
  const { values, errors, setValue, activePath } = useForm();
  const isPublic = activePath === 'public';

  const value = values[field.id];
  const error = errors[field.id];
  const label = labelFor(field, isPublic);
  const help = helpFor(field, isPublic);
  const required = field.required === true || field.required === 'conditional';

  const helpId = help ? `${field.id}-help` : undefined;
  const errorId = error ? `${field.id}-error` : undefined;
  const describedBy = [helpId, errorId].filter(Boolean).join(' ') || undefined;

  const requiredMark = required ? (
    <>
      {' '}
      <span className="req" aria-hidden="true">
        *
      </span>
      <span className="sr-only"> (required)</span>
    </>
  ) : null;

  const helpNode = help ? (
    <p className="help" id={helpId}>
      {help}
    </p>
  ) : null;

  const errorNode = error ? (
    <p className="field-error" id={errorId} role="alert">
      {error}
    </p>
  ) : null;

  // --- Grouped inputs: radio / multiselect (checkbox group) ----------------
  if (field.type === 'radio' || field.type === 'multiselect') {
    const selected = Array.isArray(value) ? value : [];
    return (
      <fieldset
        className="field field-group"
        id={field.id}
        aria-describedby={describedBy}
        aria-invalid={error ? true : undefined}
      >
        <legend className="field-label">
          {label}
          {requiredMark}
        </legend>
        {helpNode}
        <div className="options">
          {field.options?.map((opt) => {
            const optId = `${field.id}-${opt.value}`;
            if (field.type === 'radio') {
              return (
                <label className="option" key={opt.value} htmlFor={optId}>
                  <input
                    type="radio"
                    id={optId}
                    name={field.id}
                    value={opt.value}
                    checked={value === opt.value}
                    onChange={() => setValue(field.id, opt.value)}
                  />
                  <span>{opt.label}</span>
                </label>
              );
            }
            const checked = selected.includes(opt.value);
            return (
              <label className="option" key={opt.value} htmlFor={optId}>
                <input
                  type="checkbox"
                  id={optId}
                  name={field.id}
                  value={opt.value}
                  checked={checked}
                  onChange={(e) => {
                    const next = e.target.checked
                      ? [...selected, opt.value]
                      : selected.filter((v) => v !== opt.value);
                    setValue(field.id, next);
                  }}
                />
                <span>{opt.label}</span>
              </label>
            );
          })}
        </div>
        {errorNode}
      </fieldset>
    );
  }

  // --- Single-control inputs -----------------------------------------------
  const commonProps = {
    id: field.id,
    name: field.id,
    'aria-describedby': describedBy,
    'aria-invalid': error ? true : undefined,
    'aria-required': required || undefined,
  };

  let control: React.ReactNode;
  switch (field.type) {
    case 'textarea':
      control = (
        <textarea
          {...commonProps}
          className="input"
          rows={4}
          placeholder={field.placeholder}
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => setValue(field.id, e.target.value)}
        />
      );
      break;
    case 'select':
      control = (
        <select
          {...commonProps}
          className="input"
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => setValue(field.id, e.target.value)}
        >
          <option value="">Select one</option>
          {field.options?.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      );
      break;
    case 'file':
      control = (
        <input
          {...commonProps}
          className="input"
          type="file"
          onChange={(e) => setValue(field.id, e.target.files?.[0]?.name ?? '')}
        />
      );
      break;
    case 'checkbox':
      // Single boolean checkbox.
      return (
        <div className="field field-inline">
          <label className="option" htmlFor={field.id}>
            <input
              {...commonProps}
              type="checkbox"
              checked={value === true}
              onChange={(e) => setValue(field.id, e.target.checked)}
            />
            <span>
              {label}
              {requiredMark}
            </span>
          </label>
          {helpNode}
          {errorNode}
        </div>
      );
    default: {
      const inputType =
        field.type === 'number'
          ? 'number'
          : field.type === 'email'
            ? 'email'
            : field.type === 'tel'
              ? 'tel'
              : field.type === 'date'
                ? 'date'
                : 'text';
      control = (
        <input
          {...commonProps}
          className="input"
          type={inputType}
          min={field.type === 'number' ? 0 : undefined}
          placeholder={field.placeholder}
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => setValue(field.id, e.target.value)}
        />
      );
    }
  }

  return (
    <div className="field">
      <label className="field-label" htmlFor={field.id}>
        {label}
        {requiredMark}
      </label>
      {helpNode}
      {control}
      {errorNode}
    </div>
  );
}
