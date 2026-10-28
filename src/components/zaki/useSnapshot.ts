import { useCRM } from "../../context/CRMContext";
import { scopeLabel } from "../../lib/access";
import { buildSnapshot } from "../../lib/aiSnapshot";

/** Builds the AI snapshot from exactly what the signed-in user can see. */
export function useSnapshotBuilder() {
  const { effectiveUser, leads, bookings, followUps, visits, notBoughtRecords, brokers, users, branches, reviewRequests, reviewNotes } = useCRM();
  return () =>
    buildSnapshot({
      user: effectiveUser,
      scope: scopeLabel(effectiveUser),
      leads,
      bookings,
      followUps,
      visits,
      notBoughtRecords,
      brokers,
      users,
      branches,
      reviewRequests,
      reviewNotes,
    });
}
