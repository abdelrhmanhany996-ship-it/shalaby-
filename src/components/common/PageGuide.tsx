import { useCRM } from "../../context/CRMContext";
import { pageGuide, type PageGuideId } from "../../lib/pageGuides";

/** A collapsed "how does this page work?" panel, written from the same numbers the system runs on. */
export function PageGuide({ id }: { id: PageGuideId }) {
  const { license } = useCRM();
  const g = pageGuide(id, license);
  return (
    <details className="auto-rules panel">
      <summary>
        {g.title} <span>({g.items.length})</span>
      </summary>
      <ul>
        {g.items.map((r) => (
          <li key={r.when}>
            <strong>{r.when}</strong> ← {r.what}
            {r.after && <em> ({r.after})</em>}
          </li>
        ))}
      </ul>
    </details>
  );
}
