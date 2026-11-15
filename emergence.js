(() => {
  "use strict";

  /*
   * Emergence: an optical sculpture of three independently moving geometric
   * fields. The image is made by their relationship, not individual objects.
   * It is a conceptual artwork, not a model of any particular research result.
   */
  const canvas = document.getElementById("emergence-field");
  if (!canvas) return;
  const stage = canvas.closest(".emergence-stage");
  const ctx = canvas.getContext("2d", { alpha: true });
  if (!stage || !ctx) return;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const TAU = Math.PI * 2;
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const ease = (a, b, t) => a + (b - a) * t;

  let width = 0, height = 0, dpr = 1;
  let raf = 0, last = 0, time = 0, visible = true;
  let xBases = [], yBases = [], ySamples = [];
  const pointer = {
    inside: false,
    targetX: 0, targetY: 0,
    x: 0, y: 0,
    targetPresence: 0, presence: 0
  };

  function fit() {
    const rect = stage.getBoundingClientRect();
    const w = Math.round(rect.width), h = Math.round(rect.height);
    if (!w || !h) return;
    const density = Math.min(window.devicePixelRatio || 1, 1.5);
    if (w === width && h === height && density === dpr) return;
    width = w;
    height = h;
    dpr = density;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Oversample gently to avoid discontinuities in the interference pattern.
    const columns = Math.max(68, Math.min(270, Math.round(width / 4.25)));
    xBases = Array.from({ length: columns }, (_, i) =>
      (i / (columns - 1)) * (width + 58) - 29
    );
    const rows = Math.max(20, Math.min(33, Math.round(height / 7.2)));
    yBases = Array.from({ length: rows }, (_, j) =>
      (j / (rows - 1)) * (height + 34) - 17
    );
    const samples = Math.max(16, Math.ceil(height / 8));
    ySamples = Array.from({ length: samples + 1 }, (_, k) =>
      k * height / samples
    );
    paint();
  }

  function gradient(rgb, opacity) {
    const g = ctx.createLinearGradient(0, 0, 0, height);
    g.addColorStop(0, "rgba(" + rgb + ",0)");
    g.addColorStop(.16, "rgba(" + rgb + "," + opacity * .38 + ")");
    g.addColorStop(.42, "rgba(" + rgb + "," + opacity + ")");
    g.addColorStop(.64, "rgba(" + rgb + "," + opacity * .92 + ")");
    g.addColorStop(.88, "rgba(" + rgb + "," + opacity * .35 + ")");
    g.addColorStop(1, "rgba(" + rgb + ",0)");
    return g;
  }

  function paint() {
    if (!width || !height) return;
    const dark = document.documentElement.dataset.theme === "dark";
    ctx.clearRect(0, 0, width, height);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // A barely visible floating volume, not an opaque box behind the artwork.
    const halo = ctx.createRadialGradient(
      width * (.50 + pointer.x * .045), height * .51, height * .04,
      width * .50, height * .51, width * .48
    );
    halo.addColorStop(0, dark ? "rgba(127,189,150,.085)" : "rgba(113,153,124,.075)");
    halo.addColorStop(.56, dark ? "rgba(127,189,150,.035)" : "rgba(113,153,124,.025)");
    halo.addColorStop(1, "rgba(127,189,150,0)");
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, width, height);

    const u = time * .12, v = time * .075;
    const px = pointer.x * pointer.presence;
    const py = pointer.y * pointer.presence;

    // Sheet 1: tightly etched vertical waves.
    ctx.strokeStyle = gradient(dark ? "160,205,171" : "66,106,78", dark ? .27 : .245);
    ctx.lineWidth = .70;
    const verticalCenter = width * .48;
    for (let i = 0; i < xBases.length; i++) {
      const base = xBases[i];
      const envelope = .47 + .53 * Math.exp(-Math.pow((base - verticalCenter) / (width * .37), 2));
      ctx.beginPath();
      for (let j = 0; j < ySamples.length; j++) {
        const y = ySamples[j];
        const f = y / height;
        const x = base
          + envelope * 11.5 * Math.sin(f * TAU * 1.13 + base * .012 + u)
          + envelope * 3.6 * Math.sin(f * TAU * 2.45 - base * .009 - v)
          + px * 2.6;
        if (j === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Sheet 2: a nearby, differently curved engraving. Its interference with
    // sheet 1 creates large-scale structures without outlining those structures.
    ctx.globalCompositeOperation = dark ? "screen" : "multiply";
    ctx.strokeStyle = gradient(dark ? "155,227,188" : "74,134,96", dark ? .29 : .25);
    ctx.lineWidth = .72;
    const shift = Math.sin(time * .17) * 4.0 + px * 24;
    const twist = Math.sin(time * .115) * .018 + px * .05;
    for (let i = 0; i < xBases.length; i++) {
      const base = xBases[i] + shift + 1.4;
      const focus = Math.exp(-Math.pow((base - width * .54) / (width * .43), 2));
      ctx.beginPath();
      for (let j = 0; j < ySamples.length; j++) {
        const y = ySamples[j];
        const f = y / height - .5;
        const x = base
          + f * height * (.048 + twist)
          + (5.2 + 6.8 * focus) * Math.sin((f + .5) * TAU * 1.24 + base * .0135 - u * 1.4)
          + 3.3 * Math.sin((f + .5) * TAU * 2.15 + base * .007 + v)
          + (py * 7) * Math.sin(f * TAU);
        if (j === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.globalCompositeOperation = "source-over";

    // Sheet 3: the transverse, almost transparent grain of the material.
    // It is not a network and there are no floating nodes or particles.
    ctx.strokeStyle = gradient(dark ? "194,222,195" : "89,125,96", dark ? .13 : .10);
    ctx.lineWidth = .54;
    for (let j = 0; j < yBases.length; j++) {
      const base = yBases[j];
      ctx.beginPath();
      const samples = Math.max(64, Math.ceil(width / 14));
      for (let k = 0; k <= samples; k++) {
        const x = k * width / samples;
        const f = x / width;
        const y = base
          + 6.4 * Math.sin(f * TAU * 1.6 + j * .115 + time * .095)
          + 3.8 * Math.sin(f * TAU * 3.0 - j * .17 - time * .055)
          + py * 4.5;
        if (k === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // A restrained luminous interference zone follows the layers' relative
    // displacement. No UI controls, labels, hit targets, or click interaction.
    ctx.globalCompositeOperation = dark ? "screen" : "source-over";
    const centerX = width * (.49 + Math.sin(time * .07) * .036 + px * .13);
    const shimmer = ctx.createRadialGradient(
      centerX, height * .51, 4,
      centerX, height * .51, width * .23
    );
    shimmer.addColorStop(0, dark ? "rgba(183,244,192,.085)" : "rgba(98,150,105,.045)");
    shimmer.addColorStop(.50, dark ? "rgba(183,244,192,.035)" : "rgba(98,150,105,.018)");
    shimmer.addColorStop(1, "rgba(183,244,192,0)");
    ctx.fillStyle = shimmer;
    ctx.fillRect(0, 0, width, height);
    ctx.globalCompositeOperation = "source-over";
  }

  function schedule() {
    if (!raf && visible && !document.hidden && !reduced.matches) {
      raf = requestAnimationFrame(frame);
    }
  }
  function frame(ts) {
    raf = 0;
    if (!visible || document.hidden) return;
    const dt = last ? clamp((ts - last) / 1000, 0, .05) : 1 / 60;
    last = ts;
    time += dt;
    const follow = 1 - Math.exp(-dt * 5.7);
    const presenceFollow = 1 - Math.exp(-dt * 3.8);
    pointer.x = ease(pointer.x, pointer.targetX, follow);
    pointer.y = ease(pointer.y, pointer.targetY, follow);
    pointer.presence = ease(pointer.presence, pointer.targetPresence, presenceFollow);
    paint();
    schedule();
  }

  function onPointerMove(event) {
    if (event.pointerType === "touch") return;
    const bounds = stage.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    pointer.targetX = clamp(((event.clientX - bounds.left) / bounds.width - .5) * 2, -1, 1);
    pointer.targetY = clamp(((event.clientY - bounds.top) / bounds.height - .5) * 2, -1, 1);
    pointer.targetPresence = 1;
    pointer.inside = true;
    if (reduced.matches) {
      pointer.x = pointer.targetX; pointer.y = pointer.targetY;
      pointer.presence = 1; paint();
    } else schedule();
  }

  stage.addEventListener("pointermove", onPointerMove, { passive: true });
  stage.addEventListener("pointerenter", onPointerMove, { passive: true });
  stage.addEventListener("pointerleave", () => {
    pointer.inside = false;
    pointer.targetX = 0; pointer.targetY = 0;
    pointer.targetPresence = 0;
    if (reduced.matches) {
      pointer.x = 0; pointer.y = 0; pointer.presence = 0; paint();
    }
  }, { passive: true });

  function refresh() {
    fit();
    if (reduced.matches) paint();
    else schedule();
  }

  if ("ResizeObserver" in window) {
    new ResizeObserver(refresh).observe(stage);
  } else {
    window.addEventListener("resize", refresh, { passive: true });
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
    }, { rootMargin: "100px" }).observe(stage);
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      if (raf) cancelAnimationFrame(raf);
      raf = 0; last = 0;
    } else refresh();
  });
  window.addEventListener("site-theme-change", refresh);
  reduced.addEventListener?.("change", () => {
    if (raf) cancelAnimationFrame(raf);
    raf = 0; last = 0;
    refresh();
  });

  refresh();
})();
