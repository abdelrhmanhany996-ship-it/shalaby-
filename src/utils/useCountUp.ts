import { useEffect, useRef, useState } from 'react';

// Counts a number up (or down) to its new value, so balances roll instead of jumping
export const useCountUp = (target: number, duration = 900) => {
  const [value, setValue] = useState(0);
  const from = useRef(0);

  useEffect(() => {
    const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce || !isFinite(target)) { setValue(target); from.current = target; return; }

    const start = performance.now();
    const begin = from.current;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 4);              // easeOutQuart: fast start, soft landing
      const next = begin + (target - begin) * eased;
      setValue(next);
      from.current = next;
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return value;
};
