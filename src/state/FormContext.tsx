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
import type { FormConfig, FormValues } from '../config/types';
import { getReporterPath, type ActivePath } from '../formEngine/visibility';
import { validateForm, type Errors } from '../formEngine/validation';

interface FormContextValue {
  config: FormConfig;
  values: FormValues;
  errors: Errors;
  activePath: ActivePath;
  submitted: boolean;
  setValue: (id: string, value: FormValues[string]) => void;
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
