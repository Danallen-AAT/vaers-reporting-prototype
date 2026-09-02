// ---------------------------------------------------------------------------
// A required question is not satisfied by pressing the space bar, and not by
// pasting invisible characters either. Both look answered in the box and carry
// nothing into the record, which is worse than an empty value because the
// structured output then reports it as answered.
// ---------------------------------------------------------------------------
import { describe, it, expect } from 'vitest';
import { validateForm } from './validation';
import { vaersForm } from '../config/vaersForm';

const errorsFor = (values: Record<string, string>) => validateForm(vaersForm, values);

describe('blank answers to required questions', () => {
  it('rejects a whitespace-only answer', () => {
    const spaces = errorsFor({ reporterType: 'provider', reporterName: '     ' });
    expect(spaces.reporterName).toBeTruthy();
  });

  it('rejects an answer made only of zero-width characters', () => {
    const invisible = errorsFor({ reporterType: 'provider', reporterName: '​⁠' });
    expect(invisible.reporterName).toBeTruthy();
  });

  it('still accepts a real answer, including one with surrounding spaces', () => {
    const real = errorsFor({ reporterType: 'provider', reporterName: '  Casey Reporter  ' });
    expect(real.reporterName).toBeUndefined();
  });
});
