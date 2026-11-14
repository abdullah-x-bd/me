(() => {
  "use strict";

  const heroCanvas = document.querySelector("#field");
  const ambientCanvas = document.querySelector("#ambient-field");
  if (!heroCanvas || !ambientCanvas) return;
  const heroStage = heroCanvas.parentElement;
  const ambientStage = ambientCanvas.parentElement;
  const heroCtx = heroCanvas.getContext("2d", { alpha: true });
  const ambientCtx = ambientCanvas.getContext("2d", { alpha: true });
  if (!heroCtx || !ambientCtx) return;

  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const gaussian = (v, scale) => Math.exp(-1.7 * Math.pow(v / scale, 2));
  const smooth = (a, b, x) => {
    const t = clamp((x - a) / (b - a));
    return t * t * (3 - 2 * t);
  };
  const flagged = i => i % 9 === 2 || i % 17 === 12;
  const total = 57;
  const TAU = Math.PI * 2;

  let heroSize = { width: 0, height: 0, dpr: 0 };
  let ambientSize = { width: 0, height: 0, dpr: 0 };
  let time = 0, previous = 0, lastDraw = 0, frame = 0;
  let safeguardMode = 0, requestedMode = 0;
  let pointerX = .5, pointerY = .5, pointerTargetX = .5, pointerTargetY = .5;
  let activeInHero = false, heroEnergy = 0;
  let ambientPointerX = .5, ambientPointerY = .5, ambientTargetX = .5, ambientTargetY = .5;
  let ambientEnergy = 0, scrollPosition = window.scrollY || 0, scrollTarget = scrollPosition;
  let heroVisible = true, heroHeight = 700;

  function sizeCanvas(canvas, ctx, previousSize, width, height, maxDpr) {
    const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
    width = Math.max(1, Math.round(width));
    height = Math.max(1, Math.round(height));
    if (previousSize.width !== width || previousSize.height !== height || previousSize.dpr !== dpr) {
      previousSize.width = width;
      previousSize.height = height;
      previousSize.dpr = dpr;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    return previousSize;
  }

  function agentY(i, u, t, mode, xPointer, yPointer, interaction) {
    const v = (i + .5) / total;
    const origin = .175 + .66 * v;
    const end = .28 + .44 * v;

    let y = origin;
    y += (.011 * Math.sin(12 * u + v * 13 - t * .67) +
          .006 * Math.cos(22 * u - v * 10 + t * .22)) * Math.sin(Math.PI * u);
    y += (end - origin) * smooth(.32, .82, u);
    y += .065 * Math.sin(v * 11.3 + t * .19) * gaussian(u - .53, .11);

    // A small subset of proposed actions encounters the safeguard boundary.
    // The difference between states is conceptual, not simulated study data.
    if (flagged(i)) {
      const diverted = i % 2 === 0 ? .10 : .88;
      y += (diverted - end) * smooth(.53, .91, u) * mode;
    }
    const dx = u - xPointer, dy = y - yPointer;
    y += interaction * .018 * gaussian(dx, .14) * gaussian(dy, .14) * Math.sign(dy || .01);
    return y;
  }

  function heroPoint(i, u) {
    return {
      x: (.045 + .91 * u) * heroSize.width,
      y: agentY(i, u, time, safeguardMode, pointerX, pointerY, heroEnergy) * heroSize.height
    };
  }

  function paintHero() {
    const ctx = heroCtx;
    const w = heroSize.width, h = heroSize.height;
    ctx.clearRect(0, 0, w, h);
    const gateX = (.045 + .91 * .53) * w;
    const top = h * .14, bottom = h * .86;

    // Control layer: an identifiable institutional boundary.
    ctx.fillStyle = "rgba(91,125,99,.035)";
    ctx.fillRect(gateX - w * .017, top, w * .034, bottom - top);
    ctx.lineWidth = .8;
    ctx.strokeStyle = "rgba(69,106,79,.28)";
    ctx.beginPath();
    ctx.moveTo(gateX, top);
    ctx.lineTo(gateX, bottom);
    ctx.stroke();

    ctx.fillStyle = "rgba(61,105,75,.32)";
    for (let j = 0; j < 14; j++) {
      const y = top + (bottom - top) * (j + .5) / 14;
      ctx.fillRect(gateX - 1.4, y - .8, 2.8, 1.6);
    }

    for (let i = 0; i < total; i++) {
      const risk = flagged(i);
      const end = risk ? .53 + .47 * safeguardMode : 1;
      const steps = Math.max(8, Math.ceil(110 * end));
      ctx.beginPath();
      for (let j = 0; j <= steps; j++) {
        const p = heroPoint(i, end * j / steps);
        if (j === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      const prominent = i % 12 === 0;
      ctx.lineWidth = prominent ? .92 : .62;
      const alpha = risk ? .34 : (prominent ? .31 : .18);
      ctx.strokeStyle = risk ? "rgba(155,107,79," + alpha + ")" : "rgba(47,93,69," + alpha + ")";
      ctx.stroke();

      if (risk) {
        const stop = heroPoint(i, .53);
        ctx.beginPath();
        ctx.arc(stop.x, stop.y, 1.7, 0, TAU);
        ctx.fillStyle = "rgba(158,112,79," + (.57 - safeguardMode * .35) + ")";
        ctx.fill();
      }
    }

    // The moving samples communicate execution over time.
    if (!motion.matches) {
      for (let i = 0; i < total; i += 3) {
        const risk = flagged(i);
        const limit = risk ? .53 + safeguardMode * .47 : 1;
        const u = (time * .069 + i * .071) % 1;
        if (u > limit) continue;
        const p = heroPoint(i, u);
        ctx.beginPath();
        ctx.arc(p.x, p.y, risk ? 1.8 : 1.35, 0, TAU);
        ctx.fillStyle = risk ? "rgba(153,102,71,.70)" : "rgba(53,110,76,.65)";
        ctx.fill();
      }
    }

    ctx.beginPath();
    ctx.arc(gateX, top, 2.65, 0, TAU);
    ctx.arc(gateX, bottom, 2.65, 0, TAU);
    ctx.fillStyle = "rgba(69,106,79,.46)";
    ctx.fill();
  }

  function paintAmbient() {
    const ctx = ambientCtx;
    const w = ambientSize.width, h = ambientSize.height;
    ctx.clearRect(0, 0, w, h);

    const mobile = w <= 690;
    const count = mobile ? 43 : 66;
    const steps = mobile ? 67 : 105;
    const shift = scrollPosition * .00055;
    const phase = time + shift;
    const span = w * .91;
    const padding = w * .045;

    // A subdued continuation of the SAME model rather than an unrelated mesh.
    for (let j = 0; j < count; j++) {
      const i = Math.round(j * (total - 1) / (count - 1));
      const v = (i + .5) / total;
      ctx.beginPath();
      for (let k = 0; k <= steps; k++) {
        const u = k / steps;
        const x = padding + span * u;
        const yNorm = agentY(i, u, phase, safeguardMode * .62,
          ambientPointerX, ambientPointerY, ambientEnergy * .28);
        // Keep the field distributed across the entire visible page.
        const y = h * (.04 + yNorm * .94) +
          7 * Math.sin(u * 8.2 - phase * .48 + v * 7.7);
        if (k === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      const focus = 1 - Math.abs(v - .5) * 2;
      const accent = j % 12 === 0;
      ctx.lineWidth = accent ? .76 : .48;
      ctx.strokeStyle = "rgba(53,97,70," + ((accent ? .14 : .079) * (.72 + .30 * focus)) + ")";
      ctx.stroke();
    }

    // Traveling markers are intentionally more legible than the old background,
    // but sparse enough not to compete with paper titles.
    if (!motion.matches) {
      for (let j = 0; j < 13; j++) {
        const i = (j * 7 + 4) % total;
        const v = (i + .5) / total;
        const u = (time * .047 + j * .093 + shift * .055) % 1;
        const x = padding + span * u;
        const y = h * (.04 + agentY(i, u, phase, safeguardMode * .62,
          ambientPointerX, ambientPointerY, ambientEnergy * .28) * .94) +
          7 * Math.sin(u * 8.2 - phase * .48 + v * 7.7);
        ctx.beginPath();
        ctx.arc(x, y, j % 4 === 0 ? 1.7 : 1.1, 0, TAU);
        ctx.fillStyle = "rgba(51,101,70," + (j % 4 === 0 ? .37 : .27) + ")";
        ctx.fill();
      }
    }
  }

  function update(timestamp) {
    frame = 0;
    if (document.hidden) return;
    if (!motion.matches && timestamp - lastDraw < 30) {
      frame = requestAnimationFrame(update);
      return;
    }

    const dt = previous ? Math.min(.06, (timestamp - previous) / 1000) : 0;
    previous = timestamp;
    lastDraw = timestamp;
    if (!motion.matches) time += dt;

    const ease = motion.matches ? 1 : .08;
    safeguardMode += (requestedMode - safeguardMode) * ease;
    pointerX += (pointerTargetX - pointerX) * ease;
    pointerY += (pointerTargetY - pointerY) * ease;
    ambientPointerX += (ambientTargetX - ambientPointerX) * ease;
    ambientPointerY += (ambientTargetY - ambientPointerY) * ease;
    scrollPosition += (scrollTarget - scrollPosition) * ease;
    heroEnergy += ((activeInHero ? 1 : 0) - heroEnergy) * ease;
    ambientEnergy += ((motion.matches ? 0 : .65) - ambientEnergy) * ease;

    if (heroVisible) {
      const rect = heroStage.getBoundingClientRect();
      sizeCanvas(heroCanvas, heroCtx, heroSize, rect.width, rect.height, 1.6);
      paintHero();
    }

    const viewportWidth = window.innerWidth, viewportHeight = window.innerHeight;
    const reveal = smooth(heroHeight * .25, heroHeight * .92, scrollPosition);
    ambientStage.style.opacity = String(reveal * (viewportWidth <= 690 ? .73 : .91));
    if (reveal > .002) {
      sizeCanvas(ambientCanvas, ambientCtx, ambientSize,
        viewportWidth, viewportHeight, viewportWidth <= 690 ? 1.2 : 1.4);
      paintAmbient();
    }
    if (!motion.matches) frame = requestAnimationFrame(update);
  }

  function start() {
    if (frame || document.hidden) return;
    previous = 0;
    frame = requestAnimationFrame(update);
  }

  // Comparing mutable rules with enforced provenance is deliberately
  // interactive rather than a claimed empirical reconstruction of POLIS.
  document.querySelectorAll(".control-state").forEach(button => {
    button.addEventListener("click", () => {
      requestedMode = button.dataset.state === "mutable" ? 1 : 0;
      document.querySelectorAll(".control-state").forEach(other => {
        other.setAttribute("aria-pressed", String(other === button));
      });
      if (motion.matches) start();
    });
  });

  heroStage.addEventListener("pointermove", event => {
    if (event.pointerType === "touch" || motion.matches) return;
    const rect = heroStage.getBoundingClientRect();
    pointerTargetX = clamp((event.clientX - rect.left) / rect.width);
    pointerTargetY = clamp((event.clientY - rect.top) / rect.height);
    activeInHero = true;
  }, { passive: true });
  heroStage.addEventListener("pointerleave", () => { activeInHero = false; }, { passive: true });
  window.addEventListener("pointermove", event => {
    if (event.pointerType === "touch" || motion.matches) return;
    ambientTargetX = clamp(event.clientX / Math.max(1, window.innerWidth));
    ambientTargetY = clamp(event.clientY / Math.max(1, window.innerHeight));
  }, { passive: true });

  function refreshGeometry() {
    const hero = document.querySelector(".hero");
    heroHeight = hero ? hero.getBoundingClientRect().height : 700;
    if (motion.matches) start();
  }

  window.addEventListener("scroll", () => {
    scrollTarget = window.scrollY || 0;
    if (motion.matches) start();
  }, { passive: true });
  window.addEventListener("resize", refreshGeometry, { passive: true });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) start();
  });
  motion.addEventListener("change", () => {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    start();
  });

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(entries => {
      heroVisible = entries[0].isIntersecting;
      if (heroVisible) start();
    }, { rootMargin: "120px" }).observe(heroStage);
  }

  refreshGeometry();
  start();
})();