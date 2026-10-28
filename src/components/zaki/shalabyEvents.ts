/** Opening Shalaby AI from anywhere in the app (a button, a suggested question) without passing props through every page. */
const EVENT = "shalaby:open";

export function openShalaby(question?: string) {
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { question } }));
}

export function onOpenShalaby(handler: (question?: string) => void) {
  const listener = (e: Event) => handler((e as CustomEvent<{ question?: string }>).detail?.question);
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
}
