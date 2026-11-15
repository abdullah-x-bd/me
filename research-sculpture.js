(() => {
  'use strict';

  // Independent orbital sculpture: deliberately distinct from the hero's neural manifold.
  const canvas = document.getElementById('research-sculpture-canvas');
  if (!canvas) return;
  const stage = canvas.closest('.research-sculpture-stage');
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!stage || !ctx) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const TAU = Math.PI * 2;
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const mix = (a, b, t) => a + (b - a) * t;
  const orbitSettings = [
    { radius: 1.07, pitch:  0.12, yaw:  0.00, roll: -.13, phase: .03 },
    { radius: 1.00, pitch:  1.03, yaw: -.38, roll:  .24, phase: .24 },
    { radius: 1.00, pitch: -1.06, yaw:  .39, roll: -.17, phase: .43 },
    { radius:  .98, pitch:   .28, yaw: 1.19, roll:  .29, phase: .68 }
  ];

  let width = 0, height = 0, dpr = 1;
  let visible = true, raf = 0, lastFrame = 0, lastDraw = 0, elapsed = 0;
  const pointer = { inside: false, anchorX: 0, anchorY: 0, x: 0, y: 0, tx: 0, ty: 0, energy: 0 };
  const projectPoint = (p, rotations, scale) => {
    let [x, y, z] = p;
    const cx = Math.cos(rotations.x), sx = Math.sin(rotations.x);
    const cy = Math.cos(rotations.y), sy = Math.sin(rotations.y);
    const cz = Math.cos(rotations.z), sz = Math.sin(rotations.z);
    const py = y * cx - z * sx;
    z = y * sx + z * cx; y = py;
    const px = x * cy + z * sy;
    z = -x * sy + z * cy; x = px;
    const qx = x * cz - y * sz;
    y = x * sz + y * cz; x = qx;
    const perspective = 2.85 / (2.85 - z * .28);
    return { x: width * .5 + x * scale * perspective,
             y: height * .50 + y * scale * perspective,
             z, perspective };
  };
  const orbitPoint = (setting, angle, elapsedTime) => {
    const r = setting.radius * (1 + .007 * Math.sin(elapsedTime * .63 + angle * 3 + setting.phase));
    let x = Math.cos(angle) * r;
    let y = Math.sin(angle) * r * .96;
    let z = .018 * Math.sin(angle * 3 + setting.phase * TAU);
    const cx = Math.cos(setting.pitch), sx = Math.sin(setting.pitch);
    const ny = y * cx - z * sx;
    z = y * sx + z * cx; y = ny;
    const cy = Math.cos(setting.yaw), sy = Math.sin(setting.yaw);
    const nx = x * cy + z * sy;
    z = -x * sy + z * cy; x = nx;
    const cz = Math.cos(setting.roll), sz = Math.sin(setting.roll);
    return [x * cz - y * sz, x * sz + y * cz, z];
  };

  function resize() {
    const rect = stage.getBoundingClientRect();
    const w = Math.round(rect.width), h = Math.round(rect.height);
    if (w < 1 || h < 1) return;
    const nextDpr = Math.min(window.devicePixelRatio || 1, 1.6);
    if (w === width && h === height && dpr === nextDpr) return;
    width = w; height = h; dpr = nextDpr;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (reducedMotion.matches) render();
  }

  function render() {
    if (!width || !height) return;
    const dark = document.documentElement.dataset.theme === 'dark';
    const scrollRect = stage.getBoundingClientRect();
    const scrollFocus = reducedMotion.matches ? 0 :
      clamp((window.innerHeight * .5 - (scrollRect.top + scrollRect.height * .5)) / window.innerHeight, -1, 1);
    const scale = Math.min(width * .35, height * .45);
    const rotations = {
      x: -.19 + Math.sin(elapsed * .21) * (reducedMotion.matches ? 0 : .05) + pointer.y * .10 + scrollFocus * .055,
      y:  .26 + elapsed * (reducedMotion.matches ? 0 : .12) + pointer.x * .13,
      z: -.04 + Math.sin(elapsed * .13) * (reducedMotion.matches ? 0 : .035)
    };
    const project = p => projectPoint(p, rotations, scale);
    const cursorX = width * .5 + pointer.x * width * .33;
    const cursorY = height * .5 + pointer.y * height * .34;
    const emphasis = (p) => {
      const distance = Math.hypot(p.x - cursorX, p.y - cursorY);
      return pointer.energy * Math.pow(Math.max(0, 1 - distance / (scale * .95)), 1.65);
    };

    ctx.clearRect(0, 0, width, height);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Thin nested orbits, sorted back to front to retain genuine three-dimensional depth.
    const arcs = [], lights = [];
    for (let band = 0; band < orbitSettings.length; band++) {
      const ring = orbitSettings[band];
      const samples = [];
      for (let i = 0; i <= 112; i++) {
        samples.push(project(orbitPoint(ring, TAU * i / 112, elapsed)));
      }
      for (let i = 0; i < 112; i++) {
        const a = samples[i], b = samples[i + 1];
        arcs.push({ a, b, z: (a.z + b.z) / 2, band, emphasis: Math.max(emphasis(a), emphasis(b)) });
      }
      for (let i = 0; i < 18; i++) {
        const angle = TAU * (i / 18 + ring.phase * .07);
        const p = project(orbitPoint(ring, angle, elapsed));
        lights.push({ ...p, kind: 'anchor', emphasis: emphasis(p), band });
      }
      if (!reducedMotion.matches) {
        const angle = TAU * ((elapsed * (.028 + band * .008) + ring.phase) % 1);
        const p = project(orbitPoint(ring, angle, elapsed));
        lights.push({ ...p, kind: 'signal', emphasis: emphasis(p), band });
      }
    }
    arcs.sort((a, b) => a.z - b.z);
    for (const arc of arcs) {
      const front = clamp((arc.z + 1.25) / 2.5, 0, 1);
      const alpha = (dark ? .10 : .085) + front * (dark ? .35 : .31) + arc.emphasis * .26;
      const rgb = dark ? '158,216,170' : '49,100,67';
      ctx.beginPath();
      ctx.moveTo(arc.a.x, arc.a.y);
      ctx.lineTo(arc.b.x, arc.b.y);
      ctx.lineWidth = .53 + front * .67 + arc.emphasis * .30;
      ctx.strokeStyle = 'rgba(' + rgb + ',' + clamp(alpha, 0, .92) + ')';
      ctx.stroke();
    }

    // The core is held inside the outer orbits like a suspended architectural specimen.
    const facets = [];
    const levels = [
      { y: -.36, r: .29 },
      { y: -.10, r: .41 },
      { y:  .19, r: .37 },
      { y:  .41, r: .19 }
    ];
    for (let j = 0; j < levels.length; j++) {
      const layer = levels[j];
      const points = [];
      for (let k = 0; k < 10; k++) {
        const angle = TAU * k / 10 + j * .09 + elapsed * (reducedMotion.matches ? 0 : .015);
        points.push(project([
          Math.cos(angle) * layer.r,
          layer.y + .018 * Math.sin(angle * 3 + elapsed * .32),
          Math.sin(angle) * layer.r
        ]));
      }
      for (let k = 0; k < points.length; k++) {
        const a = points[k], b = points[(k + 1) % points.length];
        facets.push({ a, b, z: (a.z + b.z) / 2 });
        lights.push({ ...a, kind: 'core', emphasis: emphasis(a) });
      }
      if (j > 0) {
        const previous = levels[j - 1];
        for (let k = 0; k < 10; k++) {
          const angle = TAU * k / 10 + (j - 1) * .09 + elapsed * (reducedMotion.matches ? 0 : .015);
          const p = project([
            Math.cos(angle) * previous.r,
            previous.y + .018 * Math.sin(angle * 3 + elapsed * .32),
            Math.sin(angle) * previous.r
          ]);
          facets.push({ a: p, b: points[k], z: (p.z + points[k].z) / 2 });
        }
      }
    }
    facets.sort((a, b) => a.z - b.z);
    for (const segment of facets) {
      const front = clamp((segment.z + .8) / 1.6, 0, 1);
      const local = Math.max(emphasis(segment.a), emphasis(segment.b));
      ctx.beginPath();
      ctx.moveTo(segment.a.x, segment.a.y);
      ctx.lineTo(segment.b.x, segment.b.y);
      ctx.lineWidth = .65 + .47 * front;
      ctx.strokeStyle = dark
        ? 'rgba(189,235,193,' + (.20 + front * .39 + local * .15) + ')'
        : 'rgba(57,103,68,' + (.15 + front * .39 + local * .15) + ')';
      ctx.stroke();
    }

    lights.sort((a, b) => a.z - b.z);
    for (const light of lights) {
      const front = clamp((light.z + 1.2) / 2.4, 0, 1);
      const signal = light.kind === 'signal';
      const core = light.kind === 'core';
      const radius = (signal ? 2.15 : core ? 1.16 : 1.06) + front * (signal ? .64 : .75) + light.emphasis * 1.2;
      const alpha = (dark ? .29 : .26) + front * .49 + (signal ? .18 : 0) + light.emphasis * .15;
      if (signal || light.emphasis > .28) {
        ctx.beginPath();
        ctx.arc(light.x, light.y, radius * 3.6, 0, TAU);
        const glow = ctx.createRadialGradient(light.x, light.y, 0, light.x, light.y, radius * 3.6);
        glow.addColorStop(0, dark ? 'rgba(185,241,195,.16)' : 'rgba(68,133,83,.12)');
        glow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = glow;
        ctx.fill();
      }
      ctx.beginPath();
      ctx.arc(light.x, light.y, radius, 0, TAU);
      ctx.fillStyle = dark
        ? 'rgba(195,238,200,' + clamp(alpha, 0, 1) + ')'
        : 'rgba(48,101,68,' + clamp(alpha, 0, 1) + ')';
      ctx.fill();
    }
  }

  function tick(timestamp) {
    raf = 0;
    if (document.hidden || !visible) return;
    if (reducedMotion.matches) { render(); return; }
    if (timestamp - lastDraw < 29) { schedule(); return; }
    const dt = lastFrame ? Math.min(.05, (timestamp - lastFrame) / 1000) : 0;
    lastFrame = timestamp; lastDraw = timestamp; elapsed += dt;
    pointer.x = mix(pointer.x, pointer.tx, .063);
    pointer.y = mix(pointer.y, pointer.ty, .063);
    pointer.energy = mix(pointer.energy, pointer.inside ? 1 : 0, .08);
    render();
    schedule();
  }
  function schedule() {
    if (!raf && !document.hidden && visible) raf = requestAnimationFrame(tick);
  }
  function changePointer(e, entering) {
    if (e.pointerType === 'touch') return;
    const rect = stage.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const x = (e.clientX - rect.left) / rect.width - .5;
    const y = (e.clientY - rect.top) / rect.height - .5;
    if (entering || !pointer.inside) {
      pointer.anchorX = x; pointer.anchorY = y;
      pointer.inside = true;
    }
    pointer.tx = clamp((x - pointer.anchorX) * 1.3, -.8, .8);
    pointer.ty = clamp((y - pointer.anchorY) * 1.2, -.8, .8);
    if (reducedMotion.matches) render();
  }
  stage.addEventListener('pointerenter', e => changePointer(e, true), { passive: true });
  stage.addEventListener('pointermove', e => changePointer(e, false), { passive: true });
  stage.addEventListener('pointerleave', () => {
    pointer.inside = false;
    pointer.tx = 0; pointer.ty = 0;
    if (reducedMotion.matches) render();
  }, { passive: true });

  const refresh = () => { resize(); if (reducedMotion.matches) render(); else schedule(); };
  if ('ResizeObserver' in window) new ResizeObserver(refresh).observe(stage);
  else window.addEventListener('resize', refresh, { passive: true });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
      if (visible) refresh();
      else if (raf) { cancelAnimationFrame(raf); raf = 0; lastFrame = 0; }
    }, { rootMargin: '120px' }).observe(stage);
  }
  window.addEventListener('site-theme-change', refresh);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (raf) cancelAnimationFrame(raf);
      raf = 0; lastFrame = 0;
    } else refresh();
  });
  reducedMotion.addEventListener?.('change', () => {
    if (raf) cancelAnimationFrame(raf);
    raf = 0; lastFrame = 0; refresh();
  });
  refresh();
})();
