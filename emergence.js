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
  const PERIOD = 5.35;
  const HOLD = .70;
  const FORMATIONS = 4;

  let width = 0, height = 0, dpr = 1, visible = true;
  let raf = 0, last = 0, time = .67, particles = [], pendingDt = 0, lastRender = 0;
  let cachedTheme = "";
  let palette = null;

  const pointer = {
    inside: false, targetX: 0, targetY: 0, targetPresence: 0,
    x: 0, y: 0, presence: 0
  };

  function createParticles() {
    const count = clamp(Math.round(width * .95), 740, 1220);
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
        x: t0.x + (random() - .5) * .014,
        y: t0.y + (random() - .5) * .018,
        vx: 0, vy: 0, a: t0.a || 0,
        px: 0, py: 0,
        direction: random() * .15 - .075,
        length: 4.0 + random() * 5.5,
        tint: random()
      });
    }
    return points;
  }

  // All targets occupy the same normalized horizontal stage.
  function target(p, formation, t) {
    const u = p.u, v = p.v, lane = p.lane;
    // The four shapes have different large-scale silhouettes.
    if (formation === 0) {
      // Four vaults, structural ribs, and vertical piers.
      const along = Math.min(3.9999, (u + 1) * 2);
      const bay = Math.floor(along);
      const q = along - bay;
      const pillar = lane === 3;
      const x = pillar
        ? -.90 + 1.8 * (bay + (q < .5 ? 0 : 1)) / 4 + v * .011
        : u * .90 + v * .011;
      const y = pillar
        ? .49 - p.s * .90
        : .47 - (lane === 2 ? .76 : .91) * Math.sin(Math.PI * q) + v * .030;
      const a = pillar ? -Math.PI / 2 : -.81 * Math.cos(Math.PI * q);
      return { x, y, a };
    }
    if (formation === 1) {
      // Three coordinated ribbons crossing over and under one another.
      const phase = u * Math.PI * 2.65 + (lane % 3) * TAU / 3 - t * .34;
      const amp = .34 + .12 * Math.cos(u * Math.PI / 2);
      return {
        x: u * .90 + v * .016,
        y: Math.sin(phase) * amp + v * .041,
        a: Math.atan(.95 * Math.cos(phase))
      };
    }
    if (formation === 2) {
      // Two longitudinal boundaries open a visible central channel.
      const wall = lane === 0 || lane === 1;
      const side = lane === 0 ? -1 : 1;
      const rim = .25 + .19 * Math.cos(u * Math.PI / 2);
      const y = wall
        ? side * rim + v * .045
        : .09 * Math.sin(u * 4.5 + lane * 1.5 - t * .28) + v * .05;
      return { x: u * .91 + v * .012, y, a: wall ? 0 : .24 * Math.cos(u * 4.5) };
    }
    // Dispersal: no singular coherent silhouette; broad, spacious field.
    return {
      x: u * .91 + .045 * Math.sin(v * 4 + p.z * 4 + t * .40),
      y: v * .68 + .056 * Math.sin(u * 7 + p.s * 5 - t * .45),
      a: p.direction * 5
    };
  }

  function getFormation(t) {
    const phase = Math.floor(t / PERIOD);
    const index = ((phase % FORMATIONS) + FORMATIONS) % FORMATIONS;
    const local = t - phase * PERIOD;
    const raw = clamp((local - HOLD) / (PERIOD - HOLD), 0, 1);
    // An ease-out starts visibly and settles without a sudden jump.
    const amount = 1 - Math.pow(1 - raw, 2.25);
    return { index, next:(index + 1) % FORMATIONS, mix:amount };
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
    paint();
  }

  function fieldTarget(p, t, form) {
    const a = target(p, form.index, t);
    const b = target(p, form.next, t);
    let x = mix(a.x, b.x, form.mix);
    let y = mix(a.y, b.y, form.mix);
    const angleA = a.a || 0, angleB = b.a || 0;
    const angle = angleA + Math.atan2(Math.sin(angleB - angleA), Math.cos(angleB - angleA)) * form.mix;

    // The cursor gently expands and shears the WHOLE architecture.
    // No local vortices, wavy disruptions, or particle explosions.
    x *= 1 + pointer.x * pointer.presence * .09;
    y *= 1 + pointer.y * pointer.presence * .12;
    x += y * pointer.y * pointer.presence * .05;
    const breath = 1 + Math.sin(t * .56) * .012;
    return { x:x * breath, y:y * breath, a:angle };
  }

  function update(dt) {
    const follow = 1 - Math.exp(-dt * 4.2);
    pointer.x = mix(pointer.x, pointer.targetX, follow);
    pointer.y = mix(pointer.y, pointer.targetY, follow);
    pointer.presence = mix(pointer.presence, pointer.targetPresence, follow);

    const form = getFormation(time);
    const k = 1 - Math.exp(-dt * (reduced.matches ? 3.2 : 7.5));
    for (const p of particles) {
      const goal = fieldTarget(p, time, form);
      p.x = mix(p.x, goal.x, k);
      p.y = mix(p.y, goal.y, k);
      p.a += Math.atan2(Math.sin(goal.a - p.a), Math.cos(goal.a - p.a)) * k;
    }
  }

  function paint() {
    if (!width || !height || !particles.length) return;
    const ctx = context, pal = colors();
    ctx.clearRect(0, 0, width, height);

    const glow = ctx.createRadialGradient(
      width*.5, height*.5, height*.045,
      width*.5, height*.5, width*.46
    );
    glow.addColorStop(0, pal.halo);
    glow.addColorStop(.57, pal.mist);
    glow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);

    // Batched drawing makes the sculpture much cheaper to animate.
    // Length and orientation are shared coherently with each formation.
    const bins = [[],[],[],[],[],[]];
    const scaleX = width*.48, scaleY = height*.43;
    for (const p of particles) {
      const x = width*.5 + p.x*scaleX;
      const y = height*.5 + p.y*scaleY;
      if (x<-12 || x>width+12 || y<-12 || y>height+12) continue;
      const fade = clamp(Math.min(x,width-x)/(width*.075),0,1) *
        clamp(Math.min(y,height-y)/13,0,1);
      if (fade < .05) continue;
      const h = p.length * .5 * fade;
      const angle = p.a + p.direction;
      const dx = Math.cos(angle)*h, dy=Math.sin(angle)*h;
      const tone = p.tint < .09 ? 2 : p.lane===3 ? 1 : 0;
      const bin = bins[tone*2 + (p.z>.73 ? 1 : 0)];
      bin.push(x-dx,y-dy,x+dx,y+dy);
    }
    ctx.lineCap="round";
    for(let b=0;b<bins.length;b++){
      const segments=bins[b];
      if (!segments.length) continue;
      ctx.beginPath();
      for(let i=0;i<segments.length;i+=4){
        ctx.moveTo(segments[i],segments[i+1]);
        ctx.lineTo(segments[i+2],segments[i+3]);
      }
      const rgb = b<2 ? pal.ink : b<4 ? pal.deep : pal.accent;
      ctx.strokeStyle=rgba(rgb,b<4?.83:.74);
      ctx.lineWidth=b%2?1.45:.90;
      ctx.stroke();
    }
  }

  function frame(ts) {
    raf = 0;
    if (document.hidden || !visible) return;
    const dt = last ? clamp((ts - last) / 1000, 0, .05) : 1/60;
    last = ts;
    pendingDt += dt;

    // A reduced-motion setting slows and simplifies the evolution; it does
    // not freeze the artwork indefinitely, as the previous version did.
    if (reduced.matches && ts-lastRender < 75) {
      schedule();
      return;
    }
    lastRender = ts;
    const elapsed = clamp(pendingDt,0,.12);
    pendingDt=0;
    time += elapsed * (reduced.matches ? .65 : 1);
    update(elapsed);
    paint();
    schedule();
  }
  function schedule() {
    if (!raf && !document.hidden && visible) {
      raf = requestAnimationFrame(frame);
    }
  }
  function placeReduced() {
    // Retained only for startup fallback; we no longer freeze the stage.
    const form = getFormation(time);
    for(const p of particles) {
      const g=fieldTarget(p,time,form);
      p.x=g.x;p.y=g.y;p.a=g.a;
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
    schedule();
  }

  stage.addEventListener("pointerenter", pointerMove, { passive: true });
  stage.addEventListener("pointermove", pointerMove, { passive: true });
  stage.addEventListener("pointerleave", () => {
    pointer.inside = false;
    pointer.targetX=0;pointer.targetY=0;
    pointer.targetPresence = 0;
  }, { passive: true });

  function refresh() {
    sizeCanvas();
    paint();
    schedule();
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
    raf = 0; last = 0; pendingDt=0;
    refresh();
  });

  refresh();
})();
