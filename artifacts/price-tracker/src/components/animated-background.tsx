import { useMemo } from "react";

/**
 * Premium, lightweight animated backdrop: a deep charcoal-to-black gradient
 * with a few slow-floating blurred gold/blue orbs and a sparse drifting
 * particle field. Pure CSS animations (no canvas/JS loop) so it stays cheap
 * even on low-end devices. Rendered once, fixed behind the entire app.
 */
export function AnimatedBackground() {
  const particles = useMemo(() => {
    return Array.from({ length: 36 }, (_, i) => {
      const size = 1 + Math.random() * 2;
      return {
        id: i,
        left: Math.random() * 100,
        top: Math.random() * 100,
        size,
        duration: 14 + Math.random() * 18,
        delay: -Math.random() * 20,
        drift: 20 + Math.random() * 40,
        opacity: 0.15 + Math.random() * 0.35,
        gold: i % 4 === 0,
      };
    });
  }, []);

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 -z-10 overflow-hidden bg-[linear-gradient(160deg,#0A0D14_0%,#05060A_55%,#020305_100%)]"
    >
      {/* Slow-floating gradient orbs */}
      <div className="absolute -top-32 -left-24 h-[32rem] w-[32rem] rounded-full bg-[radial-gradient(circle,rgba(252,211,77,0.10),transparent_70%)] blur-3xl animate-orb-float-a" />
      <div className="absolute top-1/3 -right-32 h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(circle,rgba(56,189,248,0.10),transparent_70%)] blur-3xl animate-orb-float-b" />
      <div className="absolute bottom-[-10rem] left-1/4 h-[26rem] w-[26rem] rounded-full bg-[radial-gradient(circle,rgba(245,158,11,0.08),transparent_70%)] blur-3xl animate-orb-float-c" />

      {/* Faint drifting particles */}
      {particles.map((p) => (
        <span
          key={p.id}
          className="absolute rounded-full animate-particle-drift"
          style={{
            left: `${p.left}%`,
            top: `${p.top}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: p.gold ? "#FCD34D" : "#E5E7EB",
            opacity: p.opacity,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
            // @ts-expect-error custom property consumed by keyframes
            "--particle-drift": `${p.drift}px`,
          }}
        />
      ))}

      {/* Subtle vignette so content stays readable at the edges */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(2,3,5,0.6)_100%)]" />
    </div>
  );
}
