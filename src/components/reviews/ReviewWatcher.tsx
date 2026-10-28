import { useEffect, useRef } from "react";
import { useCRM } from "../../context/CRMContext";
import { aiStatus, classifyReview } from "../../lib/aiClient";

/** Runs the AI over customer reviews that carry a comment, once each, as soon as the app sees them. */
export function ReviewWatcher() {
  const { reviewRequests, saveReviewAnalysis, effectiveUser } = useCRM();
  const done = useRef(new Set<string>());
  // Only people who deal with feedback run the analysis, so it is not repeated on every screen.
  const handles = ["admin", "general_manager", "regional_manager", "branch_manager", "supervisor"].includes(effectiveUser.role);

  useEffect(() => {
    if (!handles) return;
    const todo = reviewRequests.filter((r) => r.status === "answered" && r.response?.comment?.trim() && !r.ai && !done.current.has(r.id));
    if (!todo.length) return;
    let cancelled = false;
    aiStatus().then(async (s) => {
      if (s !== "server" || cancelled) return;
      for (const r of todo.slice(0, 5)) {
        done.current.add(r.id);
        try {
          saveReviewAnalysis(r.id, await classifyReview(r.response!.rating, r.response!.comment!));
        } catch {
          done.current.delete(r.id);
        }
      }
    });
    return () => {
      cancelled = true;
    };
  }, [reviewRequests, handles, saveReviewAnalysis]);

  return null;
}
