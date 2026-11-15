(() => {
  "use strict";

  /*
   * Architecture of Emergence
   * An abstract kinetic installation about the relationship between local
   * elements, collective organization, boundaries and adaptation.
   * Not a simulation of empirical research results.
   *
   * No controls, no clicks. Four distinctly different formations continually
   * assemble, dissolve and reorganize. Cursor motion changes the field rather
   * than rotating an object, while the autonomous cycle keeps evolving.
   */
  const canvas = document.getElementById("emergence-field");
  if (!canvas) return;
  const stage = canvas.closest(".emergence-stage");
  const context = canvas.getContext("2d", { alpha: true });
  if (!stage || !context) return;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const mix = (a, b, t) => a + (b - a) * t;
  const smooth = t => {
    const x = clamp(t, 0, 1);
    return x * x * (3 - 2 * x);
  };
  const TAU = Math.PI * 2;
  const PERIOD = 7.4;
  const HOLD = 3.2;
  const FORMATIONS = 4;

  let width = 0, height = 0, dpr = 1, visible = true;
  let raf = 0, last = 0, time = .18, particles = [];
  let cachedTheme = "";
  let palette = null;

  const pointer = {
    inside: false, targetX: 0, targetY: 0, targetPresence: 0,
    x: 0, y: 0, presence: 0
  };

  function createParticles() {
    const count = clamp(Math.round(width * 1.17), 560, 1550);
    const points = [];
    let seed = 19573251;
    const random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    for (let i = 0; i < count; i++) {
      // Low-discrepancy horizontal positions avoid clumps and grid lines.
      const u = ((i * .618033988749895 + .17) % 1) * 2 - 1;
      const v = random() * 2 - 1;
      const z = random();
      const s = random();
      const lane = i % 4;
      const t0 = target({u, v, z, s, lane}, 0, 0);
      points.push({
        u, v, z, s, lane,
        x: t0.x + (random() - .5) * .055,
        y: t0.y + (random() - .5) * .065,
        vx: 0, vy: 0,
        px: 0, py: 0,
        direction: random() * .55 - .275,
        length: 1.8 + random() * 3.7,
        tint: random()
      });
    }
    return points;
  }

  // All targets occupy the same normalized horizontal stage.
  function target(p, formation, t) {
    const u = p.u, v = p.v, lane = p.lane;

    // 0: An arcade. The particles self-organize into a row of arches, columns,
    //    and openings, making structure unmistakable from a distance.
    if (formation === 0) {
      const nArch = 4;
      const along = clamp((u + 1) * .5, .000001, .999999) * nArch;
      const local = along - Math.floor(along);
      const rounded = Math.sqrt(Math.max(0, 1 - Math.pow(local * 2 - 1, 2)));
      const pillar = lane === 3;
      const x = pillar
        ? (Math.round(along) / nArch * 2 - 1) * .91 + v * .019
        : u * .91 + Math.sin(u * 12 + p.z * TAU) * .005;
      const y = pillar
        ? .57 - p.s * 1.00
        : .56 - 1.08 * rounded + v * .082;
      return {x, y: y + Math.sin(t * .38 + p.z * TAU) * .011};
    }

    // 1: A coordinated braid. Independent streams weave into an ordered whole.
    if (formation === 1) {
      const stream = lane % 3;
      const phase = u * Math.PI * 3.2 + stream * TAU / 3;
      const envelope = .62 + .38 * Math.sin((u + 1) * Math.PI / 2);
      return {
        x: u * .93 + .017 * Math.cos(phase + t * .23),
        y: Math.sin(phase - t * .26) * .45 * envelope
          + v * .069 + (lane === 3 ? .04 : 0)
      };
    }

    // 2: A channel with thick outer boundaries and an adaptive inner flow.
    //    Its large negative space is distinct from both the arches and braid.
    if (formation === 2) {
      const wall = lane === 0 || lane === 1;
      const side = lane === 0 ? -1 : 1;
      const corridor = .21 + .23 * Math.exp(-u * u * 3);
      return {
        x: u * .94 + .021 * Math.sin(t * .37 + v * 4),
        y: wall
          ? side * corridor + v * .11 + .025 * Math.sin(u * 5.2 + t * .25)
          : .10 * Math.sin(u * 10.2 + t * .8 + lane * 1.4)
              + v * .12
      };
    }

    // 3: Dispersal. The material loses its larger structure, enters a gently
    //    turbulent flow field, and later forms architecture again.
    return {
      x: u * .94
        + .14 * Math.sin(v * 3.9 + t * .51 + p.z * 1.8)
        + .045 * Math.cos(u * 8 + t * .32),
      y: v * .76
        + .15 * Math.sin(u * 12.3 + p.z * 2.6 - t * .57)
        + .05 * Math.cos(u * 6.2 + t * .73)
    };
  }

  function getFormation(t) {
    const cycle = t / PERIOD;
    const index = Math.floor(cycle) % FORMATIONS;
    const local = ((t % PERIOD) + PERIOD) % PERIOD;
    return {
      index,
      next: (index + 1) % FORMATIONS,
      mix: smooth((local - HOLD) / (PERIOD - HOLD)),
      turbulence: Math.sin(Math.PI * smooth((local - HOLD) / (PERIOD - HOLD)))
    };
  }

  function colors() {
    const theme = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
    if (cachedTheme === theme && palette) return palette;
    cachedTheme = theme;
    palette = theme === "dark"
      ? {
          ink: [173, 218, 179],
          deep: [105, 158, 122],
          accent: [238, 192, 128],
          halo: "rgba(143,199,152,.105)",
          mist: "rgba(95,152,114,.045)"
        }
      : {
          ink: [48, 87, 62],
          deep: [99, 140, 105],
          accent: [161, 121, 71],
          halo: "rgba(96,147,109,.105)",
          mist: "rgba(103,152,116,.045)"
        };
    return palette;
  }

  const rgba = (rgb, a) =>
    "rgba(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + "," +
    clamp(a, 0, 1).toFixed(3) + ")";

  function sizeCanvas() {
    const r = stage.getBoundingClientRect();
    const w = Math.round(r.width), h = Math.round(r.height);
    if (w < 1 || h < 1) return;
    const nextDpr = Math.min(window.devicePixelRatio || 1, 1.5);
    if (w === width && h === height && nextDpr === dpr) return;
    const sizeChanged = w !== width || h !== height;
    width = w; height = h; dpr = nextDpr;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (sizeChanged || !particles.length) particles = createParticles();
    if (reduced.matches) {
      placeReduced();
      paint();
    }
  }

  function fieldTarget(p, t, form) {
    const a = target(p, form.index, t);
    const b = target(p, form.next, t);
    let x = mix(a.x, b.x, form.mix);
    let y = mix(a.y, b.y, form.mix);

    // When a structure dissolves, each fragment takes a slightly different
    // path, producing a visible transformation rather than a crossfade.
    const loosen = form.turbulence * .058;
    x += loosen * Math.sin(p.z * TAU + t * .85);
    y += loosen * Math.cos(p.s * TAU + t * .69);

    // A cursor creates a local vortex and changes the collective geometry,
    // but there are no clicks or direct manipulation of individual particles.
    if (pointer.presence > .0005) {
      const mx = pointer.x * .80;
      const my = pointer.y * .55;
      const dx = x - mx, dy = y - my;
      const influence = Math.exp(-(dx * dx * 1.6 + dy * dy * 2.2) * 2.0);
      x += pointer.presence * (-dy * .58 * influence + .082 * pointer.y * Math.sin(x * 4.7));
      y += pointer.presence * (dx * .44 * influence + .105 * pointer.x * Math.sin(x * 5.1 + t * .28));
    }
    return {x, y};
  }

  function update(dt) {
    const form = getFormation(time);
    const follow = 1 - Math.exp(-dt * 5.5);
    pointer.x = mix(pointer.x, pointer.targetX, follow);
    pointer.y = mix(pointer.y, pointer.targetY, follow);
    pointer.presence = mix(pointer.presence, pointer.targetPresence, follow);

    // Stable damped motion. Both formation targets and pointer effects ease
    // continuously, without restarting or hard-resetting the sculpture.
    const pull = 47, drag = Math.exp(-9.4 * dt);
    for (const p of particles) {
      const goal = fieldTarget(p, time, form);
      p.vx = (p.vx + (goal.x - p.x) * pull * dt) * drag;
      p.vy = (p.vy + (goal.y - p.y) * pull * dt) * drag;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  }

  function paint() {
    if (!width || !height || !particles.length) return;
    const ctx = context, pal = colors();
    ctx.clearRect(0, 0, width, height);

    // Spatial breathing without a heavy background panel or visible border.
    const gradient = ctx.createRadialGradient(
      width * .5, height * .5, height * .04,
      width * .5, height * .5, width * .47
    );
    gradient.addColorStop(0, pal.halo);
    gradient.addColorStop(.54, pal.mist);
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    const xScale = width * .475, yScale = height * .42;
    const cx = width * .5, cy = height * .5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    for (const p of particles) {
      const x = cx + p.x * xScale, y = cy + p.y * yScale;
      const prevX = p.px || x, prevY = p.py || y;
      p.px = x; p.py = y;
      if (x < -12 || x > width + 12 || y < -12 || y > height + 12) continue;

      const velocityX = x - prevX, velocityY = y - prevY;
      const speed = Math.hypot(velocityX, velocityY);
      const direction = Math.atan2(velocityY, velocityX);
      // Calm fragments align to the emergent architecture. Moving fragments
      // incline with their own paths and leave short kinetic traces.
      const angle = mix(
        .21 + Math.sin(p.u * 5.7 + time * .20 + p.lane) * .46,
        direction,
        clamp(speed / 2.5, 0, .8)
      ) + p.direction;
      const length = p.length * (1 + clamp(speed / 12, 0, .85));
      const ca = Math.cos(angle) * length * .5;
      const sa = Math.sin(angle) * length * .5;
      const centerFade = clamp((width * .5 - Math.abs(x - width * .5)) / (width * .10), 0, 1);
      const topFade = clamp(Math.min(y, height - y) / 17, 0, 1);
      const opacity = (.36 + p.z * .52) * centerFade * topFade;
      const tone = p.tint < .075 ? pal.accent : p.lane === 3 ? pal.deep : pal.ink;

      if (speed > .72) {
        const tx = velocityX / speed * Math.min(speed * 1.6, 11);
        const ty = velocityY / speed * Math.min(speed * 1.6, 11);
        ctx.beginPath();
        ctx.moveTo(x - tx, y - ty);
        ctx.lineTo(x, y);
        ctx.strokeStyle = rgba(tone, opacity * .12);
        ctx.lineWidth = .75;
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.moveTo(x - ca, y - sa);
      ctx.lineTo(x + ca, y + sa);
      ctx.strokeStyle = rgba(tone, opacity);
      ctx.lineWidth = p.z > .74 ? 1.45 : p.z < .17 ? .76 : 1.06;
      ctx.stroke();
    }
  }

  function frame(ts) {
    raf = 0;
    if (document.hidden || !visible) return;
    const dt = last ? clamp((ts - last) / 1000, 0, .044) : 1 / 60;
    last = ts;
    time += dt;
    update(dt);
    paint();
    schedule();
  }
  function schedule() {
    if (!raf && !document.hidden && visible && !reduced.matches) {
      raf = requestAnimationFrame(frame);
    }
  }
  function placeReduced() {
    const form = getFormation(0);
    for (const p of particles) {
      const goal = fieldTarget(p, 0, form);
      p.x = goal.x; p.y = goal.y;
      p.vx = 0; p.vy = 0; p.px = 0; p.py = 0;
    }
  }

  function pointerMove(e) {
    if (e.pointerType === "touch") return;
    const r = stage.getBoundingClientRect();
    if (!r.width || !r.height) return;
    pointer.targetX = clamp((e.clientX - r.left) / r.width * 2 - 1, -1, 1);
    pointer.targetY = clamp((e.clientY - r.top) / r.height * 2 - 1, -1, 1);
    pointer.targetPresence = 1;
    pointer.inside = true;
    if (reduced.matches) {
      pointer.x = pointer.targetX;
      pointer.y = pointer.targetY;
      pointer.presence = 1;
      placeReduced();
      paint();
    } else schedule();
  }

  stage.addEventListener("pointerenter", pointerMove, { passive: true });
  stage.addEventListener("pointermove", pointerMove, { passive: true });
  stage.addEventListener("pointerleave", () => {
    pointer.inside = false;
    pointer.targetPresence = 0;
    if (reduced.matches) {
      pointer.presence = 0;
      placeReduced();
      paint();
    }
  }, { passive: true });

  function refresh() {
    sizeCanvas();
    if (reduced.matches) {
      placeReduced();
      paint();
    } else schedule();
  }
  if ("ResizeObserver" in window) {
    new ResizeObserver(refresh).observe(stage);
  } else {
    window.addEventListener("resize", refresh, {passive:true});
  }
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
      if (!visible && raf) {
        cancelAnimationFrame(raf);
        raf = 0;
        last = 0;
      }
      if (visible) refresh();
    }, {rootMargin:"110px"}).observe(stage);
  }
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      if (raf) cancelAnimationFrame(raf);
      raf = 0; last = 0;
    } else refresh();
  });
  window.addEventListener("site-theme-change", () => {
    cachedTheme = "";
    refresh();
  });
  reduced.addEventListener?.("change", () => {
    if (raf) cancelAnimationFrame(raf);
    raf = 0; last = 0;
    refresh();
  });

  refresh();
})();
