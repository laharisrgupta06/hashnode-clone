import { useEffect } from 'react';

// Gentle entrance for landing-page sections: when an element marked data-reveal scrolls into view,
// it gets .is-revealed, which plays a short upward movement (landing.css).
// Elements are NEVER hidden while waiting: without the observer (old browsers, background tabs,
// reduced motion) they simply stay in their normal, fully visible position.
export default function useReveal(rootRef, deps = []) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof IntersectionObserver === 'undefined') return undefined;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-revealed');
            observer.unobserve(entry.target);
          }
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.12 }
    );
    root.querySelectorAll('[data-reveal]').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-scan when the content changes
  }, deps);
}
