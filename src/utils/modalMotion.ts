// Overlays (modals, bottom sheets) are unmounted by React the moment they close, which cuts any exit animation.
// Keep a visual-only copy on screen for a moment and play the closing animation on it.
const isOverlay = (n: Node): n is HTMLElement =>
  n instanceof HTMLElement && n.classList.contains('fixed') && n.classList.contains('inset-0');

export function installModalMotion() {
  if (typeof document === 'undefined' || typeof MutationObserver === 'undefined') return;

  new MutationObserver((records) => {
    for (const rec of records) {
      rec.removedNodes.forEach((node) => {
        if (!isOverlay(node)) return;
        const ghost = node.cloneNode(true) as HTMLElement;
        ghost.classList.add('modal-ghost');
        ghost.setAttribute('aria-hidden', 'true');
        ghost.removeAttribute('role');
        document.body.appendChild(ghost);
        const done = () => ghost.remove();
        ghost.addEventListener('animationend', (e) => { if (e.target === ghost) done(); });
        window.setTimeout(done, 400);
      });
    }
  }).observe(document.body, { childList: true, subtree: true });
}

