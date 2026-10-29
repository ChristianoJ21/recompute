/* ReCompute motion engine — transform/opacity only, spring easing, pauses off-screen, honours reduced motion.
   Modes: system | full | reduced | off  (RCMotion.setMode). */
(function () {
  if (window.RCMotion) return;
  const mq = matchMedia('(prefers-reduced-motion: reduce)');
  let mode = document.documentElement.dataset.rcMotion || 'system', G = 0;
  const level = () => mode === 'system' ? (mq.matches ? 'reduced' : 'full') : mode;
  const full = () => level() === 'full', off = () => level() === 'off';
  function spring(z, n = 36) { const w = 4.6 / z, wd = w * Math.sqrt(1 - z * z), p = []; for (let i = 0; i <= n; i++) { const t = i / n; p.push(+(1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + (z * w / wd) * Math.sin(wd * t))).toFixed(4)); } p[n] = 1; return `linear(${p.join(',')})`; }
  const lin = CSS.supports && CSS.supports('transition-timing-function', 'linear(0, 1)');
  const SPRING = lin ? spring(.58) : 'cubic-bezier(.34,1.5,.64,1)', SOFT = lin ? spring(.76) : 'cubic-bezier(.3,1.25,.5,1)';
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  /* visibility via rects (IntersectionObserver is unreliable inside off-screen/cross-origin frames) */
  const WM = new Map();
  function checkOne(el, w) { if (!el.isConnected) { WM.delete(el); return; } const r = el.getBoundingClientRect(), v = (r.width + r.height) > 0 && r.bottom > 0 && r.top < innerHeight * .94; if (v !== w.v) { w.v = v; w.fns.slice().forEach(f => f(v)); } }
  function checkAll() { WM.forEach((w, el) => checkOne(el, w)); }
  function watch(el, f) { let w = WM.get(el); if (!w) { w = { fns: [], v: null }; WM.set(el, w); } w.fns.push(f); if (w.v !== null) f(w.v); else checkOne(el, w); }
  setInterval(checkAll, 400);
  function once(el, f) { let d = false; watch(el, v => { if (v && !d) { d = true; f(); } }); }

  /* reveals — batched per frame so siblings stagger 80ms */
  const seen = new WeakSet(); let q = [], qr = 0;
  function prepReveal(el) {
    if (seen.has(el)) return; seen.add(el); if (off()) return;
    const f = full(), dy = f ? (+el.dataset.reveal || 22) : 0;
    const a = [el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: f ? 520 : 320, easing: 'ease-out', fill: 'both' })];
    if (f) a.push(el.animate([{ transform: `translateY(${dy}px) scale(.97)` }, { transform: 'translateY(0px) scale(1)' }], { duration: 900, easing: SPRING, fill: 'both', composite: 'add' }));
    a.forEach(x => x.pause()); el.__rv = a;
    once(el, () => { q.push(el); if (!qr) qr = requestAnimationFrame(flush); });
  }
  function flush() { qr = 0; const b = q.sort((a, c) => a.compareDocumentPosition(c) & 4 ? -1 : 1); q = []; b.forEach((el, i) => (el.__rv || []).forEach(a => { a.effect.updateTiming({ delay: Math.min(i, 8) * 80 }); a.play(); a.finished.then(() => a.cancel(), () => { }); })); }

  /* loops — slow idle, paused off-screen */
  const loops = [];
  function loop(host, t, kf, opt) { if (!full() || !t) return; const g = G; const a = t.animate(kf, Object.assign({ iterations: Infinity, easing: 'ease-in-out' }, opt)); a.pause(); loops.push(a); watch(host, v => { if (g !== G) return; v ? a.play() : a.pause(); }); return a; }
  const ANIMS = {
    wave: (h, s) => loop(h, s.querySelector('.rc-arm-r'), [{ transform: 'rotate(0deg)' }, { transform: 'rotate(-18deg)', offset: .1 }, { transform: 'rotate(8deg)', offset: .2 }, { transform: 'rotate(-14deg)', offset: .3 }, { transform: 'rotate(4deg)', offset: .4 }, { transform: 'rotate(0deg)', offset: .5 }, { transform: 'rotate(0deg)' }], { duration: 4400 }),
    blink: (h, s) => loop(h, s.querySelector('.rc-eyes'), [{ transform: 'scaleY(1)' }, { transform: 'scaleY(1)', offset: .92 }, { transform: 'scaleY(.1)', offset: .955 }, { transform: 'scaleY(1)' }], { duration: 4800 }),
    bob: (h, s) => loop(h, s, [{ transform: 'translateY(0px)' }, { transform: 'translateY(-5px)' }], { duration: 3200, direction: 'alternate', composite: 'add' }),
    point: (h, s) => loop(h, s.querySelector('.rc-arm-r'), [{ transform: 'translateX(0px)' }, { transform: 'translateX(5px)' }], { duration: 3000, direction: 'alternate' }),
    magnify: (h, s) => loop(h, s.querySelector('.rc-arm-r'), [{ transform: 'rotate(-5deg)' }, { transform: 'rotate(5deg)' }], { duration: 3600, direction: 'alternate' }),
    antenna: (h, s) => loop(h, s.querySelector('.rc-antenna'), [{ transform: 'rotate(-5deg)' }, { transform: 'rotate(5deg)' }], { duration: 3400, direction: 'alternate' }),
    work: (h, s) => { loop(h, s.querySelector('.rc-arm-r'), [{ transform: 'rotate(0deg)' }, { transform: 'rotate(14deg)' }, { transform: 'rotate(0deg)' }], { duration: 950 }); loop(h, s.querySelector('.rc-spark'), [{ opacity: 0, transform: 'scale(.4)' }, { opacity: 1, transform: 'scale(1.1)', offset: .45 }, { opacity: 0, transform: 'scale(.6)' }], { duration: 950 }); },
    hop: (h, s) => { loop(h, s, [{ transform: 'translateY(0px) scale(1,1)' }, { transform: 'translateY(0px) scale(1.04,.95)', offset: .15 }, { transform: 'translateY(-14px) scale(.98,1.03)', offset: .45 }, { transform: 'translateY(0px) scale(1,1)', offset: .75 }, { transform: 'translateY(0px) scale(1,1)' }], { duration: 1600, composite: 'add' }); s.querySelectorAll('.rc-confetti').forEach((c, i) => loop(h, c, [{ transform: 'translateY(0px) rotate(0deg)' }, { transform: `translateY(${6 + i % 3 * 3}px) rotate(${i % 2 ? 40 : -40}deg)` }], { duration: 1800 + i * 200, direction: 'alternate', composite: 'add' })); },
    zzz: (h, s) => s.querySelectorAll('.rc-zzz').forEach((z, i) => loop(h, z, [{ transform: 'translate(0px,0px)', opacity: 0 }, { opacity: 1, offset: .3 }, { transform: 'translate(8px,-16px)', opacity: 0 }], { duration: 3600, delay: i * 1200, easing: 'ease-out' })),
    fans: (h, s) => s.querySelectorAll('.rc-fan').forEach(f => loop(h, f, [{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }], { duration: 5200, easing: 'linear' })),
    links: (h, s) => s.querySelectorAll('.rc-link').forEach((l, i) => loop(h, l, [{ transform: 'translateY(0px)' }, { transform: 'translateY(-3px)' }], { duration: 3000, delay: i * 400, direction: 'alternate' }))
  };
  function bindAnims(el) { const s = el.__svg; if (!s) return; (el.dataset.anim || '').split(/\s+/).forEach(n => ANIMS[n] && ANIMS[n](el, s)); }

  function put(el, html) { if (el.__svg && el.__svg.parentNode === el) el.removeChild(el.__svg); el.__svg = null; if (!html) return; const t = document.createElement('template'); t.innerHTML = html; el.__svg = t.content.firstElementChild; el.appendChild(el.__svg); }
  function hydrate(el) { const k = [el.dataset.art, el.dataset.pose, el.dataset.tone, el.dataset.variant, el.dataset.seed].join('|'); if (el.__k === k && el.__svg && el.__svg.isConnected) return false; if (!window.RCArt) return false; el.__k = k; put(el, RCArt.svg(el.dataset.art, el.dataset)); return true; }
  const floated = new WeakSet();
  function bindFloat(el) { if (floated.has(el)) return; floated.add(el); const d = +el.dataset.float || 8; loop(el, el, [{ transform: 'translateY(0px) rotate(0deg)' }, { transform: `translateY(${-d}px) rotate(.7deg)` }], { duration: 3600 + Math.random() * 1800, direction: 'alternate', composite: 'add' }); }
  function bindCount(el) { if (el.__c) return; el.__c = 1; const n = el.firstChild; if (!n || n.nodeType !== 3 || !full()) return; const T = parseFloat(el.dataset.count), fmt = v => Math.round(v).toLocaleString('en-US'); n.nodeValue = fmt(0); once(el, () => { const t0 = performance.now() + (+el.dataset.delay || 0), D = 1500; const f = now => { const p = clamp((now - t0) / D, 0, 1); n.nodeValue = fmt(parseFloat(el.dataset.count) * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(f); }; requestAnimationFrame(f); }); }
  function bindDraw(el) { if (el.__d) return; el.__d = 1; if (off()) return; const go = () => { if (!full()) { el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300 }); return; } el.querySelectorAll('.rc-draw').forEach((p, i) => { const L = p.getTotalLength ? p.getTotalLength() : 0; if (!L) return; p.animate([{ strokeDasharray: `${L} ${L}`, strokeDashoffset: L }, { strokeDasharray: `${L} ${L}`, strokeDashoffset: 0 }], { duration: 1200, delay: i * 120, easing: 'cubic-bezier(.4,0,.2,1)' }); }); el.querySelectorAll('.rc-fill').forEach((p, i) => p.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 700, delay: 600 + i * 120, fill: 'backwards' })); el.querySelectorAll('[data-bar]').forEach((b, i) => b.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: 900, delay: 200 + i * 90, easing: SPRING, fill: 'backwards' })); }; once(el, go); }
  const par = new Set();
  function onScroll() { checkAll(); const vh = innerHeight; if (full()) par.forEach(el => { if (!el.isConnected) { par.delete(el); return; } const r = el.getBoundingClientRect(); if (r.bottom < -200 || r.top > vh + 200) return; el.style.translate = `0 ${(-(r.top + r.height / 2 - vh / 2) * (+el.dataset.parallax || .05)).toFixed(1)}px`; }); scenes.forEach(s => s.scroll && s.scroll()); }
  let st = 0; addEventListener('scroll', () => { if (!st) st = requestAnimationFrame(() => { st = 0; onScroll(); }); }, { passive: true });
  addEventListener('resize', () => scenes.forEach(s => s.build && s.build()));

  /* eyes follow cursor */
  const eyes = new Set(); let pm = 0, px = 0, py = 0;
  addEventListener('pointermove', e => { px = e.clientX; py = e.clientY; if (pm) return; pm = requestAnimationFrame(() => { pm = 0; eyes.forEach(h => { if (!h.isConnected) { eyes.delete(h); return; } const r = h.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) return; const cx = r.left + r.width * .5, cy = r.top + r.height * .34; let dx = px - cx, dy = py - cy; const m = Math.hypot(dx, dy) || 1, k = full() ? Math.min(1, m / 240) * 3.2 : 0; h.querySelectorAll('.rc-pupil').forEach(p => { p.style.transition = 'transform 160ms ease-out'; p.style.transform = `translate(${(dx / m * k).toFixed(2)}px,${(dy / m * k).toFixed(2)}px)`; }); }); }); }, { passive: true });

  /* hover: card lifts (inline style-hover) + its part wiggles */
  document.addEventListener('pointerover', e => { if (!full()) return; const h = e.target.closest && e.target.closest('[data-wiggle-host]'); if (!h || (e.relatedTarget && h.contains(e.relatedTarget))) return; h.querySelectorAll('[data-wiggle]').forEach((p, i) => p.animate([{ rotate: '0deg' }, { rotate: '-7deg' }, { rotate: '6deg' }, { rotate: '-3deg' }, { rotate: '0deg' }], { duration: 460, delay: i * 60, easing: 'ease-in-out' })); h.querySelectorAll('.rc-fan').forEach(f => f.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }], { duration: 900, easing: SOFT })); });

  /* scenes */
  const scenes = new Set(), sceneSeen = new WeakSet();
  const SCENES = {
    hero(root) {
      const dev = root.querySelector('[data-hero-device]'); let running = [], played = false;
      const parts = () => [...root.querySelectorAll('[data-hero-part]')];
      const hide = () => { if (!full()) return; parts().forEach(p => { p.__hold && p.__hold.cancel(); p.__hold = p.animate([{ opacity: 0 }, { opacity: 0 }], { duration: 1, fill: 'forwards' }); }); };
      function play() {
        played = true; running.forEach(a => a.cancel()); running = []; if (!full() || !dev) { parts().forEach(p => p.__hold && p.__hold.cancel()); return; }
        const dr = dev.getBoundingClientRect(), cx = dr.left + dr.width / 2, cy = dr.top + dr.height * .5;
        running.push(dev.animate([{ transform: 'scale(1,1)' }, { transform: 'scale(1.05,.92)', offset: .25 }, { transform: 'scale(.97,1.05)', offset: .5 }, { transform: 'scale(1,1)' }], { duration: 650, delay: 80, easing: 'ease-out', composite: 'add' }));
        parts().forEach((p, i) => {
          p.__hold && p.__hold.cancel(); p.__hold = null;
          const r = p.getBoundingClientRect(), dx = cx - (r.left + r.width / 2), dy = cy - (r.top + r.height / 2), ex = (+p.dataset.ex || 0) * dr.width, ey = (+p.dataset.ey || -.6) * dr.height, rot = +p.dataset.rot || 0, d = 320 + i * 120, D = 1900;
          const a = p.animate([
            { transform: `translate(${dx}px,${dy}px) scale(.3) rotate(0deg)`, opacity: 0, easing: 'cubic-bezier(.2,.8,.3,1)' },
            { transform: `translate(${dx + ex}px,${dy + ey}px) scale(1) rotate(${rot}deg)`, opacity: 1, offset: .34 },
            { transform: `translate(${dx + ex}px,${dy + ey - 6}px) scale(1) rotate(${rot * 1.25}deg)`, opacity: 1, offset: .5, easing: 'cubic-bezier(.5,0,.9,.45)' },
            { transform: 'translate(0px,10px) scale(1.05,.9) rotate(0deg)', opacity: 1, offset: .84, easing: 'ease-out' },
            { transform: 'translate(0px,0px) scale(1,1) rotate(0deg)', opacity: 1 }], { duration: D, delay: d, fill: 'both' });
          running.push(a); a.finished.then(() => a.cancel(), () => { });
          root.querySelectorAll(`[data-hero-bin="${p.dataset.bin}"]`).forEach(b => running.push(b.animate([{ transform: 'scale(1,1)' }, { transform: 'scale(1.06,.92)', offset: .4 }, { transform: 'scale(.98,1.03)', offset: .7 }, { transform: 'scale(1,1)' }], { duration: 440, delay: d + D * .84, easing: 'ease-out', composite: 'add' })));
        });
        const lab = root.querySelectorAll('[data-hero-label]'); lab.forEach((l, i) => running.push(l.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.12) rotate(-3deg)', offset: .4 }, { transform: 'scale(1)' }], { duration: 500, delay: 1950 + i * 140, easing: SPRING, composite: 'add' })));
      }
      hide();
      const start = () => { if (played) return; const how = root.dataset.heroStart || 'load'; if (how === 'scroll') { const s = () => { removeEventListener('scroll', s); play(); }; addEventListener('scroll', s, { passive: true }); } else setTimeout(play, 700); };
      if (document.documentElement.dataset.rcSplash === 'on') addEventListener('rc:splashdone', start, { once: true }); else start();
      root.addEventListener('click', e => { if (e.target.closest('[data-hero-replay]')) play(); });
      return { root, reset() { running.forEach(a => a.cancel()); parts().forEach(p => p.__hold && p.__hold.cancel()); } };
    },
    journey(root) {
      const track = root.querySelector('[data-journey-track]'); if (!track) return;
      let path = null, L = 0, fr = [], active = -1, reach = -1, n = 0;
      const layer = track.querySelector('[data-path-layer]'), trav = track.querySelector('[data-traveler]');
      function build() {
        const tr = track.getBoundingClientRect(), st = [...track.querySelectorAll('[data-station]')]; n = st.length; if (!n || !tr.width) return;
        const P = st.map(s => { const b = s.getBoundingClientRect(); return [b.left + b.width / 2 - tr.left, b.top + b.height / 2 - tr.top]; });
        const horiz = Math.abs(P[n - 1][0] - P[0][0]) > Math.abs(P[n - 1][1] - P[0][1]);
        const all = [horiz ? [P[0][0] - 70, P[0][1]] : [P[0][0], P[0][1] - 40], ...P, horiz ? [P[n - 1][0] + 70, P[n - 1][1]] : [P[n - 1][0], P[n - 1][1] + 30]];
        let d = `M${all[0][0]} ${all[0][1]}`; for (let i = 1; i < all.length; i++) { const a = all[i - 1], b = all[i], my = (a[1] + b[1]) / 2; d += horiz ? ` L${b[0]} ${b[1]}` : ` C${a[0] + (i % 2 ? 24 : -24)} ${my} ${b[0] + (i % 2 ? -24 : 24)} ${my} ${b[0]} ${b[1]}`; }
        const draw = root.dataset.pathStyle !== 'none';
        put(layer, `<svg width="${tr.width}" height="${tr.height}" viewBox="0 0 ${tr.width} ${tr.height}" style="position:absolute;inset:0;overflow:visible">${draw ? `<path d="${d}" fill="none" stroke="#9CC9A9" stroke-opacity=".45" stroke-width="18" stroke-linecap="round"/>` : ''}<path class="m" d="${d}" fill="none" stroke="#B8703F" stroke-width="${draw ? 3.5 : 0}" stroke-dasharray="1 11" stroke-linecap="round"/></svg>`);
        path = layer.__svg.querySelector('path.m'); L = path.getTotalLength();
        fr = P.map(p => { let best = 0, bd = 1e9; for (let i = 0; i <= 160; i++) { const q = path.getPointAtLength(L * i / 160), dd = (q.x - p[0]) ** 2 + (q.y - p[1]) ** 2; if (dd < bd) { bd = dd; best = i / 160; } } return best; });
        scroll();
      }
      function prog() { const vh = innerHeight; if (root.dataset.mode === 'sticky') { const r = root.getBoundingClientRect(); return clamp(-r.top / Math.max(1, r.height - vh), 0, 1); } const r = track.getBoundingClientRect(); return clamp((vh * .58 - r.top) / Math.max(1, r.height), 0, 1); }
      function scroll() {
        if (!path) return; const on = full(); trav.style.opacity = on ? 1 : 0; trav.style.visibility = on ? 'visible' : 'hidden';
        const p = prog(), k = clamp((p - .04) / .82, 0, 1), seg = k * (n - 1), i = Math.min(n - 2, Math.floor(seg)), t = seg - i, s = t * t * t * (t * (t * 6 - 15) + 10);
        const f = n > 1 ? fr[i] + (fr[i + 1] - fr[i]) * s : fr[0], pt = path.getPointAtLength(L * clamp(p < .04 ? fr[0] * (p / .04) : f, 0, 1));
        const w = trav.offsetWidth, h = trav.offsetHeight, bottom = trav.dataset.anchor === 'bottom';
        trav.style.transform = `translate(${(pt.x - w / 2).toFixed(1)}px,${(pt.y - (bottom ? h : h / 2)).toFixed(1)}px)`;
        const a = Math.round(seg); if (a !== active) { active = a; reach = Math.max(reach, a); trav.querySelectorAll('[data-state]').forEach(el => { const v = el.dataset.state.split(' ').map(Number).includes(a); el.style.opacity = v ? 1 : 0; el.style.transform = v ? 'scale(1)' : 'scale(.6)'; }); if (on) { const inner = trav.firstElementChild; inner && inner.animate([{ transform: 'scale(1,1)' }, { transform: 'scale(1.08,.92)' }, { transform: 'scale(1,1)' }], { duration: 420, easing: SPRING }); } root.dispatchEvent(new CustomEvent('rc:step', { bubbles: true, detail: a })); }
        root.querySelectorAll('[data-step-card]').forEach((c, j) => { const vis = !on || j <= reach; c.style.opacity = vis ? 1 : .42; c.style.translate = vis ? '0 0' : '0 12px'; });
      }
      new ResizeObserver(() => build()).observe(track); build();
      root.__go = i => { const vh = innerHeight, k = n > 1 ? i / (n - 1) : 0, p = .04 + .82 * k + .005; if (root.dataset.mode === 'sticky') { const top = root.getBoundingClientRect().top + scrollY; scrollTo({ top: top + p * (root.offsetHeight - vh), behavior: full() ? 'smooth' : 'auto' }); } else { const st = track.querySelectorAll('[data-station]')[i]; if (st) scrollTo({ top: st.getBoundingClientRect().top + scrollY - vh * .45, behavior: full() ? 'smooth' : 'auto' }); } };
      return { root, build, scroll, reset() { active = -1; scroll(); } };
    }
  };
  function bindScene(el) { if (sceneSeen.has(el)) return; const f = SCENES[el.dataset.scene]; if (!f) return; sceneSeen.add(el); const s = f(el); if (s) scenes.add(s); }

  function scan() {
    document.querySelectorAll('[data-art]').forEach(el => { if (hydrate(el) && el.dataset.anim) bindAnims(el); });
    document.querySelectorAll('[data-reveal],[data-stagger]>*').forEach(prepReveal);
    document.querySelectorAll('[data-float]').forEach(bindFloat);
    document.querySelectorAll('[data-count]').forEach(bindCount);
    document.querySelectorAll('[data-parallax]').forEach(e => par.add(e));
    document.querySelectorAll('[data-scene]').forEach(bindScene);
    document.querySelectorAll('[data-draw]').forEach(bindDraw);
    document.querySelectorAll('[data-eyes]').forEach(e => eyes.add(e));
  }
  /* The page is a React app: elements come and go with the route. Drop the loops and scenes of removed elements. */
  function prune() {
    for (let i = loops.length; i--;) { const t = loops[i].effect && loops[i].effect.target; if (t && !t.isConnected) { loops[i].cancel(); loops.splice(i, 1); } }
    scenes.forEach(s => { if (s.root && !s.root.isConnected) scenes.delete(s); });
  }
  let sr = 0, sc = 0, sct = performance.now(); const sched = () => { if (!sr) sr = requestAnimationFrame(() => { sr = 0; const now = performance.now(); prune(); if (now - sct > 1000) { if (sc > 40) console.warn('RC scan storm', sc); sc = 0; sct = now; } sc++; scan(); onScroll(); }); };
  new MutationObserver(sched).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-art', 'data-pose', 'data-tone', 'data-variant'] });
  addEventListener('beforeprint', () => document.getAnimations().forEach(a => { try { a.finish(); } catch (e) { a.cancel(); } }));
  function setMode(m) {
    if (m === mode) return; mode = m; document.documentElement.dataset.rcMotion = m; G++;
    loops.splice(0).forEach(a => a.cancel());
    document.getAnimations().forEach(a => { if (a.effect && a.effect.target && a.effect.target.closest && a.effect.target.closest('[data-reveal],[data-stagger],[data-hero-part]')) a.cancel(); });
    document.querySelectorAll('[data-art][data-anim]').forEach(bindAnims);
    document.querySelectorAll('[data-float]').forEach(el => { floated.delete(el); bindFloat(el); });
    if (!full()) { par.forEach(el => el.style.translate = ''); document.querySelectorAll('.rc-pupil').forEach(p => p.style.transform = ''); }
    scenes.forEach(s => { s.reset && s.reset(); s.scroll && s.scroll(); });
  }
  mq.addEventListener && mq.addEventListener('change', () => { if (mode === 'system') { const m = mode; mode = ''; setMode(m); } });
  window.RCMotion = { setMode, level, full, go(sel, i) { const r = document.querySelector(sel); r && r.__go && r.__go(i); }, SPRING };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', sched); else sched();
})();
