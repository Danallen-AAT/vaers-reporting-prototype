// ---------------------------------------------------------------------------
// Focus trap for modal dialogs.
//
// A dialog marked aria-modal="true" tells assistive technology that content
// behind it is inert, but that attribute does not stop the Tab key. Without a
// trap a keyboard user tabs straight out of the dialog and into the page
// behind it, which is disorienting and leaves them unable to find their way
// back. This keeps Tab and Shift+Tab cycling inside the dialog until it closes.
// ---------------------------------------------------------------------------
import { useEffect, type RefObject } from 'react';

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/** Cycle Tab within `container` while `active` is true. */
export function useFocusTrap(active: boolean, container: RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!active) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const node = container.current;
      if (!node) return;

      const items = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      );
      if (items.length === 0) return;

      const first = items[0];
      const last = items[items.length - 1];
      const current = document.activeElement;

      // Focus escaped the dialog entirely; pull it back.
      if (!node.contains(current)) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
        return;
      }
      if (e.shiftKey && current === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && current === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [active, container]);
}
