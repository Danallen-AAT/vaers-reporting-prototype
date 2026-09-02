// Test setup shared by all Vitest files.
import '@testing-library/jest-dom/vitest';
import { afterEach, expect } from 'vitest';
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

// React reports invalid DOM nesting through console.error rather than by
// throwing, so a suite can stay green while the browser quietly discards an
// element. That is exactly how a form nested inside a form survived here: the
// warning printed on every run, and the tests passed anyway, while the nested
// element was dropped and its submit handler never ran. Failing on these makes
// the suite read its own output.
const STRUCTURAL_WARNINGS = [
  'cannot contain a nested',
  'validateDOMNesting',
  'cannot appear as a descendant',
  'cannot appear as a child of',
];

const passThrough = console.error;
let seen: string[] = [];

console.error = (...args: unknown[]) => {
  const text = args.map(String).join(' ');
  if (STRUCTURAL_WARNINGS.some((pattern) => text.includes(pattern))) seen.push(text);
  passThrough(...args);
};

afterEach(() => {
  const found = seen;
  seen = [];
  if (found.length > 0) {
    throw new Error(['React reported invalid DOM nesting during this test:', ...found].join('\n'));
  }
});
