// ---------------------------------------------------------------------------
// In-page jumps, for an application that is hash routed.
//
// A plain `href="#someId"` cannot be used anywhere in this app. The router
// reads location.hash as the route, so an in-page fragment link is parsed as an
// unknown route and the user is thrown back to the landing page, losing a
// part-completed form. Every in-page jump therefore cancels the default
// navigation and moves scroll and focus itself.
//
// This bit the error summary, the completion status controls and the skip link,
// which is why it lives in one place rather than being solved three times.
// ---------------------------------------------------------------------------
import type { MouseEvent } from 'react';

const FOCUSABLE = 'input, select, textarea, button, a[href], [tabindex]';

/**
 * The element carrying the id is not always the one that can hold focus: a
 * radio or checkbox group is a <fieldset>, which cannot. Move to the first
 * control it wraps so the user lands on something they can actually answer.
 */
function focusTarget(el: HTMLElement): HTMLElement {
  if (el.matches(FOCUSABLE)) return el;
  return el.querySelector<HTMLElement>(FOCUSABLE) ?? el;
}

/** Scroll the element into view under the sticky panel, and focus it. */
export function jumpTo(id: string): void {
  const target = document.getElementById(id);
  if (!target) return;

  // Scroll to the whole field, not the bare control. Aligning the input to the
  // top of the viewport pushes its label up behind the sticky panel, so the
  // reporter arrives at a box with no visible question attached to it.
  const anchor = target.closest('.field') ?? target;

  // The sticky panel's height changes as the chips wrap, so measure it.
  const panel = document.querySelector('.progress-panel');
  const offset = (panel ? panel.getBoundingClientRect().height : 0) + 16;
  const top = anchor.getBoundingClientRect().top + window.scrollY - offset;
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  window.scrollTo({ top: Math.max(0, top), behavior: reduced ? 'auto' : 'smooth' });
  focusTarget(target).focus({ preventScroll: true });
}

/**
 * Click handler for an anchor that must keep its link semantics but must not
 * touch the routing hash. Used by the error summary and the skip link, where
 * assistive technology conventions expect a link rather than a button.
 */
export function handleJump(id: string) {
  return (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    jumpTo(id);
  };
}
