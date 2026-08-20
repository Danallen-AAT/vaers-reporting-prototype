// Test setup shared by all Vitest files.
import '@testing-library/jest-dom/vitest';
import { expect } from 'vitest';
import { toHaveNoViolations } from 'jest-axe';

// Registers the axe-core matcher: expect(await axe(node)).toHaveNoViolations()
expect.extend(toHaveNoViolations);

// jsdom has no layout engine, so scrolling APIs are absent. Stub them rather
// than letting components guard for a test environment.
window.scrollTo = () => {};
Element.prototype.scrollIntoView = () => {};
if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}
