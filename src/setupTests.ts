// Test setup shared by all Vitest files.
import '@testing-library/jest-dom/vitest';
import { expect } from 'vitest';
import { toHaveNoViolations } from 'jest-axe';

// Registers the axe-core matcher: expect(await axe(node)).toHaveNoViolations()
expect.extend(toHaveNoViolations);
