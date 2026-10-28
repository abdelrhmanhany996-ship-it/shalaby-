import { useEffect } from "react";

/**
 * On phones every table in the workspace turns into stacked cards (see `.stack-table` in index.css).
 * The column title is copied onto each cell as `data-label`, so pages need no extra markup.
 * A table can opt out with the class `no-stack` (e.g. the permissions matrix).
 */
export function useStackTables(rootId = "main-content") {
  useEffect(() => {
    const root = document.getElementById(rootId);
    if (!root) return;
    const label = () => {
      root.querySelectorAll<HTMLTableElement>("table:not(.no-stack)").forEach((table) => {
        const heads = [...table.querySelectorAll("thead th")].map((th) => th.textContent?.trim() || "");
        if (!heads.length) return;
        table.classList.add("stack-table");
        table.querySelectorAll("tbody tr").forEach((tr) => {
          let col = 0;
          [...tr.children].forEach((cell) => {
            const span = Number((cell as HTMLTableCellElement).colSpan) || 1;
            if (span === 1 && !cell.hasAttribute("data-label") && heads[col]) cell.setAttribute("data-label", heads[col]);
            col += span;
          });
        });
      });
    };
    label();
    const observer = new MutationObserver(() => label());
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [rootId]);
}
