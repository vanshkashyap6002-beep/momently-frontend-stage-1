/**
 * Momently Brand Experience: The Red Thread of Fate (Akai Ito)
 * 60 FPS Hardware-Accelerated Canvas Engine (Zero Lag, Retina Sharp)
 *
 * Sequence:
 * Phase 1: Two delicate crimson threads enter from opposite margins (far-left and bottom-right).
 * Phase 2: They fluidly converge toward the center, looping gracefully around the authentication card.
 * Phase 3: They meet and tie into an elegant glowing Infinity Knot with a soft pulse.
 * Phase 4: The knot releases tension, scattering into 36 weightless silk filaments that drift and dissolve.
 * Loops infinitely and smoothly without memory leaks.
 */
(function () {
  'use strict';

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // 1. Scoped styles for the background canvas layer
  const style = document.createElement('style');
  style.id = 'momently-akai-ito-styles';
  style.textContent = `
    #akai-ito-canvas {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      pointer-events: none;
      z-index: 1; /* Sits behind login card */
      display: block;
    }

    /* Ensure card, text, and inputs remain crisp and 100% interactive */
    .card, .container, main, nav, form, button, input, a {
      position: relative;
      z-index: 10;
    }
  `;
  document.head.appendChild(style);

  document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.createElement('canvas');
    canvas.id = 'akai-ito-canvas';
    document.body.prepend(canvas);

    const ctx = canvas.getContext('2d', { alpha: true });

    let width = 0;
    let height = 0;
    let dpr = 1;

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2); // Retina crispness capped at 2 for optimal GPU performance
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
    }
    window.addEventListener('resize', resize);
    resize();

    // Akai Ito Color Palette
    const CRIMSON_DEEP = 'rgba(122, 28, 46, ';    // #7a1c2e Momently burgundy
    const CRIMSON_VIBRANT = 'rgba(190, 18, 60, '; // #be123c Glowing ruby
    const CRIMSON_SOFT = 'rgba(244, 63, 94, ';    // #f43f5e Highlight rose

    // Cubic Bézier curve point generator
    function getBezierPoint(p0, p1, p2, p3, t) {
      const mt = 1 - t;
      const mt2 = mt * mt;
      const t2 = t * t;
      return {
        x: mt2 * mt * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t2 * t * p3.x,
        y: mt2 * mt * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t2 * t * p3.y
      };
    }

    // Dynamic curve definitions calculated relative to viewport
    function getCurves() {
      const cx = width / 2;
      const cy = height / 2;

      // Thread A: Enters from far-left margin, curves gracefully, sweeps up and frames the card
      const threadA = [
        { x: -50, y: height * 0.22 },
        { x: width * 0.22, y: height * 0.12 },
        { x: width * 0.32, y: height * 0.52 },
        { x: cx - 25, y: cy + 12 }
      ];

      // Thread B: Enters from bottom-right margin, sweeps up the right empty space, frames card
      const threadB = [
        { x: width + 50, y: height * 0.88 },
        { x: width * 0.78, y: height * 0.75 },
        { x: width * 0.68, y: height * 0.44 },
        { x: cx + 25, y: cy - 12 }
      ];

      return { threadA, threadB, cx, cy };
    }

    // Silk Filament Particles for Phase 4
    let filaments = [];
    function createFilaments(cx, cy) {
      filaments = [];
      const count = width < 768 ? 22 : 38;

      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.6;
        const speed = 1.2 + Math.random() * 2.4;
        filaments.push({
          x: cx + (Math.random() - 0.5) * 60,
          y: cy + (Math.random() - 0.5) * 50,
          vx: Math.cos(angle) * speed + (Math.random() - 0.5) * 0.8,
          vy: Math.sin(angle) * speed - (1.2 + Math.random() * 1.6), // Upward silk float
          length: 16 + Math.random() * 22,
          angle: Math.random() * Math.PI,
          vAngle: (Math.random() - 0.5) * 0.04,
          alpha: 0.85,
          decay: 0.009 + Math.random() * 0.007,
          width: 0.8 + Math.random() * 1.4
        });
      }
    }

    // Animation Loop Variables
    let startTime = performance.now();
    const CYCLE_DURATION = 7400; // 7.4 seconds per complete romance cycle

    function animate(currentTime) {
      const elapsed = (currentTime - startTime) % CYCLE_DURATION;
      ctx.clearRect(0, 0, width, height);

      const { threadA, threadB, cx, cy } = getCurves();

      // ========================================================
      // PHASE 1 & 2: Origin Across Margins & Convergence (0ms -> 3000ms)
      // ========================================================
      if (elapsed < 4800) {
        const progress = Math.min(elapsed / 2600, 1);
        // Custom smooth exponential ease-out
        const t = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);

        // Render Thread A
        ctx.beginPath();
        ctx.strokeStyle = CRIMSON_VIBRANT + (0.75 * (1 - Math.max(0, (elapsed - 3800) / 1000))) + ')';
        ctx.lineWidth = 1.8;
        ctx.shadowColor = CRIMSON_VIBRANT + '0.4)';
        ctx.shadowBlur = 8;
        ctx.lineCap = 'round';

        const steps = 60;
        const currentStepsA = Math.floor(steps * t);
        for (let i = 0; i <= currentStepsA; i++) {
          const pt = getBezierPoint(threadA[0], threadA[1], threadA[2], threadA[3], i / steps);
          if (i === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        }
        ctx.stroke();

        // Render Thread B
        ctx.beginPath();
        ctx.strokeStyle = CRIMSON_VIBRANT + (0.75 * (1 - Math.max(0, (elapsed - 3800) / 1000))) + ')';
        for (let i = 0; i <= currentStepsA; i++) {
          const pt = getBezierPoint(threadB[0], threadB[1], threadB[2], threadB[3], i / steps);
          if (i === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        }
        ctx.stroke();
      }

      // ========================================================
      // PHASE 3: The Unbroken Infinity Knot (2400ms -> 4600ms)
      // ========================================================
      if (elapsed >= 2400 && elapsed < 4800) {
        const knotProgress = Math.min((elapsed - 2400) / 1000, 1);
        const knotFadeOut = Math.max(0, (elapsed - 3800) / 1000);
        const knotAlpha = Math.min(1, knotProgress) * (1 - knotFadeOut);

        // Breathing pulse glow
        const pulse = 1 + Math.sin((elapsed - 2400) * 0.005) * 0.06;
        const knotScale = (width < 768 ? 32 : 48) * pulse;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.strokeStyle = CRIMSON_VIBRANT + (0.9 * knotAlpha) + ')';
        ctx.shadowColor = CRIMSON_SOFT + (0.8 * knotAlpha) + ')';
        ctx.shadowBlur = 16 * pulse;
        ctx.lineWidth = 2.2;
        ctx.lineCap = 'round';

        // Draw Lemniscate of Bernoulli (Infinity Symbol: ∞)
        ctx.beginPath();
        const totalPoints = 90;
        const knotDrawSteps = Math.floor(totalPoints * knotProgress);

        for (let i = 0; i <= knotDrawSteps; i++) {
          const theta = (Math.PI * 2 * i) / totalPoints;
          const scale = knotScale / (1 + Math.pow(Math.sin(theta), 2));
          const x = scale * Math.cos(theta);
          const y = scale * Math.sin(theta) * Math.cos(theta);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Delicate center heart crest within the knot
        if (knotProgress >= 0.7) {
          const crestAlpha = Math.min(1, (knotProgress - 0.7) / 0.3) * (1 - knotFadeOut);
          ctx.beginPath();
          ctx.strokeStyle = CRIMSON_DEEP + (0.85 * crestAlpha) + ')';
          ctx.lineWidth = 1.4;
          ctx.shadowBlur = 6;
          ctx.arc(0, -2, 4, 0, Math.PI * 2);
          ctx.stroke();
        }

        ctx.restore();
      }

      // ========================================================
      // PHASE 4: Tension Release & Floating Silk Filaments (3800ms -> 7200ms)
      // ========================================================
      if (elapsed >= 3800) {
        if (filaments.length === 0) {
          createFilaments(cx, cy);
        }

        ctx.shadowBlur = 4;
        ctx.shadowColor = CRIMSON_SOFT + '0.3)';

        for (let i = 0; i < filaments.length; i++) {
          const f = filaments[i];
          if (f.alpha <= 0) continue;

          f.x += f.vx;
          f.y += f.vy;
          f.angle += f.vAngle;
          f.alpha -= f.decay;

          // Draw silk fiber segment
          const halfLen = f.length / 2;
          const x1 = f.x - Math.cos(f.angle) * halfLen;
          const y1 = f.y - Math.sin(f.angle) * halfLen;
          const x2 = f.x + Math.cos(f.angle) * halfLen;
          const y2 = f.y + Math.sin(f.angle) * halfLen;

          ctx.beginPath();
          ctx.strokeStyle = CRIMSON_VIBRANT + Math.max(0, f.alpha) + ')';
          ctx.lineWidth = f.width;
          ctx.lineCap = 'round';
          ctx.moveTo(x1, y1);
          // Delicate quadratic curvature to look like wave-blown silk
          const midCtrlX = (x1 + x2) / 2 + Math.sin(f.angle) * 6;
          const midCtrlY = (y1 + y2) / 2 + Math.cos(f.angle) * 6;
          ctx.quadraticCurveTo(midCtrlX, midCtrlY, x2, y2);
          ctx.stroke();
        }
      } else {
        // Reset filaments for next run
        filaments = [];
      }

      requestAnimationFrame(animate);
    }

    // Start 60 FPS animation loop
    requestAnimationFrame((time) => {
      startTime = time;
      animate(time);
    });
  });
})();