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
  /** Always-visible contextual help beneath the label (clinical wording). */
  helpText?: string;
  /** Plain-language help for the public path. Falls back to `helpText`. */
  publicHelpText?: string;
  /**
   * Supplementary detail behind a toggle next to the label (PWS 1.3 tooltips).
   * Deliberately separate from `helpText`: help is the short guidance every
   * reporter should see, the tooltip is the longer answer only some will want.
   * Rendered as a keyboard-operable disclosure rather than a hover target, so
   * it is reachable without a mouse and on touch devices.
   */
  tooltip?: string;
  /** Plain-language tooltip for the public path. Falls back to `tooltip`. */
  publicTooltip?: string;
  /**
   * The VAERS data element this field maps to in the Government's target
   * schema, for example `VAX_LOT`.
   *
   * Deliberately empty in the prototype. PWS Section 9 states that CDC
   * furnishes the authoritative data element definitions, business rules, and
   * integration requirements at kickoff, so the target names do not exist yet.
   * The seam is built now so that populating it later is a configuration
   * change in one place rather than a rework of the output layer (PWS 1.9).
   *
   * Unlike `label` and `helpText`, this is *structure*, not presentation. It is
   * not editable from the low-code admin surface, which under PWS 1.8 covers
   * content and interface only. Changing a mapping is a developer action under
   * change control, because it moves where an answer lands in the database.
   */
  vaersElement?: string;
  /** Field is shown only when ALL of these predicates hold. */
  visibleWhen?: Condition[];
  /** Field is hidden when ALL of these predicates hold (overrides visibleWhen). */
  suppressWhen?: Condition[];
}

/**
 * Marks a section as a repeatable group. A reporter can add more than one
 * instance of the whole field set, which VAERS needs because several vaccines
 * are commonly given at the same visit.
 */
export interface RepeatConfig {
  /** Instances always present. At least one. */
  min: number;
  /** Upper bound, to keep the form finite. */
  max: number;
  /** Label for one instance, for example "Vaccine". */
  itemLabel: string;
  /** Text on the add control. */
  addLabel: string;
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
  /** Present when the section can be repeated. */
  repeat?: RepeatConfig;
}

/** A question on one of the satisfaction surveys. */
export interface SurveyQuestion {
  id: string;
  label: string;
  type: 'radio' | 'textarea';
  options?: FieldOption[];
}

export interface SurveyConfig {
  id: string;
  title: string;
  intro?: string;
  thanks: string;
  questions: SurveyQuestion[];
}

export interface FormConfig {
  version: string;
  title: string;
  intro?: string;
  sections: SectionConfig[];
  /** Both satisfaction instruments, keyed by where they are used. */
  surveys: {
    siteNavigation: SurveyConfig;
    postSubmission: SurveyConfig;
  };
}

/** Values for a repeated section are stored per instance under this key. */
export function repeatFieldId(fieldId: string, instance: number): string {
  return instance === 0 ? fieldId : `${fieldId}__${instance}`;
}

/** How many instances of a repeatable section are currently present. */
export function repeatCountKey(sectionId: string): string {
  return `__repeat__${sectionId}`;
}

/** The user's answers, keyed by field id. */
export type FormValues = Record<string, string | string[] | boolean | undefined>;
