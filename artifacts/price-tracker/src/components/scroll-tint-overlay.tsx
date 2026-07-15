import { useEffect, useRef } from 'react';

/**
 * Fixed emerald radial-glow layer that sits above the animated blue/purple
 * canvas background. Its opacity tracks scroll progress down the page (via
 * rAF-throttled scroll listener) so the whole backdrop smoothly breathes
 * from deep blue/purple at the top into a rich emerald/forest tone as the
 * user approaches the premium pricing cards, and fades back on scroll-up.
 */
export function ScrollTintOverlay() {
  const overlayRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef(0);
  const targetRef = useRef(0);
  const currentRef = useRef(0);

  useEffect(() => {
    function computeTarget() {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const progress = scrollable > 0 ? window.scrollY / scrollable : 0;
      targetRef.current = Math.min(1, Math.max(0, progress));
    }

    function tick() {
      // Ease current value toward target for a buttery, non-linear glide
      // rather than snapping directly to the scroll position.
      currentRef.current += (targetRef.current - currentRef.current) * 0.08;
      if (overlayRef.current) {
        overlayRef.current.style.opacity = currentRef.current.toFixed(3);
      }
      rafRef.current = requestAnimationFrame(tick);
    }

    computeTarget();
    window.addEventListener('scroll', computeTarget, { passive: true });
    window.addEventListener('resize', computeTarget);
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('scroll', computeTarget);
      window.removeEventListener('resize', computeTarget);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div
      ref={overlayRef}
      aria-hidden="true"
      className="fixed inset-0 -z-10 pointer-events-none"
      style={{
        opacity: 0,
        background:
          'radial-gradient(ellipse 90% 70% at 50% 100%, #064e3b 0%, #022c22 45%, transparent 75%),' +
          'linear-gradient(180deg, transparent 0%, #05140f 100%)',
      }}
    />
  );
}
