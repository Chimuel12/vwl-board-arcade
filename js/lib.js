/* Shared helpers: DOM builders, storage, tweening, particles and SVG plots. */
(function () {
  const App = (window.App = { games: [] });
  const SVGNS = "http://www.w3.org/2000/svg";

  function apply(e, attrs) {
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === "text") e.textContent = v;
      else if (k === "html") e.innerHTML = v;
      else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
      else if (k === "style" && typeof v === "object") Object.assign(e.style, v);
      else e.setAttribute(k, v === true ? "" : v);
    }
    return e;
  }
  App.h = (tag, attrs, ...kids) => {
    const e = apply(document.createElement(tag), attrs);
    kids.flat().forEach(k => k != null && e.append(k));
    return e;
  };
  App.s = (tag, attrs, ...kids) => {
    const e = apply(document.createElementNS(SVGNS, tag), attrs);
    kids.flat().forEach(k => k != null && e.append(k));
    return e;
  };
  App.set = (e, attrs) => apply(e, attrs);

  App.reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* storage (never required for the app to work) */
  App.store = {
    get(k, d) { try { const v = localStorage.getItem("vba:" + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem("vba:" + k, JSON.stringify(v)); } catch (e) {} }
  };
  App.best = id => App.store.get("best:" + id, null);
  App.saveScore = (id, score) => {
    const b = App.best(id);
    if (b == null || score > b) App.store.set("best:" + id, score);
    const plays = App.store.get("plays:" + id, 0) + 1;
    App.store.set("plays:" + id, plays);
    return b == null || score > b;
  };

  /* tween with ease-out; runs instantly when reduced motion is on */
  App.tween = (dur, fn, done) => {
    if (App.reduced || dur <= 0) { fn(1); done && done(); return () => {}; }
    let raf, t0 = performance.now(), dead = false;
    const step = now => {
      if (dead) return;
      const t = Math.min(1, (now - t0) / dur);
      fn(1 - Math.pow(1 - t, 3));
      if (t < 1) raf = requestAnimationFrame(step); else done && done();
    };
    raf = requestAnimationFrame(step);
    return () => { dead = true; cancelAnimationFrame(raf); };
  };
  App.lerp = (a, b, t) => a + (b - a) * t;

  /* number formats */
  const nf0 = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 });
  const nf1 = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 1 });
  const nf2 = new Intl.NumberFormat("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  App.n0 = v => nf0.format(v);
  App.n1 = v => nf1.format(v);
  App.n2 = v => nf2.format(v);
  App.eur = v => nf0.format(v) + " €";

  /* count-up for a number element */
  App.countTo = (el, to, fmt, dur = 450) => {
    const from = +(el.dataset.v || 0);
    el.dataset.v = to;
    App.tween(dur, t => { el.textContent = fmt(App.lerp(from, to, t)); });
  };

  App.shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  App.css = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

  /* particles: water spray / snow burst from an element */
  const fx = () => document.getElementById("fx");
  let parts = [], fxRaf = null;
  App.burst = (el, kind = "surf", n = 26) => {
    if (App.reduced || !el) return;
    const c = fx(); if (!c) return;
    const r = el.getBoundingClientRect();
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    const cols = kind === "snow" ? [App.css("--snow"), App.css("--peak"), "#ffffff"] : [App.css("--surf"), App.css("--sea1"), App.css("--sun")];
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = 2 + Math.random() * 5;
      parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 3, r: 2 + Math.random() * 3.5, life: 1, c: cols[i % cols.length] });
    }
    if (!fxRaf) loop();
  };
  function loop() {
    const c = fx(), dpr = window.devicePixelRatio || 1;
    if (c.width !== innerWidth * dpr) { c.width = innerWidth * dpr; c.height = innerHeight * dpr; }
    const g = c.getContext("2d");
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, innerWidth, innerHeight);
    parts.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += 0.22; p.life -= 0.018; g.globalAlpha = Math.max(0, p.life); g.fillStyle = p.c; g.beginPath(); g.arc(p.x, p.y, p.r, 0, 7); g.fill(); });
    parts = parts.filter(p => p.life > 0);
    fxRaf = parts.length ? requestAnimationFrame(loop) : (g.clearRect(0, 0, innerWidth, innerHeight), null);
  }

  /* SVG plot with axes, grid and clipped drawing layer */
  let clipId = 0;
  App.plot = o => {
    const w = o.w || 560, h = o.h || 360, m = Object.assign({ l: 58, r: 18, t: 16, b: 46 }, o.m || {});
    const X = v => m.l + (v / o.xmax) * (w - m.l - m.r);
    const Y = v => h - m.b - (v / o.ymax) * (h - m.t - m.b);
    const id = "clip" + ++clipId;
    const svg = App.s("svg", { viewBox: `0 0 ${w} ${h}`, class: "plot", role: "img", "aria-label": o.label || "Diagramm" });
    svg.append(App.s("defs", {}, App.s("clipPath", { id }, App.s("rect", { x: m.l, y: m.t, width: w - m.l - m.r, height: h - m.t - m.b }))));
    const grid = App.s("g", { class: "grid" });
    (o.xticks || []).forEach(v => {
      grid.append(App.s("line", { x1: X(v), x2: X(v), y1: m.t, y2: h - m.b }));
      svg.append(App.s("text", { x: X(v), y: h - m.b + 16, "text-anchor": "middle", text: (o.xfmt || App.n0)(v) }));
    });
    (o.yticks || []).forEach(v => {
      grid.append(App.s("line", { x1: m.l, x2: w - m.r, y1: Y(v), y2: Y(v) }));
      svg.append(App.s("text", { x: m.l - 7, y: Y(v) + 4, "text-anchor": "end", text: (o.yfmt || App.n0)(v) }));
    });
    svg.prepend(grid);
    svg.append(App.s("line", { class: "axis", x1: m.l, y1: h - m.b, x2: w - m.r, y2: h - m.b }));
    svg.append(App.s("line", { class: "axis", x1: m.l, y1: m.t, x2: m.l, y2: h - m.b }));
    if (o.xlabel) svg.append(App.s("text", { class: "ttl", x: w - m.r, y: h - 8, "text-anchor": "end", text: o.xlabel }));
    if (o.ylabel) svg.append(App.s("text", { class: "ttl", x: m.l - 50, y: m.t - 4 > 8 ? m.t - 4 : 10, text: o.ylabel }));
    const back = App.s("g", { "clip-path": `url(#${id})` });
    const mid = App.s("g", { "clip-path": `url(#${id})` });
    const front = App.s("g");
    svg.append(back, mid, front);
    return { svg, X, Y, back, mid, front, w, h, m };
  };
  /* line y = f(x) sampled as two points (linear) */
  App.seg = (P, el, x1, y1, x2, y2) => App.set(el, { x1: P.X(x1), y1: P.Y(y1), x2: P.X(x2), y2: P.Y(y2) });
  App.poly = (P, el, pts) => App.set(el, { points: pts.map(p => P.X(p[0]) + "," + P.Y(p[1])).join(" ") });

  /* ── levels: shared progress, level bar and result panel ── */
  App.levels = {
    get: id => App.store.get("lv:" + id, {}),
    open: () => App.store.get("levelsOpen", false),
    unlocked(id, max) {
      if (this.open()) return max;
      const p = this.get(id); let u = 1;
      for (let i = 1; i <= max; i++) if ((p[i] || 0) >= 1) u = i + 1;
      return Math.min(max, u);
    },
    record(id, n, stars) { const p = this.get(id); if (stars > (p[n] || 0)) { p[n] = stars; App.store.set("lv:" + id, p); } },
    passed(id) { return Object.values(this.get(id)).filter(v => v >= 1).length; }
  };
  App.stars = n => "★".repeat(n) + "☆".repeat(3 - n);

  /* defs: [{name, desc}] · onPick(n) starts that level */
  App.levelBar = (id, defs, onPick) => {
    const box = App.h("div", { class: "panel stack lvbar" });
    let cur = App.store.get("lvcur:" + id, 1);
    function render() {
      const u = App.levels.unlocked(id, defs.length), p = App.levels.get(id);
      if (cur > u) cur = u;
      const btns = defs.map((d, i) => {
        const n = i + 1, locked = n > u, st = p[n] || 0;
        return App.h("button", { type: "button", class: "lvb" + (n === cur ? " on" : "") + (st ? " won" : ""), disabled: locked, "aria-pressed": n === cur, "aria-label": `Nivel ${n} ${d.name}` + (locked ? " (bloqueado)" : ""), title: d.name,
          onclick: () => { cur = n; App.store.set("lvcur:" + id, n); render(); onPick(n); } },
          App.h("span", { class: "n", text: locked ? "🔒" : n }), App.h("span", { class: "s", text: locked ? "" : App.stars(st) }));
      });
      const d = defs[cur - 1];
      box.replaceChildren(
        App.h("div", { class: "row between" },
          App.h("span", { class: "label", text: "Niveles · supera uno para abrir el siguiente" }),
          App.h("button", { class: "linkish", type: "button", text: App.levels.open() ? "Volver a bloquear niveles" : "Desbloquear todos", onclick: () => { App.store.set("levelsOpen", !App.levels.open()); render(); onPick(cur); } })),
        App.h("div", { class: "lvrow" }, btns),
        App.h("div", { class: "lvinfo" }, App.h("b", { text: `Nivel ${cur} · ${d.name}` }), App.h("span", { text: d.desc })));
    }
    render();
    return {
      el: box,
      get cur() { return cur; },
      max: defs.length,
      refresh: render,
      finish(stars) { App.levels.record(id, cur, stars); render(); },
      go(n) { cur = n; App.store.set("lvcur:" + id, n); render(); onPick(cur); }
    };
  };
  /* result block after a level: score line, stars, next / retry */
  App.levelResult = (bar, stars, title, text, retry) => {
    const passed = stars >= 1, last = bar.cur >= bar.max;
    bar.finish(stars);
    const actions = [];
    if (passed && !last) actions.push(App.h("button", { class: "btn surf", type: "button", text: `Nivel ${bar.cur + 1} →`, onclick: () => bar.go(bar.cur + 1) }));
    actions.push(App.h("button", { class: "btn " + (passed && !last ? "alt" : "surf"), type: "button", text: "Repetir nivel", onclick: retry }));
    return App.h("div", { class: "feedback " + (passed ? "ok" : "no"), style: { gridColumn: "1/-1" } },
      App.h("b", { text: `${title} · ${App.stars(stars)}` }),
      App.h("span", { text: text + (passed ? (last ? " ¡Último nivel superado!" : ` Nivel ${bar.cur + 1} desbloqueado.`) : " Aún no alcanza para pasar de nivel.") }),
      App.h("div", { class: "row", style: { marginTop: "6px" } }, actions));
  };

  /* numeric answers: "78.125", "13,2", "-3,45 %" */
  App.parseNum = str => {
    let t = String(str).trim().replace(/[€%\s]/g, "").replace(/[−–]/g, "-");
    if (!t) return NaN;
    if (t.includes(".") && t.includes(",")) t = t.replace(/\./g, "").replace(",", ".");
    else if (t.includes(",")) t = t.replace(",", ".");
    else if (/^-?\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, "");
    return parseFloat(t);
  };
  /* numeric question block; done(ok, value) is called once */
  App.numQuestion = (label, answer, tol, unit, done) => {
    const inp = App.h("input", { type: "text", inputmode: "decimal", class: "numin", autocomplete: "off", placeholder: "Tu resultado", "aria-label": label });
    let used = false;
    const go = App.h("button", { class: "btn surf", type: "button", text: "Comprobar", onclick: () => {
      if (used) return;
      const v = App.parseNum(inp.value);
      if (isNaN(v)) { inp.classList.remove("shake"); void inp.offsetWidth; inp.classList.add("shake"); return; }
      used = true; inp.disabled = go.disabled = true;
      const ok = Math.abs(v - answer) <= tol;
      inp.classList.add(ok ? "right" : "wrong");
      done(ok, v, inp);
    } });
    inp.addEventListener("keydown", e => { if (e.key === "Enter") go.click(); });
    const el = App.h("div", { class: "stack", style: { gap: "6px" } },
      App.h("span", { class: "label", text: label }),
      App.h("div", { class: "row" }, inp, unit ? App.h("span", { class: "label", text: unit }) : null, go));
    setTimeout(() => inp.focus({ preventScroll: true }), 0);
    return el;
  };
  App.fmtNum = v => (Math.abs(v - Math.round(v)) < 1e-9 ? App.n0(v) : App.n2(v));
  App.rnd = (a, b, step = 1) => a + step * Math.floor(Math.random() * (Math.floor((b - a) / step) + 1));
  App.pick = arr => arr[Math.floor(Math.random() * arr.length)];

  /* registration */
  App.register = meta => App.games.push(meta);

  /* reusable illustrations */
  App.art = {
    wave: (c1 = "var(--sea2)", c2 = "var(--sea3)") =>
      `<svg viewBox="0 0 240 96" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="240" height="96" fill="var(--sky)"/><circle cx="196" cy="26" r="13" fill="var(--sun)" opacity=".85"/><path d="M0 60c30-14 50-14 80 0s50 14 80 0 50-14 80 0v36H0z" fill="${c1}"/><path d="M0 74c30-10 50-10 80 0s50 10 80 0 50-10 80 0v22H0z" fill="${c2}"/></svg>`,
    peak: () =>
      `<svg viewBox="0 0 240 96" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="240" height="96" fill="var(--sky)"/><path d="M0 96L60 30l30 30 40-48 60 60 50-20v44z" fill="var(--rock)"/><path d="M60 30l14 15-10-2-12 8zM130 12l18 22-14-4-10 9-8-5z" fill="var(--peak)"/><path d="M0 96c60-20 140-26 240-12v12z" fill="var(--peak)"/></svg>`
  };
})();
