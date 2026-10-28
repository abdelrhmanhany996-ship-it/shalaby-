import { useEffect, useRef } from "react";

export function useDialog(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Keep keyboard and assistive-technology navigation inside the active dialog.
    const background: Array<{ element: HTMLElement; inert: boolean }> = [];
    let current: HTMLElement | null = ref.current;
    while (current?.parentElement && current.parentElement !== document.body) {
      for (const sibling of Array.from(current.parentElement.children)) {
        if (sibling !== current && sibling instanceof HTMLElement) {
          background.push({ element: sibling, inert: sibling.inert });
          sibling.inert = true;
        }
      }
      current = current.parentElement;
    }
    const frame = requestAnimationFrame(() =>
      ref.current
        ?.querySelector<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex="0"]',
        )
        ?.focus(),
    );
    const handle = (e: KeyboardEvent) => {
      const dialogs = document.querySelectorAll('[role="dialog"]');
      if (dialogs[dialogs.length - 1] !== ref.current) return;
      if (e.key === "Escape") {
        e.stopPropagation();
        close.current();
      }
      if (e.key !== "Tab") return;
      const controls = Array.from(
        ref.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]',
        ) || [],
      ).filter((el) => el.tabIndex >= 0 && el.getClientRects().length > 0);
      const first = controls[0],
        last = controls[controls.length - 1];
      if (!first) {
        e.preventDefault();
        return;
      }
      if (
        e.shiftKey &&
        (document.activeElement === first ||
          !ref.current?.contains(document.activeElement))
      ) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handle);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", handle);
      document.body.style.overflow = oldOverflow;
      background.forEach(({ element, inert }) => {
        element.inert = inert;
      });
      if (previous?.isConnected) previous.focus();
    };
  }, [open]);
  return ref;
}
