/**
 * Momently Auth Background Heart Experience
 * - Much larger hearts
 * - Seamless infinite loop sequence
 * - Keeps existing CSS/HTML form completely untouched
 */
(function () {
  'use strict';

  // 1. Inject isolated styles strictly scoped to the background canvas
  const style = document.createElement('style');
  style.id = 'momently-bg-heart-styles';
  style.textContent = `
    #momently-bg-canvas {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      pointer-events: none;
      z-index: 0;
      overflow: hidden;
    }

    /* Ensure card & forms always float above the background canvas */
    .card, form, main, .container {
      position: relative;
      z-index: 10;
    }

    /* 1. Large Center Hand-Drawn Heart */
    .bg-sketch-heart {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: min(650px, 92vw);
      height: min(650px, 92vw);
      opacity: 0.9;
      transition: opacity 0.8s ease, transform 0.8s ease;
    }

    .bg-sketch-path {
      stroke-dasharray: 620;
      stroke-dashoffset: 620;
      animation: drawSketchStroke 1.9s cubic-bezier(0.4, 0, 0.2, 1) forwards;
    }

    @keyframes drawSketchStroke {
      0% { stroke-dashoffset: 620; opacity: 0.1; }
      30% { opacity: 0.85; }
      100% { stroke-dashoffset: 0; opacity: 0.9; }
    }

    .bg-sketch-heart.pulse-glow {
      animation: heartGlowBreath 1s ease-in-out forwards;
    }

    @keyframes heartGlowBreath {
      0% { transform: translate(-50%, -50%) scale(1); filter: drop-shadow(0 0 0 rgba(122, 28, 46, 0)); }
      50% { transform: translate(-50%, -50%) scale(1.06); filter: drop-shadow(0 0 28px rgba(122, 28, 46, 0.35)); }
      100% { transform: translate(-50%, -50%) scale(1); filter: drop-shadow(0 0 12px rgba(122, 28, 46, 0.18)); }
    }

    /* 2. Much Larger Surrounding Perimeter Hearts */
    .bg-float-heart {
      position: absolute;
      width: 80px;
      height: 80px;
      opacity: 0;
      transform: translate(-50%, -50%) scale(0.6);
      transition: opacity 0.6s ease, transform 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }

    .bg-float-heart.visible {
      opacity: 0.9;
      transform: translate(-50%, -50%) scale(1);
    }

    .bg-float-heart.bursting {
      opacity: 0;
      transform: translate(-50%, -50%) scale(1.4);
      transition: opacity 0.35s ease, transform 0.35s ease;
    }

    /* 3. Small Scatter Hearts */
    .bg-mini-heart {
      position: absolute;
      pointer-events: none;
      opacity: 0;
      animation: scatterFloat linear forwards;
    }

    @keyframes scatterFloat {
      0% {
        opacity: 0.95;
        transform: translate(0, 0) scale(0.6) rotate(0deg);
      }
      40% {
        opacity: 0.9;
      }
      100% {
        opacity: 0;
        transform: translate(var(--dx), var(--dy)) scale(1.2) rotate(var(--rot));
      }
    }

    @media (max-width: 640px) {
      .bg-float-heart {
        width: 58px;
        height: 58px;
      }
    }
  `;
  document.head.appendChild(style);

  document.addEventListener('DOMContentLoaded', () => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    // Create persistent background stage
    const stage = document.createElement('div');
    stage.id = 'momently-bg-canvas';
    document.body.prepend(stage);

    // Run the animation immediately and loop infinitely
    runLoop(stage);
  });

  function runLoop(stage) {
    playHeartCycle(stage, () => {
      // Loop seamlessly after a slight gentle pause (800ms)
      setTimeout(() => {
        runLoop(stage);
      }, 800);
    });
  }

  function playHeartCycle(stage, onComplete) {
    stage.innerHTML = ''; // Fresh cycle stage
    const burgundy = '#7A1C2E'; // Signature Momently Burgundy

    // Step 1: Draw Center Heart (Large)
    const sketchBox = document.createElement('div');
    sketchBox.className = 'bg-sketch-heart';
    sketchBox.innerHTML = `
      <svg viewBox="0 0 200 200" fill="none" style="width:100%;height:100%;overflow:visible;">
        <path class="bg-sketch-path"
          d="M 100,165 
             C 25,115 15,60 52,32 
             C 80,10 96,25 100,42 
             C 104,25 120,10 148,32 
             C 185,60 175,115 100,165 Z" 
          stroke="${burgundy}" 
          stroke-width="2.6" 
          stroke-linecap="round" 
          stroke-linejoin="round"
        />
      </svg>
    `;
    stage.appendChild(sketchBox);

    // Step 2: Glow & Pulse
    setTimeout(() => {
      sketchBox.classList.add('pulse-glow');
    }, 1900);

    // Step 3: Big Perimeter Hearts Appear
    const isMobile = window.innerWidth < 768;
    const positions = isMobile
      ? [
          { x: 12, y: 16, rot: -10 },
          { x: 88, y: 18, rot: 12 },
          { x: 10, y: 82, rot: -8 },
          { x: 90, y: 80, rot: 14 }
        ]
      : [
          { x: 16, y: 20, rot: -12 },
          { x: 84, y: 22, rot: 10 },
          { x: 10, y: 52, rot: 8 },
          { x: 90, y: 50, rot: -14 },
          { x: 20, y: 82, rot: -6 },
          { x: 80, y: 84, rot: 15 }
        ];

    const heartElements = [];

    setTimeout(() => {
      positions.forEach((pos, idx) => {
        setTimeout(() => {
          const heart = document.createElement('div');
          heart.className = 'bg-float-heart';
          heart.style.left = `${pos.x}vw`;
          heart.style.top = `${pos.y}vh`;
          heart.innerHTML = `
            <svg viewBox="0 0 100 100" fill="none" style="width:100%;height:100%;transform:rotate(${pos.rot}deg);">
              <path d="M 50,85 C 10,58 5,30 26,16 C 40,5 48,13 50,21 C 52,13 60,5 74,16 C 95,30 90,58 50,85 Z" 
                    stroke="${burgundy}" 
                    stroke-width="2.5" 
                    fill="rgba(122, 28, 46, 0.05)"
                    stroke-linecap="round" />
            </svg>
          `;
          stage.appendChild(heart);

          requestAnimationFrame(() => heart.classList.add('visible'));
          heartElements.push({ el: heart, x: pos.x, y: pos.y });
        }, idx * 170);
      });
    }, 2500);

    // Step 4: Each Heart Bursts One-by-One into Small Hearts
    setTimeout(() => {
      // Fade out central sketch
      sketchBox.style.opacity = '0';
      sketchBox.style.transform = 'translate(-50%, -50%) scale(1.1)';

      heartElements.forEach((item, index) => {
        setTimeout(() => {
          item.el.classList.add('bursting');

          const rect = item.el.getBoundingClientRect();
          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;

          for (let p = 0; p < 8; p++) {
            createMiniHeart(stage, centerX, centerY, burgundy);
          }
        }, index * 260);
      });
    }, 4000);

    // Step 5: Complete cycle and trigger next iteration
    setTimeout(() => {
      if (typeof onComplete === 'function') onComplete();
    }, 6600);
  }

  function createMiniHeart(stage, originX, originY, color) {
    const mini = document.createElement('div');
    mini.className = 'bg-mini-heart';

    const angle = Math.random() * Math.PI * 2;
    const distance = 55 + Math.random() * 110;
    const dx = Math.cos(angle) * distance;
    const dy = Math.sin(angle) * distance - (12 + Math.random() * 30);
    const size = 14 + Math.random() * 14;
    const rot = (Math.random() - 0.5) * 80;
    const duration = 1100 + Math.random() * 400;

    mini.style.left = `${originX}px`;
    mini.style.top = `${originY}px`;
    mini.style.width = `${size}px`;
    mini.style.height = `${size}px`;
    mini.style.setProperty('--dx', `${dx}px`);
    mini.style.setProperty('--dy', `${dy}px`);
    mini.style.setProperty('--rot', `${rot}deg`);
    mini.style.animationDuration = `${duration}ms`;

    mini.innerHTML = `
      <svg viewBox="0 0 100 100" fill="none" style="width:100%;height:100%;">
        <path d="M 50,85 C 10,58 5,30 26,16 C 40,5 48,13 50,21 C 52,13 60,5 74,16 C 95,30 90,58 50,85 Z" 
              stroke="${color}" 
              fill="rgba(122, 28, 46, 0.4)"
              stroke-width="2.6" />
      </svg>
    `;

    stage.appendChild(mini);
  }
})();