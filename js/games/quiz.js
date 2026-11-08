/* Wave Quiz: 9 levels from the beach to the summit. 7/10 correct unlocks the next level.
   Questions are multiple choice ({a}) or numeric input ({n, tol, u}). Plus a free-practice mode by chapter.
   App.quizRunner is the shared question engine, also used by the Actualidad game. */
(function () {
  const { h, s } = App;
  const PASS = 7;
  const lvlOf = q => q.l || 1;

  // progress: { [level]: { best, stars } }
  const getProg = () => App.store.get("levels", {});
  const starsFor = r => (r >= 10 ? 3 : r >= 9 ? 2 : r >= PASS ? 1 : 0);
  const unlockedUpTo = () => {
    if (App.store.get("levelsOpen", false)) return 9;
    const p = getProg(); let u = 1;
    for (let i = 1; i <= 9; i++) if (p[i] && p[i].best >= PASS) u = i + 1;
    return Math.min(9, u);
  };
  const fmtAns = q => (Number.isInteger(q.n) ? App.n0(q.n) : String(q.n).replace(".", ",")) + (q.u ? " " + q.u : "");

  function srcBlock(q) {
    const list = q.src ? [].concat(q.src) : [];
    if (!list.length) return null;
    return h("div", { class: "src" }, h("span", { class: "label", text: list.length > 1 ? "Fuentes" : "Fuente" }),
      list.map(x => h("a", { href: x.u, target: "_blank", rel: "noopener noreferrer", text: `${x.t} · ${x.o}` + (x.d ? ` · ${App.fmtDay(x.d)}` : "") })));
  }

  /* ── shared runner ── view: container it renders into.
     run(pool, { count, tag, need, subtitle, backLabel, onBack, sortByLevel, onEnd({right,total,pct,bestStreak}) → {label,msg,actions,burst} }) */
  App.quizRunner = function (view) {
    let qs = [], idx = 0, right = 0, streak = 0, bestStreak = 0, answered = false, o = {};
    const track = s("svg", { viewBox: "0 0 800 120", class: "track", "aria-hidden": "true" });
    const waveD = (() => { let d = "M0 80"; for (let x = 0; x < 800; x += 80) d += " c20 -16 40 -16 40 0 s20 16 40 0"; return d; })();
    track.append(s("rect", { width: 800, height: 120, rx: 14, fill: "var(--sky)" }), s("path", { d: waveD + " V120 H0Z", fill: "var(--sea2)" }), s("path", { d: waveD, fill: "none", stroke: "var(--sea1)", "stroke-width": 3 }));
    const flags = s("g");
    const rider = s("g", { class: "rider", transform: "translate(20 0)" }, s("g", { class: "body" },
      s("path", { d: "M-18 76 Q0 82 22 74 L20 70 Q0 76 -16 72Z", fill: "var(--sun)" }), s("circle", { cx: 2, cy: 38, r: 6, fill: "var(--ink)" }),
      s("path", { d: "M2 44 L0 60 M0 60 L-8 72 M0 60 L10 71 M2 48 L-10 54 M2 48 L14 44", stroke: "var(--ink)", "stroke-width": 4, "stroke-linecap": "round", fill: "none" })));
    track.append(flags, rider);
    const scoreLine = h("div", { class: "row between label" });
    const stage = h("div", { class: "stack" });
    const stepX = () => 700 / Math.max(1, qs.length);

    function setRider() {
      rider.setAttribute("transform", `translate(${20 + right * stepX()} 0)`);
      [...flags.children].forEach((f, i) => f.querySelector(".flag").setAttribute("fill", i < right ? "var(--ok)" : "var(--line)"));
      scoreLine.replaceChildren(
        h("span", { text: `${o.tag || "Práctica"} · Pregunta ${Math.min(idx + 1, qs.length)} / ${qs.length}` }),
        h("span", { text: `Aciertos ${right} · Racha ${streak}` + (o.need ? ` · necesitas ${o.need}` : "") }));
    }
    function run(pool, opts) {
      o = opts || {};
      qs = App.shuffle(pool.slice()).slice(0, o.count || 10).map(q => q.a ? { ...q, opts: App.shuffle(q.a.map((t, i) => ({ t, ok: i === 0 }))) } : { ...q });
      if (o.sortByLevel) qs.sort((a, b) => lvlOf(a) - lvlOf(b));
      idx = 0; right = 0; streak = 0; bestStreak = 0;
      flags.replaceChildren();
      for (let i = 1; i <= qs.length; i++) flags.append(s("g", { transform: `translate(${40 + i * stepX()} 58)` }, s("line", { y1: 0, y2: 22, stroke: "var(--muted)", "stroke-width": 1.5 }), s("path", { d: "M0 0h12l-3 4 3 4H0z", fill: "var(--line)", class: "flag" })));
      view.replaceChildren(
        h("div", { class: "row between" },
          h("button", { class: "btn alt", type: "button", text: o.backLabel || "← Volver", onclick: () => o.onBack && o.onBack() }),
          o.subtitle ? h("span", { class: "label", text: o.subtitle }) : null),
        h("div", { class: "panel stack" }, track, scoreLine, stage));
      if (!qs.length) { stage.replaceChildren(h("div", { class: "empty", text: "No hay preguntas para esta selección." })); return; }
      ask();
    }
    function ask() {
      answered = false; setRider();
      const q = qs[idx];
      const fb = h("div", { "aria-live": "polite" });
      const who = `Kap ${q.k} · Nivel ${lvlOf(q)}` + (q.news ? ` · Actualidad ${App.fmtDay(q.news)} · ${App.TOPICS[q.t] || ""}` : "") + (q.n != null ? " · respuesta numérica" : "");
      const head = h("div", { class: "case" }, h("span", { class: "who", text: who }), h("p", { text: q.q }));
      if (q.a) {
        const opts = h("div", { class: "opts" });
        q.opts.forEach((op, i) => opts.append(h("button", { class: "opt", type: "button", onclick: e => answerMC(i, e.currentTarget, opts, fb) }, h("span", { class: "key", text: i + 1 }), h("span", { text: op.t }))));
        stage.replaceChildren(head, opts, fb);
      } else {
        const inp = h("input", { type: "text", inputmode: "decimal", id: "numAnswer", class: "numin", autocomplete: "off", placeholder: "Tu resultado" + (q.u ? " (" + q.u + ")" : ""), "aria-label": "Respuesta numérica" });
        const go = h("button", { class: "btn surf", type: "button", text: "Comprobar", onclick: () => answerNum(inp, go, fb) });
        inp.addEventListener("keydown", e => { if (e.key === "Enter") go.click(); });
        stage.replaceChildren(head, h("div", { class: "row" }, inp, q.u ? h("span", { class: "label", text: q.u }) : null, go), h("span", { class: "label", text: "Decimales con coma o punto · se acepta un pequeño redondeo" }), fb);
        inp.focus({ preventScroll: true });
      }
    }
    function result(ok, el, fb, q, extra) {
      if (ok) { right++; streak++; bestStreak = Math.max(bestStreak, streak); App.burst(el, q.t === "snow" || (!q.t && q.k % 2 === 0) ? "snow" : "surf"); }
      else { streak = 0; const b = rider.querySelector(".body"); b.classList.remove("wipe"); void b.getBoundingClientRect(); b.classList.add("wipe"); }
      setRider();
      const last = idx === qs.length - 1;
      fb.replaceChildren(h("div", { class: "feedback " + (ok ? "ok" : "no") },
        h("b", { text: ok ? "Correcto" : "No exactamente" + (extra || "") }), h("span", { text: q.x }), srcBlock(q),
        h("div", { class: "row", style: { marginTop: "6px" } }, h("button", { class: "btn surf", type: "button", id: "quizNext", text: last ? "Ver resultado" : "Siguiente", onclick: () => { idx++; last ? end() : ask(); } }))));
      document.getElementById("quizNext").focus({ preventScroll: true });
    }
    function answerMC(i, btn, opts, fb) {
      if (answered) return; answered = true;
      const q = qs[idx], ok = q.opts[i].ok;
      [...opts.children].forEach((b, j) => { b.disabled = true; if (q.opts[j].ok) b.classList.add("right"); });
      if (!ok) btn.classList.add("wrong");
      result(ok, btn, fb, q);
    }
    function answerNum(inp, go, fb) {
      if (answered) return;
      const v = App.parseNum(inp.value);
      if (isNaN(v)) { inp.classList.remove("shake"); void inp.offsetWidth; inp.classList.add("shake"); return; }
      answered = true; inp.disabled = true; go.disabled = true;
      const q = qs[idx], ok = Math.abs(v - q.n) <= (q.tol || 0.001);
      inp.classList.add(ok ? "right" : "wrong");
      result(ok, inp, fb, q, ` · correcto: ${fmtAns(q)}`);
    }
    function end() {
      const pct = Math.round(right / qs.length * 100);
      const r = (o.onEnd && o.onEnd({ right, total: qs.length, pct, bestStreak })) || {};
      stage.replaceChildren(h("div", { class: "result" },
        h("span", { class: "label", text: r.label || "Resultado" }),
        h("div", { class: "big", text: pct }),
        h("p", { text: `${right} de ${qs.length} correctas · mejor racha ${bestStreak}` + (r.msg ? " · " + r.msg : "") }),
        h("div", { class: "row" }, r.actions || [])));
      setRider();
      if (r.burst) App.burst(stage.querySelector(".big"), r.burst, 40);
    }
    const onKey = e => {
      if (answered || !stage.isConnected || !/^[1-5]$/.test(e.key) || document.activeElement?.tagName === "INPUT") return;
      const b = stage.querySelectorAll(".opt")[+e.key - 1]; b && b.click();
    };
    document.addEventListener("keydown", onKey);
    return { run, destroy: () => document.removeEventListener("keydown", onKey) };
  };

  function levelMap(onPick) {
    const prog = getProg(), open = unlockedUpTo();
    // scene: beach (1–3) → reef/forest (4–6) → slopes and summit (7–9)
    const pts = [[70, 250], [150, 232], [230, 246], [310, 210], [385, 175], [455, 190], [530, 140], [610, 96], [700, 46]];
    const svg = s("svg", { viewBox: "0 0 780 300", class: "plot", role: "group", "aria-label": "Mapa de niveles" });
    svg.innerHTML = `
      <rect width="780" height="300" rx="16" fill="var(--sky)"/>
      <circle cx="90" cy="70" r="30" fill="var(--sun)" opacity=".85"/>
      <path d="M330 300 L480 120 L560 190 L700 20 L800 140 L800 300Z" fill="var(--rock)"/>
      <path d="M700 20 L728 58 L708 52 L694 66 L676 50Z M480 120 L500 146 L484 142 L470 152 L462 140Z" fill="var(--peak)"/>
      <path d="M440 300 C520 230 640 170 800 150 V300Z" fill="var(--peak)" opacity=".9"/>
      <path d="M0 262 c40-16 80-16 120 0 s80 16 120 0 80-16 120 0 V300 H0Z" fill="var(--sea2)"/>
      <path d="M0 278 c40-12 80-12 120 0 s80 12 120 0 80-12 120 0 V300 H0Z" fill="var(--sea3)"/>`;
    svg.append(s("polyline", { points: pts.map(p => p.join(",")).join(" "), fill: "none", stroke: "var(--ink)", "stroke-width": 2.5, "stroke-dasharray": "2 7", "stroke-linecap": "round", opacity: ".55" }));
    window.LEVELS.forEach((L, i) => {
      const [x, y] = pts[i], locked = L.n > open, st = (prog[L.n] || {}).stars || 0;
      const g = s("g", { transform: `translate(${x} ${y})`, class: "lvnode", tabindex: locked ? -1 : 0, role: "button", "aria-label": `Nivel ${L.n} ${L.name}${locked ? " (bloqueado)" : ""}`, style: locked ? "cursor:not-allowed" : "cursor:pointer" });
      g.append(
        s("circle", { r: 21, fill: locked ? "var(--line)" : (st ? "var(--ok)" : (L.n <= 3 ? "var(--surf)" : L.n <= 6 ? "var(--sun)" : "var(--snow)")), stroke: "var(--surface)", "stroke-width": 4 }),
        s("text", { y: 6, "text-anchor": "middle", class: "lvnum" + (locked ? " lk" : ""), text: locked ? "🔒" : L.n }),
        s("text", { y: 40, "text-anchor": "middle", class: "lvst", text: locked ? "" : "★".repeat(st) + "☆".repeat(3 - st) }));
      if (!locked) {
        g.addEventListener("click", () => onPick(L.n));
        g.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onPick(L.n); } });
      }
      svg.append(g);
    });
    const [rx, ry] = pts[open - 1];
    svg.append(s("g", { transform: `translate(${rx - 34} ${ry - 44})`, "aria-hidden": "true" },
      s("path", { d: "M-10 30 Q2 34 18 28 L16 25 Q2 30 -8 27Z", fill: "var(--sun)" }),
      s("circle", { cx: 3, cy: 4, r: 5, fill: "var(--ink)" }),
      s("path", { d: "M3 9 L1 20 M1 20 L-5 27 M1 20 L8 26 M3 12 L-6 16 M3 12 L11 8", stroke: "var(--ink)", "stroke-width": 3.2, "stroke-linecap": "round", fill: "none" })));

    const cards = h("div", { class: "lvgrid" }, window.LEVELS.map(L => {
      const locked = L.n > open, r = prog[L.n] || {};
      const pool = window.QUESTIONS.filter(q => lvlOf(q) === L.n), fresh = pool.filter(q => q.news).length;
      return h("button", { class: "lvcard" + (locked ? " locked" : ""), type: "button", disabled: locked, onclick: () => onPick(L.n) },
        h("div", { class: "row between" }, h("span", { class: "label", text: `Nivel ${L.n} · ${L.tag}` }), h("span", { class: "st", text: locked ? "🔒" : App.stars(r.stars || 0) })),
        h("b", { text: L.name }),
        h("span", { class: "sub", text: L.sub }),
        h("span", { class: "label", text: `${pool.length} preguntas` + (fresh ? ` · ${fresh} de actualidad` : "") + (r.best != null ? ` · mejor ${r.best}/10` : "") }));
    }));
    return { svg, cards };
  }

  function mount(root) {
    const chs = new Set(App.store.get("quizChs", [1, 2, 3, 4, 5, 6, 7, 8, 9]));
    const view = h("div", { class: "stack" });
    const R = App.quizRunner(view);

    function startLevel(n) {
      const L = window.LEVELS[n - 1];
      R.run(window.QUESTIONS.filter(q => lvlOf(q) === n), {
        count: 10, tag: `Nivel ${n}`, need: PASS, subtitle: `${L.name} · ${L.sub}`, backLabel: "← Mapa de niveles", onBack: showMap,
        onEnd: ({ right }) => {
          const prog = getProg(), prev = prog[n] || {}, st = starsFor(right);
          prog[n] = { best: Math.max(prev.best || 0, right), stars: Math.max(prev.stars || 0, st) };
          App.store.set("levels", prog);
          App.saveScore("quizLevels", Object.values(prog).filter(r => r.best >= PASS).length);
          const actions = [];
          let msg;
          if (right >= PASS) {
            msg = `${"★".repeat(st)} ` + (n < 9 ? `¡Nivel ${n + 1} desbloqueado!` : "¡Has llegado a la cumbre!");
            if (n < 9) actions.push(h("button", { class: "btn surf", type: "button", text: `Ir al nivel ${n + 1}`, onclick: () => startLevel(n + 1) }));
          } else msg = `necesitas ${PASS} para pasar de nivel`;
          actions.push(h("button", { class: "btn alt", type: "button", text: "Repetir nivel", onclick: () => startLevel(n) }));
          actions.push(h("button", { class: "btn alt", type: "button", text: "Mapa", onclick: showMap }));
          return { label: `Nivel ${n} · resultado`, msg, actions, burst: right >= PASS ? (n > 6 ? "snow" : "surf") : null };
        }
      });
    }
    function startFree() {
      R.run(window.QUESTIONS.filter(q => chs.has(q.k) && lvlOf(q) <= unlockedUpTo()), {
        count: 10, tag: "Práctica", backLabel: "← Mapa de niveles", onBack: showMap,
        onEnd: () => ({ label: "Práctica libre · resultado", actions: [h("button", { class: "btn surf", type: "button", text: "Otra ronda", onclick: startFree }), h("button", { class: "btn alt", type: "button", text: "Mapa", onclick: showMap })] })
      });
    }
    function showMap() {
      const { svg, cards } = levelMap(startLevel);
      const open = App.store.get("levelsOpen", false);
      const chipRow = h("div", { class: "chips" });
      const renderChips = () => chipRow.replaceChildren(...[1, 2, 3, 4, 5, 6, 7, 8, 9].map(k =>
        h("button", { class: "chip", type: "button", "aria-pressed": chs.has(k), text: "K" + k, onclick: () => { chs.has(k) ? chs.delete(k) : chs.add(k); App.store.set("quizChs", [...chs]); renderChips(); } })));
      renderChips();
      view.replaceChildren(
        h("div", { class: "panel stack" },
          h("div", { class: "row between" },
            h("span", { class: "label", text: `Pasa un nivel con ${PASS}/10 · ★ 7–8 · ★★ 9 · ★★★ 10` }),
            h("button", { class: "linkish", type: "button", text: open ? "Volver a bloquear niveles" : "Desbloquear todos (repaso de examen)", onclick: () => { App.store.set("levelsOpen", !open); showMap(); } })),
          svg),
        cards,
        h("div", { class: "panel stack" },
          h("div", { class: "row between" }, h("h3", { text: "Práctica libre por capítulo" }), h("button", { class: "btn alt", type: "button", text: "Empezar práctica", onclick: startFree })),
          h("p", { style: { color: "var(--muted)" }, text: "Mezcla preguntas de los niveles que ya tienes desbloqueados, solo de los capítulos elegidos. Incluye las preguntas de actualidad." }),
          chipRow));
    }

    root.append(view);
    showMap();
    return () => R.destroy();
  }

  App.register({
    id: "quiz", order: 2, title: "Wave Quiz · 9 niveles",
    desc: window.QUESTIONS.length + " preguntas de la playa a la cumbre, basadas en las Übungen y la Altklausur, más las de actualidad. Supera cada nivel para desbloquear el siguiente.",
    intro: "Nueve niveles cada vez más difíciles: del vocabulario aplicado al surf hasta cálculos de nivel de examen (Übungsblätter 1–6, Zusatzblätter 1–4, Altklausur). Las preguntas de actualidad de los últimos 30 días se mezclan en cada nivel. Saca 7 de 10 para desbloquear el siguiente.",
    chapters: ["Kap 1–9"], sector: ["surf", "snow"],
    bestKey: "quizLevels",
    bestLabel: v => `niveles <b>${v}/9</b>`,
    art: () => App.art.peak().replace("</svg>", `<g font-family="Unbounded, sans-serif" font-weight="700" font-size="11" fill="#fff"><circle cx="40" cy="80" r="10" fill="var(--surf)"/><text x="40" y="84" text-anchor="middle">1</text><circle cx="110" cy="56" r="10" fill="var(--sun)"/><text x="110" y="60" text-anchor="middle">5</text><circle cx="180" cy="26" r="10" fill="var(--snow)"/><text x="180" y="30" text-anchor="middle">9</text></g><path d="M50 76 L100 60 M120 52 L170 30" stroke="var(--ink)" stroke-width="2" stroke-dasharray="2 5" stroke-linecap="round"/></svg>`),
    mount
  });
})();
