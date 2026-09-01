// ---------------------------------------------------------------------------
// Config store - the low-code layer (Task 1.8).
//
// The base form schema (vaersForm) is immutable code. The admin surface writes
// a sparse *overrides* patch (per-field / per-section content edits), a list of
// admin-created questions with their visibility conditions, and FAQ content,
// all persisted to localStorage. The effective config the whole app renders
// from is `applyOverrides(base, overrides)`, recomputed reactively - so an
// admin edit updates the live form with no redeploy. Conditions are the same
// declarative predicates the engine already evaluates, so an added question's
// branching runs through the identical tested path as the base schema's, and
// the base schema's own predicates stay immutable from this surface.
// ---------------------------------------------------------------------------
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type {
  Condition,
  FieldConfig,
  FormConfig,
  RequiredRule,
  SectionConfig,
} from '../config/types';
import { vaersForm } from '../config/vaersForm';
import { checkConfiguration, type ConfigCheckResult } from '../formEngine/configCheck';
import { defaultFaqs, type FaqItem } from '../config/faqs';

export interface FieldOverride {
  label?: string;
  publicLabel?: string;
  helpText?: string;
  publicHelpText?: string;
  tooltip?: string;
  publicTooltip?: string;
  placeholder?: string;
  required?: RequiredRule;
  /**
   * Visibility rule override for a base-schema question (Amendment 1 Q&A 165):
   * a Condition[] replaces the base rule, null clears it (always shown),
   * undefined leaves the base rule untouched. Reverting the field restores
   * the base rule, exactly like every other override.
   */
  visibleWhen?: Condition[] | null;
}
export interface SectionOverride {
  title?: string;
  publicTitle?: string;
  description?: string;
  publicDescription?: string;
}
/** An admin-created question and the section it belongs to. */
export interface AddedField {
  sectionId: string;
  field: FieldConfig;
}
export interface ConfigOverrides {
  fields: Record<string, FieldOverride>;
  sections: Record<string, SectionOverride>;
  /** Questions created through the admin surface, appended to their sections. */
  added?: AddedField[];
}

const STORAGE_KEY = 'vaers.admin.v1';
const emptyOverrides = (): ConfigOverrides => ({ fields: {}, sections: {}, added: [] });

// --- Override application ---------------------------------------------------

function definedOnly<T extends object>(o: T): Partial<T> {
  const out: Partial<T> = {};
  for (const k in o) if (o[k] !== undefined) out[k] = o[k];
  return out;
}

/** Fold the overrides patch onto the base schema, producing the live config. */
export function applyOverrides(base: FormConfig, ov: ConfigOverrides): FormConfig {
  const added = ov.added ?? [];
  return {
    ...base,
    sections: base.sections.map((section) => {
      const so = ov.sections[section.id];
      const own = added.filter((a) => a.sectionId === section.id).map((a) => a.field);
      const fields = [...section.fields, ...own].map((field) => {
        const fo = ov.fields[field.id];
        if (!fo) return field;
        const { visibleWhen, ...rest } = fo;
        const merged = { ...field, ...definedOnly(rest) };
        if (visibleWhen !== undefined) {
          if (visibleWhen === null) delete merged.visibleWhen;
          else merged.visibleWhen = visibleWhen;
        }
        return merged;
      });
      return so ? { ...section, ...definedOnly(so), fields } : { ...section, fields };
    }),
  };
}

function requiredKey(r?: RequiredRule): 'required' | 'conditional' | 'optional' {
  return r === true ? 'required' : r === 'conditional' ? 'conditional' : 'optional';
}

/**
 * Keep only the keys that genuinely differ from the base, so re-typing the
 * default value clears the override (and the "Modified" badge). Returns null
 * when nothing differs.
 */
function normalizeFieldOverride(candidate: FieldOverride, base: FieldConfig): FieldOverride | null {
  const out: FieldOverride = {};
  const textKeys = [
    'label',
    'publicLabel',
    'helpText',
    'publicHelpText',
    'tooltip',
    'publicTooltip',
    'placeholder',
  ] as const;
  for (const k of textKeys) {
    const v = candidate[k];
    if (v === undefined) continue;
    if (v === ((base[k] as string | undefined) ?? '')) continue;
    out[k] = v;
  }
  if (candidate.required !== undefined && requiredKey(candidate.required) !== requiredKey(base.required)) {
    out.required = candidate.required;
  }
  if (candidate.visibleWhen !== undefined) {
    const baseRule = JSON.stringify(base.visibleWhen ?? null);
    const cand = JSON.stringify(candidate.visibleWhen);
    if (cand !== baseRule) out.visibleWhen = candidate.visibleWhen;
  }
  return Object.keys(out).length ? out : null;
}

function normalizeSectionOverride(candidate: SectionOverride, base: SectionConfig): SectionOverride | null {
  const out: SectionOverride = {};
  const keys = ['title', 'publicTitle', 'description', 'publicDescription'] as const;
  for (const k of keys) {
    const v = candidate[k];
    if (v === undefined) continue;
    if (v === ((base[k] as string | undefined) ?? '')) continue;
    out[k] = v;
  }
  return Object.keys(out).length ? out : null;
}

// --- Persistence ------------------------------------------------------------

interface StoredState {
  version: string;
  overrides: ConfigOverrides;
  faqs: FaqItem[];
}

function loadState(): { overrides: ConfigOverrides; faqs: FaqItem[] } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { overrides: emptyOverrides(), faqs: defaultFaqs };
    const parsed = JSON.parse(raw) as Partial<StoredState>;
    const o = parsed.overrides;
    return {
      overrides:
        o && typeof o === 'object'
          ? {
              fields: o.fields ?? {},
              sections: o.sections ?? {},
              added: Array.isArray(o.added)
                ? o.added.filter((a) => a && a.sectionId && a.field && a.field.id)
                : [],
            }
          : emptyOverrides(),
      faqs: Array.isArray(parsed.faqs) ? parsed.faqs : defaultFaqs,
    };
  } catch {
    return { overrides: emptyOverrides(), faqs: defaultFaqs };
  }
}

function saveState(state: StoredState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* localStorage unavailable / full - non-fatal for the demo. */
  }
}

function makeFaqId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return `faq-${crypto.randomUUID()}`;
  return `faq-${Date.now().toString(36)}`;
}

/** The overrides that a visibility-rule change would produce, without applying them. */
function withFieldCondition(
  prev: ConfigOverrides,
  fieldId: string,
  conds: Condition[] | null,
): ConfigOverrides {
  if ((prev.added ?? []).some((a) => a.field.id === fieldId)) {
    return {
      ...prev,
      added: (prev.added ?? []).map((a) =>
        a.field.id === fieldId
          ? { ...a, field: { ...a.field, visibleWhen: conds ?? undefined } }
          : a,
      ),
    };
  }
  return {
    ...prev,
    fields: { ...prev.fields, [fieldId]: { ...(prev.fields[fieldId] ?? {}), visibleWhen: conds } },
  };
}

// --- Context ----------------------------------------------------------------

interface ConfigContextValue {
  /** The live, override-applied config the app renders from. */
  config: FormConfig;
  faqs: FaqItem[];
  isCustomized: boolean;
  setFieldOverride: (fieldId: string, patch: FieldOverride) => void;
  setSectionOverride: (sectionId: string, patch: SectionOverride) => void;
  resetField: (fieldId: string) => void;
  resetSection: (sectionId: string) => void;
  isFieldModified: (fieldId: string) => boolean;
  isSectionModified: (sectionId: string) => boolean;
  addFaq: () => void;
  updateFaq: (id: string, patch: Partial<Omit<FaqItem, 'id'>>) => void;
  removeFaq: (id: string) => void;
  resetAll: () => void;
  /** Create a question in a section; returns its generated id. */
  addField: (sectionId: string, spec: Omit<FieldConfig, 'id'>) => string;
  /** Patch an admin-created question (wording, requiredness, visibility condition). */
  updateAddedField: (fieldId: string, patch: Partial<Omit<FieldConfig, 'id'>>) => void;
  /** Remove an admin-created question. Base-schema questions cannot be removed here. */
  removeAddedField: (fieldId: string) => void;
  /** True when the field was created through the admin surface. */
  isFieldAdded: (fieldId: string) => boolean;
  /** Replace or clear the visibility condition of an admin-created question. */
  setAddedFieldCondition: (fieldId: string, conds: Condition[] | null) => void;
  /**
   * Replace or clear the visibility rule of any question, base or added.
   * Refused, with a plain-language reason, when the rule would break the
   * configuration (PRS#1): the change is checked against the whole decision
   * matrix before it is accepted, so a contradiction never reaches the form.
   */
  setFieldCondition: (fieldId: string, conds: Condition[] | null) => ConditionResult;
  /** Live integrity check of the configuration now on screen. */
  configCheck: ConfigCheckResult;
}

export interface ConditionResult {
  ok: boolean;
  /** Why the change was refused, written for a program officer. */
  reason?: string;
}

const ConfigContext = createContext<ConfigContextValue | null>(null);

export function ConfigProvider({ children }: { children: ReactNode }) {
  const initial = useRef(loadState());
  const [overrides, setOverrides] = useState<ConfigOverrides>(initial.current.overrides);
  const [faqs, setFaqs] = useState<FaqItem[]>(initial.current.faqs);

  const fieldIndex = useMemo(() => {
    const m = new Map<string, FieldConfig>();
    for (const s of vaersForm.sections) for (const f of s.fields) m.set(f.id, f);
    return m;
  }, []);
  const sectionIndex = useMemo(() => {
    const m = new Map<string, SectionConfig>();
    for (const s of vaersForm.sections) m.set(s.id, s);
    return m;
  }, []);

  useEffect(() => {
    saveState({ version: vaersForm.version, overrides, faqs });
  }, [overrides, faqs]);

  const config = useMemo(() => applyOverrides(vaersForm, overrides), [overrides]);
  const configCheck = useMemo(() => checkConfiguration(config), [config]);

  const setFieldOverride = useCallback(
    (fieldId: string, patch: FieldOverride) => {
      const base = fieldIndex.get(fieldId);
      if (!base) return;
      setOverrides((prev) => {
        const merged = { ...prev.fields[fieldId], ...patch };
        const normalized = normalizeFieldOverride(merged, base);
        const fields = { ...prev.fields };
        if (normalized) fields[fieldId] = normalized;
        else delete fields[fieldId];
        return { ...prev, fields };
      });
    },
    [fieldIndex],
  );

  const setSectionOverride = useCallback(
    (sectionId: string, patch: SectionOverride) => {
      const base = sectionIndex.get(sectionId);
      if (!base) return;
      setOverrides((prev) => {
        const merged = { ...prev.sections[sectionId], ...patch };
        const normalized = normalizeSectionOverride(merged, base);
        const sections = { ...prev.sections };
        if (normalized) sections[sectionId] = normalized;
        else delete sections[sectionId];
        return { ...prev, sections };
      });
    },
    [sectionIndex],
  );

  const resetField = useCallback((fieldId: string) => {
    setOverrides((prev) => {
      if (!prev.fields[fieldId]) return prev;
      const fields = { ...prev.fields };
      delete fields[fieldId];
      return { ...prev, fields };
    });
  }, []);

  const resetSection = useCallback((sectionId: string) => {
    setOverrides((prev) => {
      if (!prev.sections[sectionId]) return prev;
      const sections = { ...prev.sections };
      delete sections[sectionId];
      return { ...prev, sections };
    });
  }, []);

  const addFaq = useCallback(() => {
    setFaqs((prev) => [...prev, { id: makeFaqId(), question: '', answer: '' }]);
  }, []);
  const updateFaq = useCallback((id: string, patch: Partial<Omit<FaqItem, 'id'>>) => {
    setFaqs((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  }, []);
  const removeFaq = useCallback((id: string) => {
    setFaqs((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const resetAll = useCallback(() => {
    setOverrides(emptyOverrides());
    setFaqs(defaultFaqs);
  }, []);

  // --- Admin-created questions ---------------------------------------------

  const addField = useCallback(
    (sectionId: string, spec: Omit<FieldConfig, 'id'>): string => {
      const slug =
        (spec.label || 'question')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '_')
          .replace(/^_+|_+$/g, '')
          .slice(0, 40) || 'question';
      let id = `custom_${slug}`;
      setOverrides((prev) => {
        const taken = new Set<string>([
          ...[...fieldIndex.keys()],
          ...(prev.added ?? []).map((a) => a.field.id),
        ]);
        let n = 2;
        while (taken.has(id)) id = `custom_${slug}_${n++}`;
        return { ...prev, added: [...(prev.added ?? []), { sectionId, field: { ...spec, id } }] };
      });
      return id;
    },
    [fieldIndex],
  );

  const updateAddedField = useCallback(
    (fieldId: string, patch: Partial<Omit<FieldConfig, 'id'>>) => {
      setOverrides((prev) => ({
        ...prev,
        added: (prev.added ?? []).map((a) =>
          a.field.id === fieldId ? { ...a, field: { ...a.field, ...patch } } : a,
        ),
      }));
    },
    [],
  );

  const removeAddedField = useCallback((fieldId: string) => {
    setOverrides((prev) => ({
      ...prev,
      added: (prev.added ?? []).filter((a) => a.field.id !== fieldId),
    }));
  }, []);

  const setAddedFieldCondition = useCallback(
    (fieldId: string, conds: Condition[] | null) => {
      setOverrides((prev) => ({
        ...prev,
        added: (prev.added ?? []).map((a) =>
          a.field.id === fieldId
            ? { ...a, field: { ...a.field, visibleWhen: conds ?? undefined } }
            : a,
        ),
      }));
    },
    [],
  );

  const faqsChanged = useMemo(
    () => JSON.stringify(faqs) !== JSON.stringify(defaultFaqs),
    [faqs],
  );
  const isCustomized =
    Object.keys(overrides.fields).length > 0 ||
    Object.keys(overrides.sections).length > 0 ||
    (overrides.added ?? []).length > 0 ||
    faqsChanged;

  const value: ConfigContextValue = {
    config,
    faqs,
    isCustomized,
    setFieldOverride,
    setSectionOverride,
    resetField,
    resetSection,
    isFieldModified: (id) => Boolean(overrides.fields[id]),
    isSectionModified: (id) => Boolean(overrides.sections[id]),
    addFaq,
    updateFaq,
    removeFaq,
    resetAll,
    addField,
    updateAddedField,
    removeAddedField,
    isFieldAdded: (id) => (overrides.added ?? []).some((a) => a.field.id === id),
    setAddedFieldCondition,
    configCheck,
    setFieldCondition: (id, conds) => {
      // Check the whole matrix before accepting the edit. Only issues this
      // change would introduce block it; anything already outstanding is not
      // held against the author.
      const candidate = applyOverrides(vaersForm, withFieldCondition(overrides, id, conds));
      const introduced = checkConfiguration(candidate).issues.filter(
        (next) =>
          !configCheck.issues.some((now) => now.code === next.code && now.target === next.target),
      );
      if (introduced.length > 0) return { ok: false, reason: introduced[0].message };
      if ((overrides.added ?? []).some((a) => a.field.id === id)) setAddedFieldCondition(id, conds);
      else setFieldOverride(id, { visibleWhen: conds });
      return { ok: true };
    },
  };

  return <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useConfig(): ConfigContextValue {
  const ctx = useContext(ConfigContext);
  if (!ctx) throw new Error('useConfig must be used within a ConfigProvider');
  return ctx;
}
