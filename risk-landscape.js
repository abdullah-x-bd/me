(() => {
  "use strict";

  // A conceptual demonstration of propagation and containment.
  // Contours are possible paths of influence, not measured data.
  const canvas = document.getElementById("system-landscape");
  const stage = canvas?.closest(".system-landscape-stage");
  const ctx = canvas?.getContext("2d", { alpha: true });
  if (!canvas || !stage || !ctx) return;

  const controls = [...document.querySelectorAll("[data-landscape-mode]")];
  const status = document.getElementById("system-landscape-status");
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const mix = (a, b, t) => a + (b - a) * t;
  const smooth = (a, b, v) => {
    const t = clamp((v - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
  };
  const TAU = Math.PI * 2;
  const ROWS = 32, STEPS = 88, MAX_SHOCKS = 4;
  const shocks = [];
  const pointer = {
    active: false, drawing: false, id: null,
    x: .35, y: .5, targetX: .35, targetY: .5,
    strength: 0, lastEmit: -10
  };

  let width = 0, height = 0, dpr = 1;
  let mode = "uncontained", safeguard = 0, safeguardTarget = 0;
  let t = 0, prevFrame = 0, frame = 0, visible = true;
  let nextAuto = 6.9, latestAction = -10;
  let lastTheme = null;
  const cache = { xs: [], rows: [] };

  function resize() {
    const r = stage.getBoundingClientRect();
    const w = Math.round(r.width), h = Math.round(r.height);
    if (w < 1 || h < 1) return;
    const d = Math.min(window.devicePixelRatio || 1, 1.5);
    if (w === width && h === height && d === dpr) return;
    width = w; height = h; dpr = d;
    canvas.width = Math.round(w * d);
    canvas.height = Math.round(h * d);
    ctx.setTransform(d, 0, 0, d, 0, 0);
    cache.xs = Array.from({ length: STEPS + 1 }, (_, i) => width * (.04 + .92 * i / STEPS));
    cache.rows = Array.from({ length: ROWS }, (_, j) => height * (.18 + .64 * j / (ROWS - 1)));
    draw();
  }

  function emit(x, y, automatic = false) {
    const p = {
      x: clamp(x, .04, .96),
      y: clamp(y, .10, .90),
      born: t,
      strength: automatic ? .82 : 1
    };
    shocks.push(p);
    if (shocks.length > MAX_SHOCKS) shocks.shift();
    latestAction = t;
    nextAuto = t + 8.2;
    if (!automatic && status) {
      status.textContent = mode === "safeguarded"
        ? "A disturbance entered the system. Oversight absorbs most of the wave beyond the boundary."
        : "A disturbance entered the system. The wave propagates across the whole field.";
    }
    if (motion.matches) draw();
    else start();
  }

  function measure(x, y) {
    let displace = 0, highlight = 0;
    const gate = width * .57;
    const gateOpacity = 1 - safeguard * .94 * smooth(gate - 19, gate + 21, x);
    for (const shock of shocks) {
      const age = motion.matches ? 1.0 : t - shock.born;
      if (age < 0 || age > 5.9) continue;
      const sx = width * shock.x, sy = height * shock.y;
      const distance = Math.hypot(x - sx, (y - sy) * 1.32);
      const radius = age * (width * .17 + 58);
      const band = 19 + age * 5.2;
      const wave = Math.exp(-Math.pow((distance - radius) / band, 2) * 1.12)
        * Math.exp(-age * .19) * shock.strength;
      const sourceSide = sx <= gate;
      const response = sourceSide ? gateOpacity : 1 - safeguard * .94 *
        (1 - smooth(gate - 19, gate + 21, x));
      displace += wave * response * 32;
      highlight = Math.max(highlight, wave * response);
    }
    const dx = (x - width * pointer.x) / (width * .105 + 24);
    const dy = (y - height * pointer.y) / (height * .17 + 7);
    const touch = pointer.strength * Math.exp(-(dx * dx + dy * dy) * 1.4);
    return { shift: displace + touch * 18, risk: highlight, touch };
  }

  function surfaceY(x, rowY, j, measureValue) {
    const xf = x / Math.max(1, width);
    const ambient = Math.sin(xf * TAU * 1.03 + j * .23 - t * .38) * 3.3
      + Math.sin(xf * TAU * 2.43 - j * .17 + t * .23) * 1.3
      + Math.sin(j * .55 + xf * TAU * .52 + t * .38) * 1.2;
    return rowY + ambient - measureValue.shift;
  }

  function paintBackdrop(dark) {
    const ambient = ctx.createLinearGradient(0, height * .18, 0, height * .83);
    ambient.addColorStop(0, dark ? "rgba(120,188,145,0)" : "rgba(92,149,112,0)");
    ambient.addColorStop(.52, dark ? "rgba(104,180,133,.043)" : "rgba(90,152,108,.044)");
    ambient.addColorStop(1, dark ? "rgba(120,188,145,0)" : "rgba(92,149,112,0)");
    ctx.fillStyle = ambient;
    ctx.fillRect(0, height * .1, width, height * .8);
    for (const pulse of shocks) {
      const age = motion.matches ? 1 : t - pulse.born;
      if (age < 0 || age > 5.3) continue;
      const x = pulse.x * width, y = pulse.y * height;
      const rad = Math.min(width * .43, 55 + age * (width * .17 + 58));
      const glow = ctx.createRadialGradient(x, y, 0, x, y, rad);
      const alpha = .075 * Math.exp(-age * .35) * pulse.strength;
      const r = dark ? "246,172,118" : "182,104,64";
      glow.addColorStop(0, "rgba(" + r + "," + alpha + ")");
      glow.addColorStop(.50, "rgba(" + r + "," + alpha * .35 + ")");
      glow.addColorStop(1, "rgba(" + r + ",0)");
      ctx.fillStyle = glow;
      ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
  }

  function draw() {
    if (!width || !height) return;
    const dark = document.documentElement.dataset.theme === "dark";
    ctx.clearRect(0, 0, width, height);
    paintBackdrop(dark);
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    const activeRGB = dark ? "242,172,126" : "170,87,55";
    const baseRGB = dark ? "157,209,174" : "70,121,89";
    const activeSegments = [];

    for (let j = 0; j < ROWS; j++) {
      const y = cache.rows[j], points = [];
      const focus = 1 - Math.abs((j + .5) / ROWS - .5) * 1.05;
      for (const x of cache.xs) {
        const field = measure(x, y);
        points.push({ x, y: surfaceY(x, y, j, field), risk: field.risk });
      }
      // Each contour is a single smooth path, with no independent blocks to jitter.
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let k = 1; k < points.length; k++) {
        const a = points[k - 1], b = points[k];
        ctx.quadraticCurveTo((a.x + b.x) * .5, (a.y + b.y) * .5, b.x, b.y);
      }
      ctx.lineWidth = j % 4 === 0 ? 1.18 : .72;
      ctx.strokeStyle = "rgba(" + baseRGB + "," + (dark ? .20 : .18) * focus + ")";
      ctx.stroke();

      // Amber only traces the moving disturbance front, not the full contour.
      if (j % 2 === 0) {
        let inBand = false;
        ctx.beginPath();
        for (const p of points) {
          if (p.risk > .075) {
            if (!inBand) { ctx.moveTo(p.x, p.y); inBand = true; }
            else ctx.lineTo(p.x, p.y);
          } else inBand = false;
        }
        ctx.lineWidth = 1.15;
        ctx.strokeStyle = "rgba(" + activeRGB + "," + (dark ? .63 : .55) + ")";
        ctx.stroke();
      }
    }

    // Interventions appear as a translucent, smoothly emerging seam.
    if (safeguard > .008) {
      const x = width * .57;
      ctx.save();
      const line = ctx.createLinearGradient(x, height * .16, x, height * .85);
      const rgb = dark ? "133,229,173" : "62,154,106";
      line.addColorStop(0, "rgba(" + rgb + ",0)");
      line.addColorStop(.25, "rgba(" + rgb + "," + safeguard * .62 + ")");
      line.addColorStop(.75, "rgba(" + rgb + "," + safeguard * .62 + ")");
      line.addColorStop(1, "rgba(" + rgb + ",0)");
      ctx.strokeStyle = line;
      ctx.lineWidth = 1.45;
      ctx.beginPath();
      ctx.moveTo(x, height * .15);
      ctx.lineTo(x, height * .86);
      ctx.stroke();
      ctx.lineWidth = 10;
      ctx.globalAlpha = safeguard * .14;
      ctx.stroke();
      ctx.restore();
    }

    // A small tangible focal point makes click interactions legible immediately.
    for (const pulse of shocks) {
      const age = motion.matches ? 1 : t - pulse.born;
      if (age < 0 || age > 5.6) continue;
      const x = pulse.x * width, y = pulse.y * height;
      const opacity = Math.exp(-age * 1.15) * pulse.strength;
      ctx.beginPath();
      ctx.arc(x, y, 2.8 + Math.min(4, age * 2), 0, TAU);
      ctx.fillStyle = "rgba(" + activeRGB + "," + opacity * .68 + ")";
      ctx.fill();
    }
  }

  function setMode(next) {
    if (next !== "uncontained" && next !== "safeguarded") return;
    if (next === mode) return;
    mode = next;
    safeguardTarget = mode === "safeguarded" ? 1 : 0;
    for (const button of controls) {
      const selected = button.dataset.landscapeMode === mode;
      button.classList.toggle("active", selected);
      button.setAttribute("aria-pressed", String(selected));
    }
    if (status) status.textContent = mode === "safeguarded"
      ? "Safeguards enabled. The field transitions smoothly into a contained system."
      : "Safeguards disabled. Propagation can cross the whole field.";
    // Start a comparable wave without clearing the field, so no hard reset occurs.
    emit(.18, .51, true);
    if (motion.matches) { safeguard = safeguardTarget; draw(); }
    else start();
  }

  for (const button of controls) {
    button.addEventListener("click", () => setMode(button.dataset.landscapeMode));
  }

  function local(e) {
    const r = stage.getBoundingClientRect();
    return {
      x: clamp((e.clientX - r.left) / Math.max(1, r.width), 0, 1),
      y: clamp((e.clientY - r.top) / Math.max(1, r.height), 0, 1)
    };
  }
  stage.addEventListener("pointermove", e => {
    if (e.pointerType === "touch" && !pointer.drawing) return;
    const p = local(e);
    pointer.targetX = p.x; pointer.targetY = p.y; pointer.active = true;
    if (pointer.drawing && t - pointer.lastEmit > .17) {
      emit(p.x, p.y);
      pointer.lastEmit = t;
    }
    if (motion.matches) { pointer.x = p.x; pointer.y = p.y; pointer.strength = 1; draw(); }
    else start();
  }, { passive: true });
  stage.addEventListener("pointerdown", e => {
    if (e.button != null && e.button !== 0) return;
    const p = local(e);
    pointer.targetX = pointer.x = p.x;
    pointer.targetY = pointer.y = p.y;
    pointer.active = pointer.drawing = true;
    pointer.lastEmit = t;
    emit(p.x, p.y);
    try { stage.setPointerCapture(e.pointerId); } catch (_) {}
  });
  function release(e) {
    pointer.drawing = false;
    try { if (stage.hasPointerCapture?.(e.pointerId)) stage.releasePointerCapture(e.pointerId); } catch (_) {}
  }
  stage.addEventListener("pointerup", release);
  stage.addEventListener("pointercancel", release);
  stage.addEventListener("pointerleave", () => {
    if (!pointer.drawing) pointer.active = false;
    if (motion.matches) { pointer.strength = 0; draw(); }
  });
  stage.addEventListener("keydown", e => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      emit(.20, .5);
    }
  });

  function tick(now) {
    frame = 0;
    if (!visible || document.hidden) return;
    // 60 fps-capable, time-based animation; never skip a half second of motion.
    const dt = prevFrame ? clamp((now - prevFrame) / 1000, 0, .045) : 1 / 60;
    prevFrame = now;
    t += dt;
    const follow = 1 - Math.exp(-dt * 11);
    const strengthFollow = 1 - Math.exp(-dt * 8);
    pointer.x = mix(pointer.x, pointer.targetX, follow);
    pointer.y = mix(pointer.y, pointer.targetY, follow);
    pointer.strength = mix(pointer.strength, pointer.active ? 1 : 0, strengthFollow);
    safeguard = mix(safeguard, safeguardTarget, 1 - Math.exp(-dt * 3.1));
    if (t > nextAuto) {
      if (t - latestAction > 5.6) emit(.20, .53, true);
      nextAuto = t + 7.4;
    }
    draw();
    start();
  }
  function start() {
    if (!frame && visible && !document.hidden && !motion.matches)
      frame = requestAnimationFrame(tick);
  }
  function refresh() {
    resize();
    if (motion.matches) draw();
    else start();
  }
  if ("ResizeObserver" in window) new ResizeObserver(refresh).observe(stage);
  else window.addEventListener("resize", refresh, { passive: true });
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
      if (!visible && frame) {
        cancelAnimationFrame(frame);
        frame = 0; prevFrame = 0;
      }
      if (visible) refresh();
    }, { rootMargin: "100px" }).observe(stage);
  }
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      if (frame) cancelAnimationFrame(frame);
      frame = 0; prevFrame = 0;
    } else refresh();
  });
  window.addEventListener("site-theme-change", refresh);
  motion.addEventListener?.("change", () => {
    if (frame) cancelAnimationFrame(frame);
    frame = 0; prevFrame = 0;
    if (motion.matches) safeguard = safeguardTarget;
    refresh();
  });

  // A visible pulse is present as soon as the component enters view.
  shocks.push({ x: .20, y: .53, born: -.42, strength: .88 });
  refresh();
})();
