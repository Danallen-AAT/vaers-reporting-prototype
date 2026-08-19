// ---------------------------------------------------------------------------
// Config-driven form engine - schema types.
//
// The entire VAERS form (sections, fields, field types, validation, branching
// rules, help text, and plain-language variants) is expressed as data using
// these types. A single generic renderer builds the UI from it, and the
// admin/low-code surface (PWS 1.8) edits this same schema at runtime. Keeping
// the branching declarative - as `visibleWhen` / `suppressWhen` predicates -
// is what makes PRS#1 correctness testable in isolation from the UI.
// ---------------------------------------------------------------------------

/** Which reporter path a field/section belongs to. */
export type ReporterPath = 'both' | 'public' | 'provider';

export type FieldType =
  | 'text'
  | 'email'
  | 'tel'
  | 'date'
  | 'select'
  | 'multiselect'
  | 'checkbox'
  | 'radio'
  | 'textarea'
  | 'number'
  | 'file';

export interface FieldOption {
  value: string;
  label: string;
}

/**
 * A single branching predicate evaluated against the current answers.
 * Exactly one operator is expected per condition; a list of conditions is
 * AND-ed together (see `evalConditions`).
 */
export interface Condition {
  /** The id of the field whose answer this predicate inspects. */
  field: string;
  /** Answer must strictly equal this value. */
  equals?: string;
  /** Answer must not equal this value. */
  notEquals?: string;
  /** Scalar answer must be one of these values. */
  in?: string[];
  /** Multiselect answer array must include this value. */
  includes?: string;
  /** Answer must be non-empty (true) or empty (false). */
  isFilled?: boolean;
}

/** `true` = always required; `'conditional'` = required only while visible. */
export type RequiredRule = boolean | 'conditional';

export interface FieldConfig {
  id: string;
  /** Clinical label - the default, used on the provider path. */
  label: string;
  /** Plain-language label for the public path. Falls back to `label`. */
  publicLabel?: string;
  type: FieldType;
  path: ReporterPath;
  required?: RequiredRule;
  options?: FieldOption[];
  placeholder?: string;
  /** Contextual help / tooltip (clinical wording). */
  helpText?: string;
  /** Plain-language help for the public path. Falls back to `helpText`. */
  publicHelpText?: string;
  /** Field is shown only when ALL of these predicates hold. */
  visibleWhen?: Condition[];
  /** Field is hidden when ALL of these predicates hold (overrides visibleWhen). */
  suppressWhen?: Condition[];
}

export interface SectionConfig {
  id: string;
  title: string;
  publicTitle?: string;
  description?: string;
  publicDescription?: string;
  path?: ReporterPath;
  fields: FieldConfig[];
  visibleWhen?: Condition[];
  suppressWhen?: Condition[];
}

export interface FormConfig {
  version: string;
  title: string;
  intro?: string;
  sections: SectionConfig[];
}

/** The user's answers, keyed by field id. */
export type FormValues = Record<string, string | string[] | boolean | undefined>;
