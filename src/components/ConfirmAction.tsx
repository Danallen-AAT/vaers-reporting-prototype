// ---------------------------------------------------------------------------
// Two-step guard for destructive controls, the SC 3.3.4 discipline applied to
// the application's own chrome: no single click may destroy work. The first
// activation swaps the trigger for an inline confirmation that names the
// consequence; only the explicit confirm runs the action. Cancelling returns
// focus to the trigger; confirming moves it to the trigger if still usable,
// otherwise to fallbackFocusId, so keyboard and screen reader users are never
// dropped onto a dead spot.
// ---------------------------------------------------------------------------
import { useEffect, useId, useRef, useState } from 'react';
import { jumpTo } from '../lib/inPageJump';

interface Props {
  triggerLabel: string;
  /** Names the consequence, e.g. "Starting over clears every answer." */
  prompt: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  triggerClass?: string;
  disabled?: boolean;
  /** Focus target when confirming removes or disables the trigger itself. */
  fallbackFocusId?: string;
}

export function ConfirmAction({
  triggerLabel,
  prompt,
  confirmLabel,
  cancelLabel,
  onConfirm,
  triggerClass = 'btn btn-outline',
  disabled,
  fallbackFocusId,
}: Props) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const promptId = useId();

  useEffect(() => {
    if (open) cancelRef.current?.focus();
  }, [open]);

  const cancel = () => {
    setOpen(false);
    queueMicrotask(() => triggerRef.current?.focus());
  };

  const confirm = () => {
    setOpen(false);
    onConfirm();
    queueMicrotask(() => {
      const t = triggerRef.current;
      if (t && t.isConnected && !t.disabled) t.focus();
      else if (fallbackFocusId) jumpTo(fallbackFocusId);
    });
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={triggerClass}
        disabled={disabled}
        hidden={open}
        onClick={() => setOpen(true)}
      >
        {triggerLabel}
      </button>
      {open && (
        <span className="confirm-action" role="group" aria-label={prompt}>
          <span id={promptId} className="confirm-prompt">
            {prompt}
          </span>
          <button
            ref={cancelRef}
            type="button"
            className="btn btn-outline btn-small"
            aria-describedby={promptId}
            onClick={cancel}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className="btn btn-outline btn-danger btn-small"
            aria-describedby={promptId}
            onClick={confirm}
          >
            {confirmLabel}
          </button>
        </span>
      )}
    </>
  );
}
