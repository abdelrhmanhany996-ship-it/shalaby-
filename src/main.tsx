import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./design-refinement.css";

// Older builds kept a copy of the CRM data in localStorage. Remove it so nothing lingers on shared devices.
try {
  Object.keys(localStorage)
    .filter((k) => k.startsWith("almasar_crm_v1_") && !k.startsWith("almasar_crm_v1_dev_"))
    .forEach((k) => localStorage.removeItem(k));
} catch {
  /* storage unavailable */
}

createRoot(document.getElementById("root")!).render(<App />);
