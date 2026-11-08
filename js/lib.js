/* Shared helpers: DOM builders, storage, tweening, particles and SVG plots. */
(function () {
  const App = (window.App = { games: [] });
  const SVGNS = "http://www.w3.org/2000/svg";

  function apply(e, attrs) {
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || (v === false && !k.startsWith("aria-"))) continue;
      if (k === "text") e.textContent = v;
      else if (k.startsWith("aria-")) e.setAttribute(k, String(v)); // aria-pressed="true"/"false", never ""
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

  /* ── Actualidad: daily news questions ──
     manifest: js/data/news/index.js (NEWS_DAYS.push({d, n, title}))
     one file per day: js/data/news/YYYY-MM-DD.js → NEWS_DAY("YYYY-MM-DD", [ ...questions ]) */
  App.TOPICS = { surf: "Surf", snow: "Snow", tech: "Tech" };
  App.news = { days: {} };
  App.newsDays = () => (window.NEWS_DAYS || []).slice().sort((a, b) => b.d.localeCompare(a.d));
  window.NEWS_DAY = (d, items) => {
    if (App.news.days[d]) return;
    const list = items.map((q, i) => Object.assign({}, q, { news: d, id: d + "#" + i }));
    App.news.days[d] = list;
    list.forEach(q => window.QUESTIONS.push(q)); // news questions also join the Wave Quiz levels
  };
  const newsPending = {};
  App.loadNewsDay = d => {
    if (App.news.days[d]) return Promise.resolve(App.news.days[d]);
    if (!newsPending[d]) newsPending[d] = new Promise(res => {
      const el = document.createElement("script");
      el.src = "js/data/news/" + d + ".js";
      el.onload = () => res(App.news.days[d] || []);
      el.onerror = () => res([]);
      document.head.append(el);
    });
    return newsPending[d];
  };
  App.loadRecentNews = (n = 30) => Promise.all(App.newsDays().slice(0, n).map(x => App.loadNewsDay(x.d)));
  App.fmtDay = d => /^\d{4}-\d{2}-\d{2}$/.test(d) ? new Date(d + "T12:00:00").toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" }) : d;

  /* ── concept videos (media/videos/NNN.mp4, manifest js/data/videos.js) ── */
  /* Which concept videos fit a question? Every word of the concept's term must appear in the text
     (light German stemming), acronyms like BIP/MC as whole words, formulas like "MR = MC" verbatim. */
  const STOP = new Set("der die das den dem des ein eine einer eines und oder von vom für fürs mit als wenn wer was wie im in am an auf zu zum zur statt werden wird sich nicht ist sind gegen bei warum gute that".split(" "));
  const LETTER = "A-Za-zÄÖÜäöüß";
  const flat = s => s.toLowerCase().replace(/\s+/g, "").replace(/[−–—]/g, "-").replace(/[·×]/g, "*");
  const stem = w => {
    for (const suf of ["ungen", "ung", "en", "er", "es", "e", "n", "s"]) if (w.endsWith(suf) && w.length - suf.length >= 5) return w.slice(0, -suf.length);
    return w;
  };
  function needles(str) {
    if (str.includes("=")) return [{ f: flat(str), w: str.length }];
    const out = [];
    str.replace(/[…?!:;,()&]/g, " ").split(/[\s\-–—\/']+/).forEach(tok => {
      tok = tok.replace(/\.$/, "");
      if (/^[A-ZÄÖÜ]{2,5}$/.test(tok)) out.push({ re: new RegExp(`(^|[^${LETTER}])${tok}(?![${LETTER}])`), w: 3 });
      else if (/\d/.test(tok)) out.push({ f: flat(tok), w: 2 });
      else {
        const w = tok.toLowerCase();
        if (w.length >= 4 && !STOP.has(w) && !w.startsWith("vs")) out.push({ s: stem(w), w: w.length });
      }
    });
    if (!out.length && str.trim().length >= 3) out.push({ f: flat(str), w: str.length });
    return out;
  }
  // other ways the exercises name a concept (each entry: all of its words must appear)
  const ALIAS = {
    "Positive Ökonomik": ["positive Aussage"], "Normative Ökonomik": ["normativ"],
    "Opportunitätskosten": ["entgangen"], "Budgetbeschränkung": ["Budgetgerade", "Budgetrestriktion"],
    "Pro-Kopf-BIP als Maß": ["Durchschnittseinkommen"], "Durchschnittsprodukt der Arbeit": ["Arbeitsprodukt", "APL"],
    "Kosten einer Technologie": ["Technik Lohn", "Technologie Lohn"], "Produktionstechnologie": ["technisch dominiert"],
    "Optimale Wahl": ["Optimum", "optimale Kombination"], "Opportunitätskosten der Freizeit": ["Freizeit"],
    "Substitutionseffekt": ["hypothetische Einkommen"], "Grenzrate der Substitution (GRS)": ["MRS"],
    "Sequentielles Spiel": ["beobachtet Wahl", "sequentiell"], "Pareto-Effizienz": ["pareto-effizient", "pareto-optimal"],
    "Zunehmende Skalenerträge": ["steigende Skalenerträge"], "Abnehmende Skalenerträge": ["fallende Skalenerträge", "sinkende Skalenerträge"],
    "Preiselastizität der Nachfrage": ["Preiselastizität", "Nachfrageelastizität"], "Preisaufschlag (Markup)": ["Markup", "Aufschlag"],
    "Deadweight Loss": ["Wohlfahrtsverlust", "DWL"], "Externer Effekt": ["Externalität", "Umweltkosten"],
    "Positiver externer Effekt": ["positive Externalität"], "Okun's Gesetz": ["Arbeitslosenquote"],
    "Inflationsrate berechnen": ["Inflationsrate", "Preissteigerung"], "Verbraucherpreisindex (VPI)": ["Warenkorb", "Preisindex"],
    "Wer bezahlt Zölle?": ["Zoll", "Zölle"]
  };
  let index = null;
  function videoIndex() {
    if (!index) index = (window.VIDEOS || []).map(v => {
      const main = v.term.replace(/\([^)]*\)/g, " ").trim();
      const alts = [needles(main), ...(ALIAS[v.term] || []).map(needles)];
      const acr = (v.term.match(/\(([A-ZÄÖÜ]{2,5})\)/) || [])[1];
      if (acr) alts.push(needles(acr));
      return { v, key: main.toLowerCase(), alts };
    });
    return index;
  }
  const pad3 = n => String(n).padStart(3, "0");
  App.videos = {
    all: () => window.VIDEOS || [],
    byId: id => (window.VIDEOS || []).find(v => v.id === id),
    src: v => `media/videos/${pad3(v.n)}.mp4`,
    poster: v => `media/videos/${pad3(v.n)}.jpg`,
    fmtDur: s => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`,
    seen: () => App.store.get("videosSeen", {}),
    /* videos whose concept appears in the text: same chapter first, then the most specific;
       a general concept is dropped when a more specific one containing it also matched (Gleichgewicht ⊂ Nash-Gleichgewicht) */
    related(text, limit = 2, ch) {
      const raw = String(text), low = raw.toLowerCase(), fl = flat(raw);
      const ok = nd => nd.re ? nd.re.test(raw) : nd.f ? fl.includes(nd.f) : low.includes(nd.s);
      const hits = [];
      videoIndex().forEach(x => {
        const w = Math.max(0, ...x.alts.filter(alt => alt.every(ok)).map(alt => alt.reduce((a, nd) => a + nd.w, 0)));
        if (w) hits.push({ ...x, w });
      });
      return hits.filter(a => !hits.some(b => b !== a && b.key.length > a.key.length && b.key.includes(a.key)))
        .sort((a, b) => (b.v.ch === ch) - (a.v.ch === ch) || b.w - a.w)
        .slice(0, limit).map(x => x.v);
    },
    button(v, label, list) {
      return App.h("button", { class: "vbtn", type: "button", title: "Vídeo: " + v.term, onclick: e => { e.stopPropagation(); App.videos.open(v, list); } },
        App.h("span", { class: "vplay", "aria-hidden": "true", text: "▶" }), App.h("span", { text: label || v.term }));
    },
    markSeen(v) {
      const seen = App.videos.seen();
      if (seen[v.id]) return;
      seen[v.id] = Date.now(); App.store.set("videosSeen", seen);
      App.store.set("best:videos", Object.keys(seen).length);
    },
    close: () => {},
    /* modal player; list = the videos that "previous/next" walk through (default: all, in script order) */
    open(v, list) {
      App.videos.close();
      list = list && list.length ? list : App.videos.all();
      let idx = Math.max(0, list.findIndex(x => x.n === v.n));
      const prevFocus = document.activeElement;
      const { h } = App, total = App.videos.all().length;
      const meta = h("span", { class: "label" }), title = h("b");
      const closeBtn = h("button", { class: "vclose", type: "button", "aria-label": "Cerrar vídeo", text: "✕", onclick: () => close() });
      const video = h("video", { controls: true, playsinline: true, preload: "auto" });
      const prev = h("button", { class: "btn alt", type: "button", text: "← Anterior", onclick: () => go(-1) });
      const next = h("button", { class: "btn alt", type: "button", text: "Siguiente →", onclick: () => go(1) });
      const pos = h("span", { class: "label" });
      const box = h("div", { class: "vbox", role: "dialog", "aria-modal": "true" },
        h("div", { class: "vhead" }, h("div", { class: "stack", style: { gap: "2px", minWidth: "0" } }, meta, title), closeBtn),
        video,
        list.length > 1 ? h("div", { class: "row between" }, prev, pos, next) : null);
      const modal = h("div", { class: "vmodal", onclick: e => { if (e.target === modal) close(); } }, box);
      video.addEventListener("timeupdate", () => { if (video.duration && video.currentTime / video.duration >= 0.6) App.videos.markSeen(list[idx]); });
      video.addEventListener("ended", () => { if (idx < list.length - 1) next.focus({ preventScroll: true }); });
      function show() {
        const cur = list[idx];
        box.setAttribute("aria-label", "Vídeo: " + cur.term);
        meta.textContent = `Kap. ${cur.ch} · Vídeo ${pad3(cur.n)} / ${total} · ${App.videos.fmtDur(cur.dur)}`;
        title.textContent = cur.term;
        video.poster = App.videos.poster(cur);
        video.src = App.videos.src(cur);
        video.play().catch(() => {});
        prev.disabled = idx === 0; next.disabled = idx >= list.length - 1;
        pos.textContent = `${idx + 1} / ${list.length}`;
      }
      function go(d) {
        const j = idx + d;
        if (j < 0 || j >= list.length) return;
        idx = j; show();
        if (document.activeElement && document.activeElement.disabled) (d > 0 ? prev : next).focus({ preventScroll: true });
      }
      function close() {
        video.pause(); video.removeAttribute("src"); video.load();
        modal.remove(); document.documentElement.style.overflow = "";
        document.removeEventListener("keydown", onKey, true);
        App.videos.close = () => {};
        if (prevFocus && prevFocus.isConnected && prevFocus.focus) prevFocus.focus({ preventScroll: true });
        window.dispatchEvent(new Event("videos-changed"));
      }
      function onKey(e) {
        const onVideo = e.target === video;
        if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); close(); }
        else if (e.key === "Tab") { // keep focus inside the player
          const f = [...box.querySelectorAll("button:not([disabled]), video")];
          const i = f.indexOf(document.activeElement);
          if (e.shiftKey ? i <= 0 : i === f.length - 1 || i < 0) { e.preventDefault(); f[e.shiftKey ? f.length - 1 : 0].focus(); }
        }
        else if (e.key === "ArrowRight" && !onVideo) { e.preventDefault(); go(1); }
        else if (e.key === "ArrowLeft" && !onVideo) { e.preventDefault(); go(-1); }
        else if (/^[1-9]$/.test(e.key) || e.key === "Enter" && !box.contains(e.target)) e.stopPropagation(); // keys never reach the game behind
      }
      App.videos.close = close;
      document.addEventListener("keydown", onKey, true);
      document.documentElement.style.overflow = "hidden";
      document.body.append(modal);
      show();
      closeBtn.focus({ preventScroll: true });
    }
  };

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
