// ---------------------------------------------------------------------------
// Config store - the low-code layer (Task 1.8).
//
// The base form schema (vaersForm) is immutable code. The admin surface writes
// a sparse *overrides* patch (per-field / per-section content edits) plus FAQ
// content, both persisted to localStorage. The effective config the whole app
// renders from is `applyOverrides(base, overrides)`, recomputed reactively - so
// an admin edit updates the live form with no redeploy. Branching predicates
// are never touched here, so PRS#1 correctness is unaffected by admin edits.
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
  FieldConfig,
  FormConfig,
  RequiredRule,
  SectionConfig,
} from '../config/types';
import { vaersForm } from '../config/vaersForm';
import { defaultFaqs, type FaqItem } from '../config/faqs';

export interface FieldOverride {
  label?: string;
  publicLabel?: string;
  helpText?: string;
  publicHelpText?: string;
  placeholder?: string;
  required?: RequiredRule;
}
export interface SectionOverride {
  title?: string;
  publicTitle?: string;
  description?: string;
  publicDescription?: string;
}
export interface ConfigOverrides {
  fields: Record<string, FieldOverride>;
  sections: Record<string, SectionOverride>;
}

const STORAGE_KEY = 'vaers.admin.v1';
const emptyOverrides = (): ConfigOverrides => ({ fields: {}, sections: {} });

// --- Override application ---------------------------------------------------

function definedOnly<T extends object>(o: T): Partial<T> {
  const out: Partial<T> = {};
  for (const k in o) if (o[k] !== undefined) out[k] = o[k];
  return out;
}

/** Fold the overrides patch onto the base schema, producing the live config. */
export function applyOverrides(base: FormConfig, ov: ConfigOverrides): FormConfig {
  return {
    ...base,
    sections: base.sections.map((section) => {
      const so = ov.sections[section.id];
      const fields = section.fields.map((field) => {
        const fo = ov.fields[field.id];
        return fo ? { ...field, ...definedOnly(fo) } : field;
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
  const textKeys = ['label', 'publicLabel', 'helpText', 'publicHelpText', 'placeholder'] as const;
  for (const k of textKeys) {
    const v = candidate[k];
    if (v === undefined) continue;
    if (v === ((base[k] as string | undefined) ?? '')) continue;
    out[k] = v;
  }
  if (candidate.required !== undefined && requiredKey(candidate.required) !== requiredKey(base.required)) {
    out.required = candidate.required;
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
          ? { fields: o.fields ?? {}, sections: o.sections ?? {} }
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

  const faqsChanged = useMemo(
    () => JSON.stringify(faqs) !== JSON.stringify(defaultFaqs),
    [faqs],
  );
  const isCustomized =
    Object.keys(overrides.fields).length > 0 ||
    Object.keys(overrides.sections).length > 0 ||
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
  };

  return <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useConfig(): ConfigContextValue {
  const ctx = useContext(ConfigContext);
  if (!ctx) throw new Error('useConfig must be used within a ConfigProvider');
  return ctx;
}
