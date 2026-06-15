import { useEffect, useRef } from 'react';

export const StarCanvas = () => {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const stars = Array.from({ length: 90 }, () => ({
      x: Math.random(), y: Math.random(),
      r: Math.random() * 1.4 + 0.3,
      base: Math.random() * 0.6 + 0.1,
      speed: Math.random() * 0.4 + 0.15,
      phase: Math.random() * Math.PI * 2,
    }));

    const sparkles = Array.from({ length: 8 }, () => ({
      x: Math.random(), y: Math.random(),
      size: Math.random() * 6 + 4,
      speed: Math.random() * 0.3 + 0.1,
      phase: Math.random() * Math.PI * 2,
    }));

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    const draw = (t: number) => {
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);
      const ts = t * 0.001;

      for (const s of stars) {
        const a = Math.max(0, s.base + Math.sin(ts * s.speed + s.phase) * (s.base * 0.7));
        ctx.save();
        ctx.globalAlpha = a;
        ctx.fillStyle = '#f0c870';
        ctx.beginPath();
        ctx.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      for (const s of sparkles) {
        const a = 0.15 + Math.abs(Math.sin(ts * s.speed + s.phase)) * 0.65;
        const cx = s.x * W;
        const cy = s.y * H;
        const sz = s.size;
        ctx.save();
        ctx.globalAlpha = a;
        ctx.strokeStyle = 'rgba(210,170,60,0.9)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(cx - sz, cy); ctx.lineTo(cx + sz, cy);
        ctx.moveTo(cx, cy - sz); ctx.lineTo(cx, cy + sz);
        ctx.stroke();
        ctx.globalAlpha = a * 0.4;
        ctx.beginPath();
        ctx.moveTo(cx - sz * 0.6, cy - sz * 0.6); ctx.lineTo(cx + sz * 0.6, cy + sz * 0.6);
        ctx.moveTo(cx + sz * 0.6, cy - sz * 0.6); ctx.lineTo(cx - sz * 0.6, cy + sz * 0.6);
        ctx.stroke();
        ctx.restore();
      }

      animId = requestAnimationFrame(draw);
    };

    animId = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden
      style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}
    />
  );
};
