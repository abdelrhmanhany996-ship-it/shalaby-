import { useEffect, useState } from "react";

export interface Maintenance {
  enabled: boolean;
  message?: string;
}

/**
 * "Under development" switch. It is a file on the server (`/maintenance.json`, not in the build), so a site can be
 * closed or reopened by uploading or removing one file, without a new build. No file means the site is open.
 */
export function useMaintenance(): { loading: boolean } & Maintenance {
  const [state, setState] = useState<{ loading: boolean } & Maintenance>({ loading: true, enabled: false });
  useEffect(() => {
    let current = true;
    fetch(`/maintenance.json?t=${Date.now()}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { enabled: false }))
      .catch(() => ({ enabled: false }))
      .then((m: Maintenance) => current && setState({ loading: false, enabled: m?.enabled === true, message: m?.message }));
    return () => {
      current = false;
    };
  }, []);
  return state;
}
