import { useEffect, useRef } from "react";

/**
 * Vibrant animated backdrop for the whole app: a canvas-driven field of
 * glowing electric-gold / deep-blue / purple light blobs, drifting time
 * particles, and slowly rotating translucent clock hands + gear rings —
 * reinforcing the "time-sensitive alarm" theme without being a static image.
 * Runs on requestAnimationFrame at a capped pixel ratio to stay lightweight.
 */
export function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let rafId = 0;
    let startTime = 0;

    const glows = [
      { color: "#F5B800", baseX: 0.2, baseY: 0.28, rx: 0.22, ry: 0.16, speed: 0.055, phase: 0, radius: 0.42 },
      { color: "#5B6CFF", baseX: 0.78, baseY: 0.22, rx: 0.2, ry: 0.2, speed: 0.04, phase: 2.1, radius: 0.46 },
      { color: "#9333EA", baseX: 0.5, baseY: 0.78, rx: 0.24, ry: 0.14, speed: 0.05, phase: 4.3, radius: 0.5 },
      { color: "#22D3EE", baseX: 0.85, baseY: 0.75, rx: 0.16, ry: 0.18, speed: 0.065, phase: 1.2, radius: 0.32 },
      { color: "#FCD34D", baseX: 0.12, baseY: 0.8, rx: 0.15, ry: 0.15, speed: 0.045, phase: 3.4, radius: 0.3 },
    ];

    const clocks = [
      { x: 0.14, y: 0.22, r: 0.15, speedMin: 0.09, speedSec: 1.1 },
      { x: 0.86, y: 0.68, r: 0.19, speedMin: -0.07, speedSec: -0.9 },
      { x: 0.55, y: 0.14, r: 0.1, speedMin: 0.12, speedSec: 1.4 },
    ];

    type Particle = {
      x: number; y: number; size: number; speed: number; drift: number;
      phase: number; gold: boolean;
    };
    const particles: Particle[] = Array.from({ length: 50 }, () => ({
      x: Math.random(),
      y: Math.random(),
      size: 1 + Math.random() * 2.2,
      speed: 0.01 + Math.random() * 0.02,
      drift: (Math.random() - 0.5) * 0.15,
      phase: Math.random() * Math.PI * 2,
      gold: Math.random() > 0.5,
    }));

    function resize() {
      const el = canvas!;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = el.clientWidth;
      height = el.clientHeight;
      el.width = Math.floor(width * dpr);
      el.height = Math.floor(height * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function drawClockFace(cx: number, cy: number, r: number, t: number, speedMin: number, speedSec: number) {
      ctx!.save();
      ctx!.translate(cx, cy);

      // Faint outer ring + tick marks
      ctx!.strokeStyle = "rgba(255,255,255,0.10)";
      ctx!.lineWidth = Math.max(1, r * 0.01);
      ctx!.beginPath();
      ctx!.arc(0, 0, r, 0, Math.PI * 2);
      ctx!.stroke();

      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        const inner = r * 0.88;
        ctx!.beginPath();
        ctx!.moveTo(Math.cos(a) * inner, Math.sin(a) * inner);
        ctx!.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        ctx!.strokeStyle = "rgba(255,255,255,0.14)";
        ctx!.stroke();
      }

      // Minute hand — soft gold, semi-transparent
      const minuteAngle = t * speedMin - Math.PI / 2;
      ctx!.strokeStyle = "rgba(252,211,77,0.5)";
      ctx!.lineWidth = Math.max(1.5, r * 0.035);
      ctx!.lineCap = "round";
      ctx!.beginPath();
      ctx!.moveTo(0, 0);
      ctx!.lineTo(Math.cos(minuteAngle) * r * 0.72, Math.sin(minuteAngle) * r * 0.72);
      ctx!.stroke();

      // Second hand — electric blue, thinner, faster
      const secondAngle = t * speedSec - Math.PI / 2;
      ctx!.strokeStyle = "rgba(96,165,250,0.4)";
      ctx!.lineWidth = Math.max(1, r * 0.018);
      ctx!.beginPath();
      ctx!.moveTo(0, 0);
      ctx!.lineTo(Math.cos(secondAngle) * r * 0.9, Math.sin(secondAngle) * r * 0.9);
      ctx!.stroke();

      // Center pin
      ctx!.fillStyle = "rgba(252,211,77,0.6)";
      ctx!.beginPath();
      ctx!.arc(0, 0, Math.max(1.5, r * 0.03), 0, Math.PI * 2);
      ctx!.fill();

      ctx!.restore();
    }

    function frame(now: number) {
      if (!startTime) startTime = now;
      const t = (now - startTime) / 1000;

      // Deep, vibrant base gradient (indigo -> violet -> near-black), never flat black
      const base = ctx!.createLinearGradient(0, 0, width, height);
      base.addColorStop(0, "#150A30");
      base.addColorStop(0.45, "#0E1440");
      base.addColorStop(1, "#050318");
      ctx!.fillStyle = base;
      ctx!.fillRect(0, 0, width, height);

      // Glowing color blobs, additive blend for a lively "light field" feel
      ctx!.globalCompositeOperation = "lighter";
      for (const g of glows) {
        const x = (g.baseX + Math.sin(t * g.speed + g.phase) * g.rx) * width;
        const y = (g.baseY + Math.cos(t * g.speed * 0.8 + g.phase) * g.ry) * height;
        const radius = g.radius * Math.max(width, height);
        const grad = ctx!.createRadialGradient(x, y, 0, x, y, radius);
        grad.addColorStop(0, g.color + "55");
        grad.addColorStop(0.5, g.color + "22");
        grad.addColorStop(1, g.color + "00");
        ctx!.fillStyle = grad;
        ctx!.beginPath();
        ctx!.arc(x, y, radius, 0, Math.PI * 2);
        ctx!.fill();
      }
      ctx!.globalCompositeOperation = "source-over";

      // Rotating translucent clock hands scattered across the scene
      for (const c of clocks) {
        drawClockFace(c.x * width, c.y * height, c.r * Math.max(width, height), t, c.speedMin, c.speedSec);
      }

      // Drifting gold/white time particles
      for (const p of particles) {
        const y = ((p.y - t * p.speed) % 1 + 1) % 1;
        const x = (p.x + Math.sin(t * 0.2 + p.phase) * p.drift + 1) % 1;
        const twinkle = 0.4 + 0.6 * Math.abs(Math.sin(t * 1.3 + p.phase));
        ctx!.beginPath();
        ctx!.fillStyle = p.gold
          ? `rgba(252,211,77,${0.55 * twinkle})`
          : `rgba(147,197,253,${0.45 * twinkle})`;
        ctx!.arc(x * width, y * height, p.size, 0, Math.PI * 2);
        ctx!.fill();
      }

      // Soft vignette to keep foreground text readable at the edges
      const vignette = ctx!.createRadialGradient(
        width / 2, height / 2, 0,
        width / 2, height / 2, Math.max(width, height) * 0.75
      );
      vignette.addColorStop(0, "rgba(5,3,20,0)");
      vignette.addColorStop(1, "rgba(3,2,12,0.55)");
      ctx!.fillStyle = vignette;
      ctx!.fillRect(0, 0, width, height);

      rafId = requestAnimationFrame(frame);
    }

    resize();
    window.addEventListener("resize", resize);
    rafId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="fixed inset-0 -z-10 h-full w-full"
    />
  );
}
