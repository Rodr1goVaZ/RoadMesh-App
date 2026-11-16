import { useEffect } from "react";
import { createPortal } from "react-dom";
import type { AccountMenuLayerProps } from "./AccountMenuLayer";

/** A non-modal layer: outside clicks dismiss it, while wheel/touch scrolling reaches the page. */
export function AccountMenuLayer({ visible, anchor, menu, onDismiss, onShow, children }: AccountMenuLayerProps) {
  useEffect(() => {
    if (!visible) return;
    onShow();
    const outside = (event: MouseEvent) => {
      const target = event.target as Node | null;
      const anchorNode = anchor.current as unknown as HTMLElement | null;
      const menuNode = menu.current as unknown as HTMLElement | null;
      if (target && !anchorNode?.contains(target) && !menuNode?.contains(target)) onDismiss();
    };
    // Click, rather than pointerdown, keeps touch scrolling from dismissing the menu.
    document.addEventListener("click", outside, true);
    return () => document.removeEventListener("click", outside, true);
  }, [visible, anchor, menu, onDismiss, onShow]);

  if (!visible || typeof document === "undefined") return null;
  return createPortal(<div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 1000 }}>{children}</div>, document.body);
}
