import { useEffect, useRef } from "react";
import { useCRM } from "../../context/CRMContext";
import { cairoTime, interrupting, pendingReminders } from "../../lib/followUps";
import { today } from "../../lib/presentation";

const CHECK_EVERY_MS = 60_000;

/**
 * Tells the person about follow-ups that are late or about to start, with a browser notification (once each).
 * It runs only while the app is open in a browser tab: there is no server job that wakes anyone up.
 */
export function FollowUpAlerts() {
  const { followUps, effectiveUser } = useCRM();
  const told = useRef(new Set<string>());
  const latest = useRef(followUps);
  latest.current = followUps;

  useEffect(() => {
    const check = () => {
      if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
      const due = pendingReminders(latest.current, effectiveUser.id, today(), cairoTime()).filter(interrupting);
      for (const r of due) {
        // One notification per follow-up and kind of reminder (a late one is told again once it becomes overdue).
        const key = `${r.followUp.id}:${r.level}:${r.followUp.scheduledAt}`;
        if (told.current.has(key)) continue;
        told.current.add(key);
        const label = r.level === "overdue" ? `متأخرة ${r.daysLate} يوم` : r.level === "late_today" ? "عدّى ميعادها النهارده" : "ميعادها قرّب";
        try {
          new Notification(`متابعة ${label}`, { body: `${r.followUp.leadName}: ${r.followUp.reason}`, tag: key, lang: "ar", dir: "rtl" });
        } catch {
          /* some mobile browsers only allow notifications from a service worker */
        }
      }
    };
    check();
    const id = window.setInterval(check, CHECK_EVERY_MS);
    return () => window.clearInterval(id);
  }, [effectiveUser.id]);

  return null;
}
