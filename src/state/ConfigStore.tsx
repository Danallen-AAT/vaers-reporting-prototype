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
import {
  checkConfiguration,
  isBlankText,
  type ConfigCheckResult,
} from '../formEngine/configCheck';
import { defaultFaqs, type FaqItem } from '../config/faqs';
import {
  englishStrings,
  LOCALES,
  localizeConfig,
  localizeFaqs,
  type Locale,
  type Translations,
} from '../config/locale';
import { es } from '../config/es';
import { useLocale } from './LocaleStore';

/**
 * The languages the form is published in, and the content that makes each one
 * real. English is the base schema itself, so it needs no map; every other
 * language is a translation map that ships with the build and can be extended
 * through the configuration screen. Adding a third language is adding a row.
 */
const SHIPPED_TRANSLATIONS: Partial<Record<Locale, Translations>> = { es };

/**
 * The languages a draft must be complete in before it can go live. English is
 * excluded because it is the base: a question always exists in English by
 * virtue of having been typed.
 */
export const REQUIRED_LOCALES = LOCALES.filter((l) => l.code !== 'en');

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
  /**
   * Questions relocated to a different section, as question id to section id.
   * Membership is the only thing this changes: the question keeps its wording,
   * its rule and its identity, so a relocation cannot alter what it collects.
   */
  moved?: Record<string, string>;
  /**
   * Translated wording authored through the configuration screen, keyed by
   * language and then by string key. It sits in the overrides rather than
   * beside them because it is the same kind of thing: content CDC owns, held as
   * a draft, and made live by the same publish. A question and its Spanish go
   * live together or not at all.
   */
  translations?: Partial<Record<Locale, Translations>>;
  /**
   * The English each translated string was written against. Kept so a later
   * edit to the English can be told apart from wording nobody has touched: a
   * translation whose source sentence has been rewritten is stale, and a count
   * of translated strings cannot see that.
   */
  translatedFrom?: Partial<Record<Locale, Translations>>;
}

const STORAGE_KEY = 'vaers.admin.v1';
const DRAFT_KEY = 'vaers.admin.draft.v1';
const HISTORY_KEY = 'vaers.admin.history.v1';

/** One published version, kept so a program office can see and undo its own history. */
export interface PublishedVersion {
  id: string;
  /** What the publisher called this change. */
  label: string;
  /** ISO timestamp of the publish. */
  at: string;
  /** Who published it, from the signed-in admin session. */
  by: string;
  overrides: ConfigOverrides;
  faqs: FaqItem[];
}
const emptyOverrides = (): ConfigOverrides => ({
  fields: {},
  sections: {},
  added: [],
  moved: {},
  translations: {},
  translatedFrom: {},
});

/** The English the shipped translations were written against: the schema itself. */
const BASE_ENGLISH: Translations = englishStrings(vaersForm, defaultFaqs);

/** Shipped wording for one language, with the configuration screen's edits on top. */
function effectiveTranslations(ov: ConfigOverrides, locale: Locale): Translations {
  return { ...(SHIPPED_TRANSLATIONS[locale] ?? {}), ...(ov.translations?.[locale] ?? {}) };
}

/** Only the keys a stored object actually holds, discarding anything malformed. */
function readTranslations(value: unknown): Partial<Record<Locale, Translations>> {
  if (!value || typeof value !== 'object') return {};
  const out: Partial<Record<Locale, Translations>> = {};
  for (const { code } of LOCALES) {
    const map = (value as Record<string, unknown>)[code];
    if (!map || typeof map !== 'object') continue;
    const clean: Translations = {};
    for (const [k, v] of Object.entries(map as Record<string, unknown>)) {
      if (typeof v === 'string') clean[k] = v;
    }
    out[code] = clean;
  }
  return out;
}

// --- Override application ---------------------------------------------------

function definedOnly<T extends object>(o: T): Partial<T> {
  const out: Partial<T> = {};
  for (const k in o) if (o[k] !== undefined) out[k] = o[k];
  return out;
}

/** Fold the overrides patch onto the base schema, producing the live config. */
export function applyOverrides(base: FormConfig, ov: ConfigOverrides): FormConfig {
  const added = ov.added ?? [];
  const moved = ov.moved ?? {};
  // Where every question lives once relocations are applied.
  const homeOf = (fieldId: string, original: string) => moved[fieldId] ?? original;
  const basePlaces = base.sections.flatMap((s) =>
    s.fields.map((field) => ({ home: homeOf(field.id, s.id), field })),
  );
  const addedPlaces = added.map((a) => ({ home: homeOf(a.field.id, a.sectionId), field: a.field }));
  const places = [...basePlaces, ...addedPlaces];
  return {
    ...base,
    sections: base.sections.map((section) => {
      const so = ov.sections[section.id];
      const fields = places
        .filter((p) => p.home === section.id)
        .map((p) => p.field)
        .map((field) => {
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

function readSnapshot(key: string): { overrides: ConfigOverrides; faqs: FaqItem[] } | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredState>;
    const o = parsed.overrides;
    if (!o || typeof o !== 'object') return null;
    return {
      overrides: {
        fields: o.fields ?? {},
        sections: o.sections ?? {},
        added: Array.isArray(o.added) ? o.added.filter((a) => a && a.sectionId && a.field?.id) : [],
        moved: o.moved ?? {},
        translations: readTranslations(o.translations),
        translatedFrom: readTranslations(o.translatedFrom),
      },
      faqs: Array.isArray(parsed.faqs) ? parsed.faqs : defaultFaqs,
    };
  } catch {
    return null;
  }
}

function loadHistory(): PublishedVersion[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const parsed = raw ? (JSON.parse(raw) as PublishedVersion[]) : [];
    return Array.isArray(parsed) ? parsed.filter((v) => v && v.id && v.at) : [];
  } catch {
    return [];
  }
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
              moved: o.moved ?? {},
              translations: readTranslations(o.translations),
              translatedFrom: readTranslations(o.translatedFrom),
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
  /** Live integrity check of the draft now being edited. */
  configCheck: ConfigCheckResult;
  /** Draft wording in one language, shipped content with draft edits on top. */
  draftTranslations: (locale: Locale) => Translations;
  /** One translated string as the draft currently holds it, or '' if it has none. */
  translationOf: (locale: Locale, key: string) => string;
  /** Write one translated string into the draft. Blank clears the edit. */
  setTranslation: (locale: Locale, key: string, text: string, sourceEnglish?: string) => void;
  /** Keys whose English changed after their translation was written. */
  staleTranslations: Set<string>;
  /** Keys with no translation yet, so an editor can mark the inputs that need one. */
  missingTranslations: Set<string>;
  /** The draft the configuration screen edits and previews. */
  draftConfig: FormConfig;
  /** FAQ content in the draft. */
  draftFaqs: FaqItem[];
  /** True when the draft differs from what is published. */
  hasDraftChanges: boolean;
  /**
   * Make the draft live. Refused when the draft does not pass its own
   * integrity check, so a broken configuration cannot reach reporters.
   */
  publish: (label: string, by: string) => ConditionResult;
  /** Throw the draft away and start again from what is published. */
  discardDraft: () => void;
  /** Load a previously published version back into the draft. */
  restoreVersion: (versionId: string) => void;
  /** Publish history, newest first. */
  history: PublishedVersion[];
  /**
   * Move a question to another section. Checked the same way a rule change is,
   * so a relocation that would strand the question is refused with a reason.
   */
  moveField: (fieldId: string, sectionId: string) => ConditionResult;
  /** The section a question sits in now, after any relocation. */
  sectionOf: (fieldId: string) => string | undefined;
  /** True when the question has been moved out of the section it shipped in. */
  isFieldMoved: (fieldId: string) => boolean;
}

export interface ConditionResult {
  ok: boolean;
  /** Why the change was refused, written for a program officer. */
  reason?: string;
}

const ConfigContext = createContext<ConfigContextValue | null>(null);

export function ConfigProvider({ children }: { children: ReactNode }) {
  const { locale } = useLocale();
  const initial = useRef(loadState());
  const initialDraft = useRef(readSnapshot(DRAFT_KEY) ?? initial.current);
  // `overrides` / `faqs` are the DRAFT the admin edits. `published` is what the
  // reporting form renders, and only a publish moves one to the other.
  const [overrides, setOverrides] = useState<ConfigOverrides>(initialDraft.current.overrides);
  const [faqs, setFaqs] = useState<FaqItem[]>(initialDraft.current.faqs);
  const [published, setPublished] = useState(initial.current);
  const [history, setHistory] = useState<PublishedVersion[]>(() => loadHistory());

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
    saveState({ version: vaersForm.version, overrides: published.overrides, faqs: published.faqs });
  }, [published]);

  useEffect(() => {
    try {
      localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({ version: vaersForm.version, overrides, faqs }),
      );
    } catch {
      /* localStorage unavailable or full, non-fatal for the demo. */
    }
  }, [overrides, faqs]);

  // The published configuration and its history are shared by every tab, so a
  // tab that has been sitting idle must not serialise its stale copy over
  // another tab's work. Publishing writes them (merging with what is stored),
  // and a storage event pulls another tab's publish into this one.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === HISTORY_KEY) setHistory(loadHistory());
      else if (e.key === STORAGE_KEY) setPublished(loadState());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  /**
   * What the reporting form renders: the published configuration, read in the
   * reporter's language. Localising here rather than in each component is what
   * keeps language out of the branching engine entirely, because everything
   * downstream receives one already-translated configuration and cannot tell
   * which language it is in.
   */
  const config = useMemo(
    () =>
      localizeConfig(
        applyOverrides(vaersForm, published.overrides),
        locale,
        effectiveTranslations(published.overrides, locale),
      ),
    [published, locale],
  );
  const localFaqs = useMemo(
    () => localizeFaqs(published.faqs, locale, effectiveTranslations(published.overrides, locale)),
    [published, locale],
  );
  /** What the configuration screen edits: always the English base. */
  const draftConfig = useMemo(() => applyOverrides(vaersForm, overrides), [overrides]);
  // Built once per draft change rather than once per caller. The configuration
  // screen renders one of these components per translatable string, and
  // rebuilding a few hundred entries inside each of them turned every keystroke
  // into thousands of property copies.
  const draftTranslationMaps = useMemo(() => {
    const out: Record<string, Translations> = {};
    for (const { code } of LOCALES) out[code] = effectiveTranslations(overrides, code);
    return out;
  }, [overrides]);
  const draftTranslations = useCallback(
    (which: Locale) => draftTranslationMaps[which] ?? {},
    [draftTranslationMaps],
  );
  /**
   * The check the draft is held to. Every language other than the base is a
   * requirement, so a question added in English alone fails the check and
   * cannot be published. Only the first language is reported at a
   * time, which keeps the message a person can act on.
   */
  const translationRequirement = useMemo(() => {
    const required = REQUIRED_LOCALES[0];
    if (!required) return undefined;
    return {
      locale: required.code,
      languageName: required.label,
      translations: effectiveTranslations(overrides, required.code),
      translatedFrom: overrides.translatedFrom?.[required.code] ?? {},
      baseEnglish: BASE_ENGLISH,
      faqs,
    };
  }, [overrides, faqs]);
  const configCheck = useMemo(
    () => checkConfiguration(draftConfig, vaersForm, translationRequirement),
    [draftConfig, translationRequirement],
  );
  const missingTranslations = useMemo(
    () => new Set(configCheck.missingTranslations),
    [configCheck],
  );
  const staleTranslations = useMemo(
    () => new Set(configCheck.staleTranslations),
    [configCheck],
  );

  const setTranslation = useCallback(
    (which: Locale, key: string, text: string, sourceEnglish?: string) => {
      setOverrides((prev) => {
        const shipped = SHIPPED_TRANSLATIONS[which]?.[key];
        const forLocale = { ...(prev.translations?.[which] ?? {}) };
        const fromLocale = { ...(prev.translatedFrom?.[which] ?? {}) };
        // Typing the shipped wording back in is not an edit, so it clears rather
        // than being stored as an override that shadows an identical string.
        if (text === '' || text === shipped) {
          delete forLocale[key];
          delete fromLocale[key];
        } else {
          forLocale[key] = text;
          // Stamped with the English on screen at the time, which is what makes
          // a later edit to that English detectable as leaving this behind.
          if (sourceEnglish !== undefined) fromLocale[key] = sourceEnglish;
        }
        return {
          ...prev,
          translations: { ...(prev.translations ?? {}), [which]: forLocale },
          translatedFrom: { ...(prev.translatedFrom ?? {}), [which]: fromLocale },
        };
      });
    },
    [],
  );
  const hasDraftChanges = useMemo(
    () =>
      JSON.stringify({ o: overrides, f: faqs }) !==
      JSON.stringify({ o: published.overrides, f: published.faqs }),
    [overrides, faqs, published],
  );

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
      const moved = { ...(prev.moved ?? {}) };
      const wasMoved = fieldId in moved;
      const prefix = `field.${fieldId}.`;
      const hadTranslation = Object.values(prev.translations ?? {}).some((m) =>
        Object.keys(m ?? {}).some((k) => k.startsWith(prefix)),
      );
      if (!prev.fields[fieldId] && !wasMoved && !hadTranslation) return prev;
      const fields = { ...prev.fields };
      delete fields[fieldId];
      delete moved[fieldId];
      // Reverting a question returns its wording to how it shipped in every
      // language. Leaving a translation of wording that no longer exists behind
      // would be worse than having none.
      const translations: Partial<Record<Locale, Translations>> = {};
      for (const [code, map] of Object.entries(prev.translations ?? {})) {
        const kept: Translations = {};
        for (const [k, v] of Object.entries(map ?? {})) if (!k.startsWith(prefix)) kept[k] = v;
        translations[code as Locale] = kept;
      }
      return { ...prev, fields, moved, translations };
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
  const translationsChanged = Object.values(overrides.translations ?? {}).some(
    (m) => Object.keys(m ?? {}).length > 0,
  );
  const isCustomized =
    translationsChanged ||
    Object.keys(overrides.moved ?? {}).length > 0 ||
    Object.keys(overrides.fields).length > 0 ||
    Object.keys(overrides.sections).length > 0 ||
    (overrides.added ?? []).length > 0 ||
    faqsChanged;

  const value: ConfigContextValue = {
    config,
    faqs: localFaqs,
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
    draftTranslations,
    translationOf: (which, key) => overrides.translations?.[which]?.[key] ?? '',
    setTranslation,
    missingTranslations,
    staleTranslations,
    draftConfig,
    draftFaqs: faqs,
    hasDraftChanges,
    history,
    publish: (label, by) => {
      const check = checkConfiguration(draftConfig, vaersForm, translationRequirement);
      if (!check.ok) {
        return {
          ok: false,
          reason: `The draft does not pass its own check, so it cannot go live. ${check.issues[0].message}`,
        };
      }
      // A separate condition with a separate message. The form is sound; it is
      // just not finished in every language it publishes in yet.
      if (!check.translationOk) {
        return {
          ok: false,
          reason: `Not every question is translated yet, so this cannot go live. ${check.translationIssues[0].message}`,
        };
      }
      // The audit trail's whole value is saying why, so a description of
      // nothing at all, including invisible characters, is refused rather than
      // recorded as "Untitled change".
      if (isBlankText(label)) {
        return {
          ok: false,
          reason: 'Describe this change before publishing, so the history records why it happened.',
        };
      }
      const entry: PublishedVersion = {
        id: `v${Date.now().toString(36)}`,
        label: label.trim(),
        at: new Date().toISOString(),
        by: by || 'Unknown',
        overrides,
        faqs,
      };
      const merged = [entry, ...loadHistory()].slice(0, 50);
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(merged));
      } catch {
        /* localStorage unavailable or full, non-fatal for the demo. */
      }
      setPublished({ overrides, faqs });
      setHistory(merged);
      return { ok: true };
    },
    discardDraft: () => {
      setOverrides(published.overrides);
      setFaqs(published.faqs);
    },
    restoreVersion: (versionId) => {
      const v = history.find((h) => h.id === versionId);
      if (!v) return;
      setOverrides(v.overrides);
      setFaqs(v.faqs);
    },
    sectionOf: (id) => draftConfig.sections.find((s) => s.fields.some((f) => f.id === id))?.id,
    isFieldMoved: (id) => id in (overrides.moved ?? {}),
    moveField: (id, sectionId) => {
      const candidate = applyOverrides(vaersForm, {
        ...overrides,
        moved: { ...(overrides.moved ?? {}), [id]: sectionId },
      });
      const introduced = checkConfiguration(candidate, vaersForm).issues.filter(
        (next) =>
          !configCheck.issues.some((now) => now.code === next.code && now.target === next.target),
      );
      if (introduced.length > 0) return { ok: false, reason: introduced[0].message };
      setOverrides((prev) => ({
        ...prev,
        moved: { ...(prev.moved ?? {}), [id]: sectionId },
      }));
      return { ok: true };
    },
    setFieldCondition: (id, conds) => {
      // Check the whole matrix before accepting the edit. Only issues this
      // change would introduce block it; anything already outstanding is not
      // held against the author.
      const candidate = applyOverrides(vaersForm, withFieldCondition(overrides, id, conds));
      const introduced = checkConfiguration(candidate, vaersForm).issues.filter(
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
