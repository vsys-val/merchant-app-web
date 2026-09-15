import { KeyboardEvent as ReactKeyboardEvent, RefObject, useLayoutEffect, useRef } from "react";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

export function useModalDialog(onClose: () => void, active = true): {
  dialogRef: RefObject<HTMLElement | null>;
  onKeyDown(event: ReactKeyboardEvent<HTMLElement>): void;
} {
  const dialogRef = useRef<HTMLElement>(null);
  const closeRef = useRef(onClose);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const wasActiveRef = useRef(false);

  closeRef.current = onClose;
  if (active && !wasActiveRef.current) {
    returnFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
  }
  wasActiveRef.current = active;

  useLayoutEffect(() => {
    if (!active) return;

    const previousOverflow = document.body.style.overflow;
    const dialog = dialogRef.current;
    const initialFocus = dialog?.querySelector<HTMLElement>("[autofocus]")
      ?? dialog?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)
      ?? dialog;

    document.body.style.overflow = "hidden";
    initialFocus?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      returnFocusRef.current?.focus();
    };
  }, [active]);

  function onKeyDown(event: ReactKeyboardEvent<HTMLElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeRef.current();
      return;
    }

    if (event.key !== "Tab") return;

    const focusable = Array.from(
      dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) ?? [],
    ).filter((element) => !element.hasAttribute("disabled") && element.tabIndex !== -1);

    if (focusable.length === 0) {
      event.preventDefault();
      dialogRef.current?.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return { dialogRef, onKeyDown };
}
