(() => {
  "use strict";

  const heroCanvas = document.getElementById("field");
  const ambientCanvas = document.getElementById("ambient-field");
  if (!heroCanvas || !ambientCanvas) return;

  const heroStage = heroCanvas.parentElement;
  const ambientStage = ambientCanvas.parentElement;
  const heroCtx = heroCanvas.getContext("2d", { alpha: true });
  const ambientCtx = ambientCanvas.getContext("2d", { alpha: true });
  if (!heroCtx || !ambientCtx) return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const TAU = Math.PI * 2;
  const clamp = (x, min = 0, max = 1) => Math.max(min, Math.min(max, x));
  const lerp = (a, b, n) => a + (b - a) * n;
  const smoothstep = (a, b, value) => {
    const t = clamp((value - a) / (b - a));
    return t * t * (3 - 2 * t);
  };
  const fract = value => value - Math.floor(value);

  function seededRandom(seed) {
    let value = seed >>> 0;
    return () => {
      value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
      return value / 4294967296;
    };
  }

  // An original multilayer lattice. Structured connectivity keeps the
  // geometry recognizable while its state remains continuously alive.
  function buildNetwork(seed, ambient) {
    const random = seededRandom(seed);
    const population = ambient ? [5, 8, 10, 11, 10, 8, 5] : [6, 9, 11, 13, 11, 9, 6];
    const layers = [];
    const nodes = [];
    const edges = [];

    population.forEach((count, layerIndex) => {
      const layer = [];
      for (let index = 0; index < count; index++) {
        const u = count > 1 ? index / (count - 1) : .5;
        const spread = ambient ? .79 : .76;
        const x = .095 + (layerIndex / (population.length - 1)) * .81 +
          (random() - .5) * .020;
        const y = .5 + (u - .5) * spread +
          (random() - .5) * .032;
        const node = {
          id: nodes.length,
          layer: layerIndex,
          baseX: x,
          baseY: y,
          x, y,
          phase: random() * TAU,
          pace: .52 + random() * .48,
          size: .85 + random() * .72,
          activation: 0,
          originIndex: index
        };
        nodes.push(node);
        layer.push(node.id);
      }
      layers.push(layer);
    });

    const edgeKeys = new Set();
    function join(a, b, strength) {
      const key = a + "|" + b;
      if (edgeKeys.has(key)) return;
      edgeKeys.add(key);
      edges.push({
        a, b,
        phase: random(),
        pace: .68 + random() * .63,
        weight: strength * (.72 + random() * .36),
        bend: (random() - .5) * .08,
        highlighted: random() < .06
      });
    }

    for (let layer = 0; layer < layers.length - 1; layer++) {
      for (const id of layers[layer]) {
        const candidates = layers[layer + 1]
          .map(next => ({
            id: next,
            distance: Math.abs(nodes[id].baseY - nodes[next].baseY) + random() * .075
          }))
          .sort((a, b) => a.distance - b.distance);
        candidates.slice(0, 2 + (random() < .50 ? 1 : 0))
          .forEach((candidate, rank) => join(id, candidate.id, rank === 0 ? 1 : .68));
        if (layer < layers.length - 2 && random() < .22) {
          const far = layers[layer + 2]
            .reduce((best, next) =>
              Math.abs(nodes[id].baseY - nodes[next].baseY) <
              Math.abs(nodes[id].baseY - nodes[best].baseY) ? next : best);
          join(id, far, .34);
        }
      }
    }

    return { nodes, edges, layers, seed };
  }

  const heroNetwork = buildNetwork(72893, false);
  const ambientNetwork = buildNetwork(110983, true);
  const heroSize = { width: 0, height: 0, dpr: 0 };
  const ambientSize = { width: 0, height: 0, dpr: 0 };

  let elapsed = 0;
  let previous = 0;
  let lastDraw = 0;
  let requestId = 0;
  let heroVisible = true;
  let scroll = window.scrollY || 0;
  let targetScroll = scroll;
  let heroBottom = 780;
  let pageActive = !document.hidden;

  const mouseHero = { x: .5, y: .5, targetX: .5, targetY: .5, active: false, influence: 0 };
  const mouseAmbient = { x: .5, y: .5, targetX: .5, targetY: .5, active: false, influence: 0 };
  const heroWaves = [];
  const ambientWaves = [];

  function sizeCanvas(canvas, ctx, box, width, height, limit) {
    const dpr = Math.min(window.devicePixelRatio || 1, limit);
    const w = Math.max(1, Math.round(width));
    const h = Math.max(1, Math.round(height));
    if (box.width !== w || box.height !== h || box.dpr !== dpr) {
      box.width = w;
      box.height = h;
      box.dpr = dpr;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  }

  function updateGeometry(network, pointer, waves, t, dt, ambient) {
    const easing = reducedMotion.matches ? 1 : 1 - Math.pow(.035, Math.min(dt, .055));
    pointer.x = lerp(pointer.x, pointer.targetX, .14);
    pointer.y = lerp(pointer.y, pointer.targetY, .14);
    pointer.influence = lerp(pointer.influence, pointer.active ? 1 : 0, .075);
    if (reducedMotion.matches) pointer.influence = 0;

    for (let k = waves.length - 1; k >= 0; k--) {
      if (t - waves[k].born > 2.45) waves.splice(k, 1);
    }

    for (const node of network.nodes) {
      const phase = node.phase;
      const amplitude = ambient ? .019 : .015;
      let x = node.baseX +
        Math.sin(t * (.34 + node.pace * .19) + phase) * amplitude +
        Math.sin(t * .17 + node.layer * .9) * .006;
      let y = node.baseY +
        Math.cos(t * (.43 + node.pace * .16) + phase * .75) * amplitude * 1.55 +
        Math.sin(t * .23 + node.originIndex) * .005;
      if (ambient) {
        y += Math.sin(scroll * .00048 + node.layer * .49) * .008;
        x += Math.sin(t * .17 + node.layer * .65) * .009;
      }

      const dx = x - pointer.x;
      const dy = y - pointer.y;
      const distance = Math.hypot(dx, dy);
      const local = Math.pow(Math.max(0, 1 - distance / (ambient ? .31 : .265)), 2);
      const movement = local * pointer.influence;
      const safeDistance = Math.max(.001, distance);

      // Nodes elastically move away from nearby interaction.
      x += (dx / safeDistance) * movement * (ambient ? .044 : .061);
      y += (dy / safeDistance) * movement * (ambient ? .063 : .078);
      let waveActivation = 0;

      for (const wave of waves) {
        const age = Math.max(0, t - wave.born);
        const r = age * (ambient ? .47 : .53);
        const d = Math.hypot(x - wave.x, y - wave.y);
        const proximity = Math.exp(-Math.pow((d - r) / .066, 2)) *
          (1 - smoothstep(1.5, 2.45, age));
        waveActivation = Math.max(waveActivation, proximity);
        const direction = (d - r) >= 0 ? 1 : -1;
        x += (x - wave.x) / Math.max(d, .001) * proximity * .016 * direction;
        y += (y - wave.y) / Math.max(d, .001) * proximity * .016 * direction;
      }

      node.x = lerp(node.x, x, easing);
      node.y = lerp(node.y, y, easing);
      const activation = Math.max(local * pointer.influence, waveActivation);
      node.activation = lerp(node.activation, activation, reducedMotion.matches ? 1 : .18);
    }
  }

  function curvedPath(ctx, a, b, bend, width, height) {
    const x1 = a.x * width, y1 = a.y * height;
    const x2 = b.x * width, y2 = b.y * height;
    const direction = x2 - x1;
    const curving = bend * height;
    const c1x = x1 + direction * .43;
    const c2x = x2 - direction * .43;
    const c1y = y1 + (y2 - y1) * .10 + curving;
    const c2y = y2 - (y2 - y1) * .10 - curving;
    ctx.moveTo(x1, y1);
    ctx.bezierCurveTo(c1x, c1y, c2x, c2y, x2, y2);
  }

  function cubicPoint(a, b, bend, position, width, height) {
    const x1 = a.x * width, y1 = a.y * height;
    const x2 = b.x * width, y2 = b.y * height;
    const direction = x2 - x1;
    const p1 = { x: x1 + direction * .43, y: y1 + (y2 - y1) * .10 + bend * height };
    const p2 = { x: x2 - direction * .43, y: y2 - (y2 - y1) * .10 - bend * height };
    const u = 1 - position;
    return {
      x: u*u*u*x1 + 3*u*u*position*p1.x + 3*u*position*position*p2.x + position*position*position*x2,
      y: u*u*u*y1 + 3*u*u*position*p1.y + 3*u*position*position*p2.y + position*position*position*y2
    };
  }

  function renderNetwork(ctx, network, size, t, pointer, waves, ambient) {
    const width = size.width, height = size.height;
    ctx.clearRect(0, 0, width, height);

    if (!ambient) {
      // A nearly invisible control/mediation region integrated into the lattice,
      // never an explanatory chart or a labeled simulation.
      const gateX = width * .49;
      const regionWidth = width * .14;
      const grad = ctx.createLinearGradient(gateX, 0, gateX + regionWidth, 0);
      grad.addColorStop(0, "rgba(91,132,100,0)");
      grad.addColorStop(.5, "rgba(91,132,100,.055)");
      grad.addColorStop(1, "rgba(91,132,100,0)");
      ctx.fillStyle = grad;
      ctx.fillRect(gateX, height * .13, regionWidth, height * .74);
      ctx.strokeStyle = "rgba(71,112,80,.11)";
      ctx.lineWidth = .65;
      ctx.setLineDash([2, 7]);
      ctx.beginPath();
      ctx.moveTo(gateX + regionWidth * .50, height * .16);
      ctx.lineTo(gateX + regionWidth * .50, height * .84);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Couplings change color and strength near a pointer or impulse.
    for (let index = 0; index < network.edges.length; index++) {
      const edge = network.edges[index];
      const a = network.nodes[edge.a], b = network.nodes[edge.b];
      const distance = Math.hypot(
        (a.x + b.x) * .5 - pointer.x,
        (a.y + b.y) * .5 - pointer.y
      );
      const pointerHighlight = pointer.influence *
        Math.pow(Math.max(0, 1 - distance / .36), 2);
      const waveHighlight = Math.max(a.activation, b.activation) * .72;
      const energy = Math.max(pointerHighlight, waveHighlight);
      const strength = (ambient ? .105 : .115) +
        edge.weight * (ambient ? .075 : .125) +
        energy * (ambient ? .19 : .36);

      ctx.beginPath();
      curvedPath(ctx, a, b, edge.bend, width, height);
      ctx.lineWidth = ambient ? .48 + energy * .35 : .65 + energy * .54;
      ctx.strokeStyle = "rgba(61,107,78," + clamp(strength, 0, ambient ? .36 : .70) + ")";
      ctx.stroke();

      // Visible, continuously moving signals provide an unmistakable sense of life.
      // Two independent streams run at different phases so the network never stalls.
      if (!reducedMotion.matches && (index % (ambient ? 4 : 3) === 0 || energy > .20)) {
        const pace = edge.pace * (ambient ? .115 : .185) * (1 + energy * 1.9);
        const phase = fract(t * pace + edge.phase);
        const p = cubicPoint(a, b, edge.bend, phase, width, height);
        const r = (ambient ? 1.25 : 1.4) + energy * (ambient ? .75 : 1.15);
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, TAU);
        ctx.fillStyle = "rgba(48,109,76," + (ambient ? .32 + energy * .18 : .59 + energy * .30) + ")";
        ctx.fill();
      }
    }

    for (const node of network.nodes) {
      const x = node.x * width, y = node.y * height;
      const activation = node.activation;
      if (activation > .13) {
        const radius = (ambient ? 13 : 22) + activation * (ambient ? 19 : 27);
        const glow = ctx.createRadialGradient(x, y, 0, x, y, radius);
        glow.addColorStop(0, "rgba(66,134,88," + (activation * (ambient ? .13 : .20)) + ")");
        glow.addColorStop(1, "rgba(66,134,88,0)");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, TAU);
        ctx.fill();
      }

      const baseRadius = ambient ? .95 : 1.45;
      ctx.beginPath();
      ctx.arc(x, y, baseRadius * node.size + activation * (ambient ? .65 : 1.5), 0, TAU);
      ctx.fillStyle = "rgba(51,100,70," + clamp(
        (ambient ? .28 : .47) + activation * (ambient ? .40 : .50), 0, 1
      ) + ")";
      ctx.fill();

      if (!ambient && node.layer === 3 && node.id % 2 === 0) {
        ctx.beginPath();
        ctx.arc(x, y, 4.6 + activation * 2.6, 0, TAU);
        ctx.lineWidth = .6;
        ctx.strokeStyle = "rgba(68,123,85," + (.10 + activation * .30) + ")";
        ctx.stroke();
      }
    }

    // A physical impulse propagates outward from the click.
    if (!reducedMotion.matches) {
      for (const wave of waves) {
        const age = Math.max(0, t - wave.born);
        const radius = age * (ambient ? .47 : .53);
        const lifetime = 1 - smoothstep(.6, 2.45, age);
        const radiusPx = radius * Math.min(width, height);
        ctx.beginPath();
        ctx.arc(wave.x * width, wave.y * height, radiusPx, 0, TAU);
        ctx.lineWidth = .8;
        ctx.strokeStyle = "rgba(63,125,81," + (.16 * lifetime) + ")";
        ctx.stroke();
      }
    }
  }

  function refreshLayout() {
    const hero = document.querySelector(".hero");
    if (hero) {
      const rect = hero.getBoundingClientRect();
      heroBottom = rect.bottom + window.scrollY;
    }
  }

  function applyInteraction(pointer, x, y, active) {
    pointer.targetX = clamp(x);
    pointer.targetY = clamp(y);
    pointer.active = active;
  }

  function tick(stamp) {
    requestId = 0;
    if (!pageActive) return;

    if (!reducedMotion.matches && stamp - lastDraw < 28) {
      requestId = requestAnimationFrame(tick);
      return;
    }

    const dt = previous ? Math.min(.06, (stamp - previous) / 1000) : 0;
    previous = stamp;
    lastDraw = stamp;
    if (!reducedMotion.matches) elapsed += dt;
    scroll = lerp(scroll, targetScroll, reducedMotion.matches ? 1 : .08);

    const mobile = window.innerWidth <= 690;
    const reveal = smoothstep(heroBottom * .30, heroBottom * .82, scroll);
    const opacity = reveal * (mobile ? .79 : .96);
    ambientStage.style.opacity = String(opacity);

    if (heroVisible) {
      const rect = heroStage.getBoundingClientRect();
      sizeCanvas(heroCanvas, heroCtx, heroSize, rect.width, rect.height, mobile ? 1.35 : 1.55);
      updateGeometry(heroNetwork, mouseHero, heroWaves, elapsed, dt, false);
      renderNetwork(heroCtx, heroNetwork, heroSize, elapsed, mouseHero, heroWaves, false);
    }

    if (opacity > .005) {
      sizeCanvas(ambientCanvas, ambientCtx, ambientSize,
        window.innerWidth, window.innerHeight, mobile ? 1.13 : 1.35);
      updateGeometry(ambientNetwork, mouseAmbient, ambientWaves, elapsed, dt, true);
      renderNetwork(ambientCtx, ambientNetwork, ambientSize,
        elapsed, mouseAmbient, ambientWaves, true);
    }

    if (!reducedMotion.matches) requestId = requestAnimationFrame(tick);
  }

  function start() {
    if (requestId || !pageActive) return;
    previous = 0;
    requestId = requestAnimationFrame(tick);
  }

  heroStage.addEventListener("pointermove", event => {
    if (event.pointerType === "touch") return;
    const bounds = heroStage.getBoundingClientRect();
    applyInteraction(mouseHero,
      (event.clientX - bounds.left) / bounds.width,
      (event.clientY - bounds.top) / bounds.height,
      true);
    if (reducedMotion.matches) start();
  }, { passive: true });

  heroStage.addEventListener("pointerleave", () => {
    mouseHero.active = false;
    if (reducedMotion.matches) start();
  }, { passive: true });

  heroStage.addEventListener("pointerdown", event => {
    const bounds = heroStage.getBoundingClientRect();
    const x = clamp((event.clientX - bounds.left) / bounds.width);
    const y = clamp((event.clientY - bounds.top) / bounds.height);
    heroWaves.push({ x, y, born: elapsed });
    if (heroWaves.length > 4) heroWaves.shift();
    if (reducedMotion.matches) start();
  }, { passive: true });

  window.addEventListener("pointermove", event => {
    if (event.pointerType === "touch") return;
    applyInteraction(mouseAmbient,
      event.clientX / Math.max(1, window.innerWidth),
      event.clientY / Math.max(1, window.innerHeight),
      true);
    if (reducedMotion.matches) start();
  }, { passive: true });

  window.addEventListener("pointerout", event => {
    if (!event.relatedTarget) mouseAmbient.active = false;
  }, { passive: true });

  window.addEventListener("pointerdown", event => {
    const y = event.clientY / Math.max(1, window.innerHeight);
    const x = event.clientX / Math.max(1, window.innerWidth);
    if (y < 0 || y > 1) return;
    ambientWaves.push({ x: clamp(x), y: clamp(y), born: elapsed });
    if (ambientWaves.length > 3) ambientWaves.shift();
    if (reducedMotion.matches) start();
  }, { passive: true });

  window.addEventListener("scroll", () => {
    targetScroll = window.scrollY || 0;
    if (reducedMotion.matches) start();
  }, { passive: true });

  window.addEventListener("resize", () => {
    refreshLayout();
    if (reducedMotion.matches) start();
  }, { passive: true });

  document.addEventListener("visibilitychange", () => {
    pageActive = !document.hidden;
    if (!pageActive && requestId) {
      cancelAnimationFrame(requestId);
      requestId = 0;
    }
    if (pageActive) start();
  });

  reducedMotion.addEventListener("change", () => {
    if (requestId) cancelAnimationFrame(requestId);
    requestId = 0;
    start();
  });

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(entries => {
      heroVisible = entries[0].isIntersecting;
      if (heroVisible) start();
    }, { rootMargin: "150px" }).observe(heroStage);
  }

  refreshLayout();
  start();
})();