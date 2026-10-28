import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}
interface PWAState {
  installed: boolean;
  canInstall: boolean;
  online: boolean;
  updateAvailable: boolean;
  updating: boolean;
  requestInstall: () => Promise<void>;
  activateUpdate: () => void;
}
const PWAContext = createContext<PWAState | null>(null);
const standalone = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  !!(navigator as Navigator & { standalone?: boolean }).standalone;

export function PWAProvider({ children }: { children: ReactNode }) {
  const [installed, setInstalled] = useState(standalone);
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const [online, setOnline] = useState(() => navigator.onLine);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updating, setUpdating] = useState(false);
  const registration = useRef<ServiceWorkerRegistration | null>(null);
  const requestedUpdate = useRef(false);

  useEffect(() => {
    const install = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPromptEvent);
    };
    const installed = () => {
      setInstalled(true);
      setPrompt(null);
    };
    const connection = () => setOnline(navigator.onLine);
    const display = window.matchMedia("(display-mode: standalone)");
    const mode = () => setInstalled(standalone());
    window.addEventListener("beforeinstallprompt", install);
    window.addEventListener("appinstalled", installed);
    window.addEventListener("online", connection);
    window.addEventListener("offline", connection);
    display.addEventListener("change", mode);
    return () => {
      window.removeEventListener("beforeinstallprompt", install);
      window.removeEventListener("appinstalled", installed);
      window.removeEventListener("online", connection);
      window.removeEventListener("offline", connection);
      display.removeEventListener("change", mode);
    };
  }, []);

  useEffect(() => {
    // Development/HMR must never be held behind a production service worker.
    if (
      !import.meta.env.PROD ||
      !("serviceWorker" in navigator) ||
      !window.isSecureContext
    )
      return;
    let disposed = false;
    const cleanups: Array<() => void> = [];
    const changed = () => {
      if (requestedUpdate.current) window.location.reload();
    };
    const check = () => {
      if (document.visibilityState === "visible" && navigator.onLine)
        void registration.current?.update().catch(() => {});
    };
    navigator.serviceWorker.addEventListener("controllerchange", changed);
    document.addEventListener("visibilitychange", check);
    void navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`, {
        scope: import.meta.env.BASE_URL,
        updateViaCache: "none",
      })
      .then((reg) => {
        if (disposed) return;
        registration.current = reg;
        setUpdateAvailable(
          !!reg.waiting && !!navigator.serviceWorker.controller,
        );
        const found = () => {
          const worker = reg.installing;
          if (!worker) return;
          const state = () => {
            if (
              worker.state === "installed" &&
              navigator.serviceWorker.controller
            )
              setUpdateAvailable(true);
          };
          worker.addEventListener("statechange", state);
          cleanups.push(() => worker.removeEventListener("statechange", state));
          state();
        };
        reg.addEventListener("updatefound", found);
        cleanups.push(() => reg.removeEventListener("updatefound", found));
        found();
      })
      .catch(() => {
        /* Installation stays optional if registration is unavailable. */
      });
    return () => {
      disposed = true;
      navigator.serviceWorker.removeEventListener("controllerchange", changed);
      document.removeEventListener("visibilitychange", check);
      cleanups.forEach((cleanup) => cleanup());
    };
  }, []);

  const requestInstall = async () => {
    if (!prompt) return;
    const pending = prompt;
    setPrompt(null);
    try {
      await pending.prompt();
      await pending.userChoice;
    } catch {
      /* Native browser installation remains available from its menu. */
    }
  };
  const activateUpdate = () => {
    const waiting = registration.current?.waiting;
    if (!waiting) {
      window.location.reload();
      return;
    }
    requestedUpdate.current = true;
    setUpdating(true);
    waiting.postMessage({ type: "ACTIVATE_UPDATE" });
  };
  return (
    <PWAContext.Provider
      value={{
        installed,
        canInstall: !!prompt,
        online,
        updateAvailable,
        updating,
        requestInstall,
        activateUpdate,
      }}
    >
      {children}
    </PWAContext.Provider>
  );
}
export function usePWA() {
  const state = useContext(PWAContext);
  if (!state) throw new Error("usePWA must be used within PWAProvider");
  return state;
}
