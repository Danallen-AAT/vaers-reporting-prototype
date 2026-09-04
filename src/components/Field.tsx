// ---------------------------------------------------------------------------
// Generic, accessible field renderer. Every input type in the schema is drawn
// from here - labels/help swap to plain language on the public path, groups use
// <fieldset>/<legend>, and errors are wired via aria-describedby / aria-invalid.
// ---------------------------------------------------------------------------
import { useState } from 'react';
import { repeatFieldId, type FieldConfig } from '../config/types';
import { useForm } from '../state/FormContext';
import { useLocale } from '../state/LocaleStore';
import { FileUpload } from './FileUpload';

function labelFor(field: FieldConfig, isPublic: boolean): string {
  return isPublic && field.publicLabel ? field.publicLabel : field.label;
}

function helpFor(field: FieldConfig, isPublic: boolean): string | undefined {
  return isPublic && field.publicHelpText ? field.publicHelpText : field.helpText;
}

function tooltipFor(field: FieldConfig, isPublic: boolean): string | undefined {
  return isPublic && field.publicTooltip ? field.publicTooltip : field.tooltip;
}

export function Field({ field, instance = 0 }: { field: FieldConfig; instance?: number }) {
  const { values, errors, setValue, activePath } = useForm();
  const { t } = useLocale();
  const isPublic = activePath === 'public';
  const [tipOpen, setTipOpen] = useState(false);

  // Repeated sections store each instance under its own key, so the DOM id,
  // the value, the error and every aria reference all use the same id.
  const key = repeatFieldId(field.id, instance);
  const value = values[key];
  const error = errors[key];
  const label = labelFor(field, isPublic);
  const help = helpFor(field, isPublic);
  const tip = tooltipFor(field, isPublic);
  const required = field.required === true || field.required === 'conditional';

  const helpId = help ? `${key}-help` : undefined;
  const errorId = error ? `${key}-error` : undefined;
  const tipId = tip ? `${key}-tip` : undefined;
  // The tooltip only describes the control while it is actually revealed;
  // pointing aria-describedby at hidden content announces nothing.
  const describedBy =
    [helpId, tipOpen ? tipId : undefined, errorId].filter(Boolean).join(' ') || undefined;

  const requiredMark = required ? (
    <>
      {' '}
      <span className="req" aria-hidden="true">
        *
      </span>
      <span className="sr-only"> {t('field.requiredSr')}</span>
    </>
  ) : null;

  const helpNode = help ? (
    <p className="help" id={helpId}>
      {help}
    </p>
  ) : null;

  // A disclosure button rather than a hover target: keyboard users and touch
  // users get the same content, and the panel stays in the DOM so aria-controls
  // always resolves.
  const tipToggle = tip ? (
    <button
      type="button"
      className="tip-toggle"
      aria-expanded={tipOpen}
      aria-controls={tipId}
      onClick={() => setTipOpen((o) => !o)}
    >
      <span aria-hidden="true">?</span>
      <span className="sr-only">
        {tipOpen
          ? t('field.hideGuidance', { label })
          : t('field.moreGuidance', { label })}
      </span>
    </button>
  ) : null;

  const tipNode = tip ? (
    <p className="tip" id={tipId} hidden={!tipOpen}>
      {tip}
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
        id={key}
        aria-describedby={describedBy}
        aria-invalid={error ? true : undefined}
      >
        <legend className="field-label">
          {label}
          {requiredMark}
          {tipToggle}
        </legend>
        {helpNode}
        {tipNode}
        <div className="options">
          {field.options?.map((opt) => {
            const optId = `${key}-${opt.value}`;
            if (field.type === 'radio') {
              return (
                <label className="option" key={opt.value} htmlFor={optId}>
                  <input
                    type="radio"
                    id={optId}
                    name={key}
                    value={opt.value}
                    checked={value === opt.value}
                    onChange={() => setValue(key, opt.value)}
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
                  name={key}
                  value={opt.value}
                  checked={checked}
                  onChange={(e) => {
                    const next = e.target.checked
                      ? [...selected, opt.value]
                      : selected.filter((v) => v !== opt.value);
                    setValue(key, next);
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
    id: key,
    name: key,
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
          onChange={(e) => setValue(key, e.target.value)}
        />
      );
      break;
    case 'select':
      control = (
        <select
          {...commonProps}
          className="input"
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => setValue(key, e.target.value)}
        >
          <option value="">{t('field.selectOne')}</option>
          {field.options?.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      );
      break;
    case 'file':
      control = <FileUpload fieldKey={key} field={field} describedBy={describedBy} />;
      break;
    case 'checkbox':
      // Single boolean checkbox.
      return (
        <div className="field field-inline">
          <label className="option" htmlFor={key}>
            <input
              {...commonProps}
              type="checkbox"
              checked={value === true}
              onChange={(e) => setValue(key, e.target.checked)}
            />
            <span>
              {label}
              {requiredMark}
            </span>
          </label>
          {tipToggle}
          {helpNode}
          {tipNode}
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
          onChange={(e) => setValue(key, e.target.value)}
        />
      );
    }
  }

  return (
    <div className="field">
      {/* The toggle sits beside the label rather than inside it, so clicking it
          does not also activate the control the label points at. */}
      <div className="label-row">
        <label className="field-label" htmlFor={key}>
          {label}
          {requiredMark}
        </label>
        {tipToggle}
      </div>
      {helpNode}
      {tipNode}
      {control}
      {errorNode}
    </div>
  );
}
