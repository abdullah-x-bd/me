(() => {
  'use strict';

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mobileToggle = document.querySelector('.menu-toggle');
  const mobileNav = document.querySelector('#mobile-nav');

  if (mobileToggle && mobileNav) {
    const closeMenu = () => {
      mobileToggle.setAttribute('aria-expanded', 'false');
      mobileToggle.setAttribute('aria-label', 'Open navigation');
      mobileNav.hidden = true;
    };
    mobileToggle.addEventListener('click', () => {
      const opening = mobileToggle.getAttribute('aria-expanded') !== 'true';
      mobileToggle.setAttribute('aria-expanded', String(opening));
      mobileToggle.setAttribute('aria-label', opening ? 'Close navigation' : 'Open navigation');
      mobileNav.hidden = !opening;
    });
    mobileNav.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });
  }

  document.querySelector('#year').textContent = String(new Date().getFullYear());

  const reveals = document.querySelectorAll('[data-reveal]');
  if (reducedMotion.matches || !('IntersectionObserver' in window)) {
    reveals.forEach(el => el.classList.add('is-visible'));
  } else {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: .07, rootMargin: '0px 0px -32px 0px' });
    reveals.forEach(el => observer.observe(el));
  }

  // Kinetic topology field. An original GPU-drawn parametric sculpture
  // generated entirely from line primitives, without textures or libraries.
  const canvas = document.querySelector('#kinetic-field');
  if (!canvas) return;
  const hero = document.querySelector('.hero');
  let gl;
  try { gl = canvas.getContext('webgl2', { alpha: true, antialias: true, depth: false, powerPreference: 'low-power' }); }
  catch (_) { gl = null; }

  const vertexSource = `#version 300 es
    precision highp float;
    in vec3 a_coordinates;
    uniform float u_time;
    uniform vec2 u_pointer;
    uniform float u_aspect;
    out float v_depth;
    out float v_band;
    out float v_axis;

    void main() {
      float t = a_coordinates.x;
      float b = a_coordinates.y;
      float lineType = a_coordinates.z;
      float time = u_time * 0.13;
      float radius = 1.38 + 0.15 * sin(3.0*t + 0.18*cos(time))
                     + 0.35*b*cos(2.0*t + 0.10*time);
      float height = 0.38*sin(2.0*t + time*0.42)
                     + 0.48*b*sin(2.0*t - time*0.25)
                     + 0.20*cos(3.0*t + 0.8);
      vec3 p = vec3(radius*cos(t), height, radius*sin(t));

      float ax = -0.34 + u_pointer.y * 0.23 + .055*sin(time*.5);
      float ay = 0.55 + u_time * 0.045 + u_pointer.x * 0.26;
      mat3 ry = mat3(cos(ay),0.,-sin(ay), 0.,1.,0., sin(ay),0.,cos(ay));
      mat3 rx = mat3(1.,0.,0., 0.,cos(ax),sin(ax), 0.,-sin(ax),cos(ax));
      p = rx * ry * p;
      float perspective = 3.2 / (6.5-p.z);
      gl_Position = vec4(p.x * perspective / max(u_aspect, 0.8), p.y * perspective, 0.0, 1.0);
      v_depth = p.z;
      v_band = b;
      v_axis = lineType;
    }
  `;

  const fragmentSource = `#version 300 es
    precision highp float;
    in float v_depth;
    in float v_band;
    in float v_axis;
    out vec4 outColor;
    void main() {
      float front = smoothstep(-1.95, 2.15, v_depth);
      float edge = pow(abs(v_band), 1.5);
      float alpha = (0.085 + 0.22*front) * (0.81 + 0.19*edge);
      alpha *= mix(.56, 1.0, v_axis);
      vec3 farInk = vec3(.49, .58, .51);
      vec3 nearInk = vec3(.18, .28, .235);
      vec3 pigment = mix(farInk, nearInk, front);
      outColor = vec4(pigment, alpha);
    }
  `;

  const compile = (kind, source) => {
    const shader = gl.createShader(kind);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      gl.deleteShader(shader);
      throw new Error('Shader compile error');
    }
    return shader;
  };

  const drawFallback = () => {
    const context = canvas.getContext('2d');
    if (!context) return;
    const bounds = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 1.7);
    canvas.width = Math.floor(bounds.width * dpr);
    canvas.height = Math.floor(bounds.height * dpr);
    context.scale(dpr, dpr);
    context.clearRect(0, 0, bounds.width, bounds.height);
    const cx = bounds.width * .52, cy = bounds.height * .49;
    const radius = Math.min(bounds.width, bounds.height) * .32;
    for (let j = 0; j < 76; j++) {
      const v = (j/75)*2-1;
      context.beginPath();
      for (let k = 0; k <= 250; k++) {
        const t = k / 250 * Math.PI * 2;
        const r = radius * (1 + .12*Math.sin(t*3) + .23*v*Math.cos(t*1.5));
        const x = cx + r * Math.cos(t), y = cy + r*.61*Math.sin(t) + radius*.25*v*Math.sin(t*1.5);
        if (k === 0) context.moveTo(x, y); else context.lineTo(x, y);
      }
      context.strokeStyle = 'rgba(57,79,65,.12)';
      context.lineWidth = 1;
      context.stroke();
    }
  };

  if (!gl) {
    drawFallback();
    window.addEventListener('resize', drawFallback, { passive: true });
    return;
  }

  try {
    const program = gl.createProgram();
    const v = compile(gl.VERTEX_SHADER, vertexSource);
    const f = compile(gl.FRAGMENT_SHADER, fragmentSource);
    gl.attachShader(program, v);
    gl.attachShader(program, f);
    gl.linkProgram(program);
    gl.deleteShader(v);
    gl.deleteShader(f);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Shader link error');
    gl.useProgram(program);

    const points = [];
    const add = (u0, b0, u1, b1, type) => points.push(u0, b0, type, u1, b1, type);
    // Meridians: dense fine strands following the loop.
    const strands = 108, subdivisions = 250;
    for (let j = 0; j < strands; j++) {
      const b = -1 + 2*j/(strands-1);
      for (let k = 0; k < subdivisions; k++) {
        const a0 = 2*Math.PI*k/subdivisions;
        const a1 = 2*Math.PI*(k+1)/subdivisions;
        add(a0,b,a1,b,1);
      }
    }
    // The cross-section is stitched more sparingly.
    for (let j = 0; j <= 46; j++) {
      const t = 2*Math.PI*j/46;
      for (let k = 0; k < 38; k++) {
        add(t,-1+2*k/38,t,-1+2*(k+1)/38,0);
      }
    }

    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(points), gl.STATIC_DRAW);
    const attr = gl.getAttribLocation(program, 'a_coordinates');
    gl.enableVertexAttribArray(attr);
    gl.vertexAttribPointer(attr, 3, gl.FLOAT, false, 0, 0);
    const locTime = gl.getUniformLocation(program, 'u_time');
    const locPointer = gl.getUniformLocation(program, 'u_pointer');
    const locAspect = gl.getUniformLocation(program, 'u_aspect');
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.disable(gl.DEPTH_TEST);

    let targetX = 0, targetY = 0, pointerX = 0, pointerY = 0;
    let visible = true, frame = 0, previous = 0, elapsed = 0;
    let width = 0, height = 0;

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.6);
      width = Math.max(1, Math.round(bounds.width * dpr));
      height = Math.max(1, Math.round(bounds.height * dpr));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      gl.viewport(0,0,width,height);
    };

    const render = (timestamp = 0) => {
      frame = 0;
      if (!visible || document.hidden) return;
      resize();
      const delta = previous ? Math.min(.05, (timestamp - previous) / 1000) : 0;
      previous = timestamp;
      if (!reducedMotion.matches) elapsed += delta;
      pointerX += (targetX - pointerX) * .045;
      pointerY += (targetY - pointerY) * .045;
      gl.clearColor(0,0,0,0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(program);
      gl.bindVertexArray(vao);
      gl.uniform1f(locTime, elapsed);
      gl.uniform2f(locPointer, pointerX, pointerY);
      gl.uniform1f(locAspect, width / height);
      gl.drawArrays(gl.LINES, 0, points.length/3);
      if (!reducedMotion.matches) frame = requestAnimationFrame(render);
    };

    const start = () => {
      if (frame || !visible || document.hidden) return;
      previous = 0;
      frame = requestAnimationFrame(render);
    };

    hero.addEventListener('pointermove', e => {
      if (e.pointerType === 'touch') return;
      const r = hero.getBoundingClientRect();
      targetX = ((e.clientX - r.left) / r.width - .5) * 2;
      targetY = ((e.clientY - r.top) / r.height - .5) * 2;
    }, { passive: true });
    hero.addEventListener('pointerleave', () => { targetX = 0; targetY = 0; }, { passive: true });

    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(entries => {
        visible = entries[0].isIntersecting;
        if (visible) start();
      }, { rootMargin: '150px' });
      io.observe(hero);
    }
    document.addEventListener('visibilitychange', () => { if (!document.hidden) start(); });
    reducedMotion.addEventListener('change', () => {
      if (reducedMotion.matches && frame) cancelAnimationFrame(frame);
      frame = 0;
      start();
    });
    window.addEventListener('resize', () => { resize(); if (reducedMotion.matches) render(); }, { passive: true });
    canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); if (frame) cancelAnimationFrame(frame); frame = 0; });
    start();
  } catch (error) {
    // A small 2D field keeps the page legible on restricted GPU drivers.
    canvas.width = canvas.height = 1;
    // The WebGL context has already been acquired, so provide an unobtrusive
    // CSS fallback without attempting to create a different context type.
    canvas.style.display = 'none';
    document.querySelector('.hero-art').classList.add('is-fallback');
  }
})();