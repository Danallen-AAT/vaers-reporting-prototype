// ---------------------------------------------------------------------------
// Lightweight form state. Holds the answers, derives the active reporter path,
// and revalidates live after the first submit attempt. Kept intentionally small
// (React context, no external store) per the stack decisions in CLAUDE.md.
// ---------------------------------------------------------------------------
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  repeatCountKey,
  repeatFieldId,
  type FormConfig,
  type FormValues,
  type SectionConfig,
} from '../config/types';
import { getReporterPath, getRepeatCount, type ActivePath } from '../formEngine/visibility';
import { validateForm, type Errors } from '../formEngine/validation';

interface FormContextValue {
  config: FormConfig;
  values: FormValues;
  errors: Errors;
  activePath: ActivePath;
  submitted: boolean;
  setValue: (id: string, value: FormValues[string]) => void;
  addInstance: (section: SectionConfig) => void;
  removeInstance: (section: SectionConfig, instance: number) => void;
  validate: () => boolean;
  reset: () => void;
}

const FormContext = createContext<FormContextValue | null>(null);

export function FormProvider({
  config,
  children,
  initialValues,
}: {
  config: FormConfig;
  children: ReactNode;
  /** Seed answers (used by the admin live preview to open on a chosen path). */
  initialValues?: FormValues;
}) {
  const [values, setValues] = useState<FormValues>(initialValues ?? {});
  const [errors, setErrors] = useState<Errors>({});
  const [submitted, setSubmitted] = useState(false);

  const setValue = (id: string, value: FormValues[string]) => {
    setValues((prev) => {
      // Switching reporter type reframes the whole form; drop stale answers from
      // the other path so branching can't be driven by hidden values.
      if (id === 'reporterType' && prev.reporterType !== value) {
        return { reporterType: value };
      }
      return { ...prev, [id]: value };
    });
  };

  // Live revalidation, but only once the user has attempted to submit.
  useEffect(() => {
    if (submitted) setErrors(validateForm(config, values));
  }, [values, submitted, config]);

  const addInstance = (section: SectionConfig) => {
    if (!section.repeat) return;
    setValues((prev) => {
      const next = getRepeatCount(section, prev) + 1;
      if (next > section.repeat!.max) return prev;
      return { ...prev, [repeatCountKey(section.id)]: String(next) };
    });
  };

  /**
   * Remove one instance and close the gap, so instance ids stay contiguous.
   * Values above the removed index shift down rather than leaving a hole.
   */
  const removeInstance = (section: SectionConfig, instance: number) => {
    if (!section.repeat) return;
    setValues((prev) => {
      const count = getRepeatCount(section, prev);
      if (count <= section.repeat!.min) return prev;
      const next = { ...prev };
      for (let i = instance; i < count - 1; i++) {
        for (const f of section.fields) {
          const here = repeatFieldId(f.id, i);
          const below = repeatFieldId(f.id, i + 1);
          if (below in next) next[here] = next[below];
          else delete next[here];
        }
      }
      for (const f of section.fields) delete next[repeatFieldId(f.id, count - 1)];
      next[repeatCountKey(section.id)] = String(count - 1);
      return next;
    });
  };

  const validate = () => {
    const e = validateForm(config, values);
    setErrors(e);
    setSubmitted(true);
    return Object.keys(e).length === 0;
  };

  const reset = () => {
    setValues({});
    setErrors({});
    setSubmitted(false);
  };

  const activePath = useMemo(() => getReporterPath(values), [values]);

  const ctx: FormContextValue = {
    config,
    values,
    errors,
    activePath,
    submitted,
    setValue,
    addInstance,
    removeInstance,
    validate,
    reset,
  };

  return <FormContext.Provider value={ctx}>{children}</FormContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useForm(): FormContextValue {
  const ctx = useContext(FormContext);
  if (!ctx) throw new Error('useForm must be used within a FormProvider');
  return ctx;
}
