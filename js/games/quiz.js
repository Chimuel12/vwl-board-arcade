/* Wave Quiz: 9 levels; 7/10 correct unlocks the next level. Questions are multiple choice ({a}) or numeric ({n, tol, u}).
   Plus free practice by chapter (#quiz/free). App.quizRunner is the shared question engine, also used by Actualidad. */
(function () {
  const { h } = App;
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
    return h("div", { class: "src" }, list.map(x => h("a", { href: x.u, target: "_blank", rel: "noopener noreferrer", text: `${x.t} · ${x.o}` + (x.d ? ` · ${App.fmtDay(x.d)}` : "") })));
  }

  /* videos of the concepts the question is about (or the chapter's videos in a new tab) */
  function videoBlock(q) {
    if (!App.videos.all().length) return null;
    const rel = App.videos.related([q.q, q.x, q.a ? q.a[0] : ""].join(" "), 2, q.k);
    const kids = rel.map(v => App.videos.button(v, `${v.term} · ${App.videos.fmtDur(v.dur)}`, rel));
    if (!rel.length && q.k) kids.push(h("a", { class: "linkish", href: `#videos/k${q.k}`, target: "_blank", rel: "noopener", text: `Vídeos Kap. ${q.k} ↗` }));
    return h("div", { class: "vrel" }, kids);
  }

  /* ── shared runner ── view: container it renders into.
     run(pool, { count, need, subtitle, backLabel, onBack, sortByLevel, onEnd({right,total,pct,bestStreak}) → {label,msg,actions,burst} }) */
  App.quizRunner = function (view) {
    let qs = [], idx = 0, right = 0, streak = 0, bestStreak = 0, answered = false, o = {}, res = [];
    const segs = h("div", { class: "qprog", "aria-hidden": "true" });
    const scoreLine = h("div", { class: "row between label" });
    const stage = h("div", { class: "stack" });

    function setRider() {
      [...segs.children].forEach((el, i) => { el.className = i < res.length ? (res[i] ? "ok" : "no") : i === idx ? "cur" : ""; });
      scoreLine.replaceChildren(
        h("span", { text: `${Math.min(idx + 1, qs.length)} / ${qs.length}` }),
        h("span", { text: `${right} ✓` + (o.need ? ` · mín. ${o.need}` : "") + (streak > 1 ? ` · racha ${streak}` : "") }));
    }
    function run(pool, opts) {
      o = opts || {};
      qs = App.shuffle(pool.slice()).slice(0, o.count || 10).map(q => q.a ? { ...q, opts: App.shuffle(q.a.map((t, i) => ({ t, ok: i === 0 }))) } : { ...q });
      if (o.sortByLevel) qs.sort((a, b) => lvlOf(a) - lvlOf(b));
      idx = 0; right = 0; streak = 0; bestStreak = 0; res = [];
      segs.replaceChildren(...qs.map(() => h("i")));
      view.replaceChildren(
        h("div", { class: "row between" },
          h("button", { class: "btn alt", type: "button", text: o.backLabel || "← Volver", onclick: () => o.onBack && o.onBack() }),
          o.subtitle ? h("span", { class: "label", text: o.subtitle }) : null),
        h("div", { class: "panel stack" }, segs, scoreLine, stage));
      if (!qs.length) { stage.replaceChildren(h("div", { class: "empty", text: "—" })); return; }
      ask();
    }
    function ask() {
      answered = false; setRider();
      const q = qs[idx];
      const fb = h("div", { "aria-live": "polite" });
      const who = `Kap ${q.k} · Nivel ${lvlOf(q)}` + (q.news ? ` · ${App.TOPICS[q.t] || ""} · ${App.fmtDay(q.news)}` : "");
      const head = h("div", { class: "case" }, h("span", { class: "who", text: who }), h("p", { text: q.q }));
      if (q.a) {
        const opts = h("div", { class: "opts" });
        q.opts.forEach((op, i) => opts.append(h("button", { class: "opt", type: "button", onclick: e => answerMC(i, e.currentTarget, opts, fb) }, h("span", { class: "key", text: i + 1 }), h("span", { text: op.t }))));
        stage.replaceChildren(head, opts, fb);
      } else {
        const inp = h("input", { type: "text", inputmode: "decimal", id: "numAnswer", class: "numin", autocomplete: "off", placeholder: "Tu resultado", "aria-label": "Respuesta numérica" + (q.u ? " en " + q.u : "") });
        const go = h("button", { class: "btn surf", type: "button", text: "Comprobar", onclick: () => answerNum(inp, go, fb) });
        inp.addEventListener("keydown", e => { if (e.key === "Enter") go.click(); });
        stage.replaceChildren(head, h("div", { class: "row" }, inp, q.u ? h("span", { class: "label", text: q.u }) : null, go), fb);
        inp.focus({ preventScroll: true });
      }
    }
    function result(ok, el, fb, q, extra) {
      res.push(ok);
      if (ok) { right++; streak++; bestStreak = Math.max(bestStreak, streak); App.burst(el, q.t === "snow" || (!q.t && q.k % 2 === 0) ? "snow" : "surf"); }
      else streak = 0;
      setRider();
      const last = idx === qs.length - 1;
      fb.replaceChildren(h("div", { class: "feedback " + (ok ? "ok" : "no") },
        h("b", { text: ok ? "Correcto" : "No exactamente" + (extra || "") }), h("span", { text: q.x }), srcBlock(q), videoBlock(q),
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
        h("p", { text: `${right} de ${qs.length} · racha ${bestStreak}` + (r.msg ? " · " + r.msg : "") }),
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

  // one row per level: number, name, questions, stars
  function levelList(onPick) {
    const prog = getProg(), open = unlockedUpTo();
    return h("div", { class: "lvlist" }, window.LEVELS.map(L => {
      const locked = L.n > open, r = prog[L.n] || {};
      const n = window.QUESTIONS.filter(q => lvlOf(q) === L.n).length;
      const color = L.n <= 3 ? "var(--surf)" : L.n <= 6 ? "var(--sun)" : "var(--snow)";
      return h("button", { class: "lvcard" + (locked ? " locked" : ""), type: "button", disabled: locked, onclick: () => onPick(L.n), "aria-label": `Nivel ${L.n} ${L.name}` + (locked ? " (bloqueado)" : "") },
        h("span", { class: "ic", style: locked ? null : `--c:${color}`, html: locked ? App.icon("lock", 18) : String(L.n) }),
        h("span", { class: "tx" }, h("b", { text: L.name }), h("span", { text: `${n} preguntas` + (r.best != null ? ` · ${r.best}/10` : "") })),
        locked ? null : h("span", { class: "st", text: App.stars(r.stars || 0) }));
    }));
  }

  function mount(root, arg) {
    const chs = new Set(App.store.get("quizChs", [1, 2, 3, 4, 5, 6, 7, 8, 9]));
    const view = h("div", { class: "stack" });
    const R = App.quizRunner(view);

    function startLevel(n) {
      const L = window.LEVELS[n - 1];
      R.run(window.QUESTIONS.filter(q => lvlOf(q) === n), {
        count: 10, need: PASS, subtitle: `Nivel ${n} · ${L.name}`, backLabel: "← Niveles", onBack: showMap,
        onEnd: ({ right }) => {
          const prog = getProg(), prev = prog[n] || {}, st = starsFor(right);
          prog[n] = { best: Math.max(prev.best || 0, right), stars: Math.max(prev.stars || 0, st) };
          App.store.set("levels", prog);
          App.saveScore("quizLevels", Object.values(prog).filter(r => r.best >= PASS).length);
          const actions = [];
          if (right >= PASS && n < 9) actions.push(h("button", { class: "btn surf", type: "button", text: `Nivel ${n + 1} →`, onclick: () => startLevel(n + 1) }));
          actions.push(h("button", { class: "btn alt", type: "button", text: "Repetir", onclick: () => startLevel(n) }));
          actions.push(h("button", { class: "btn alt", type: "button", text: "Niveles", onclick: showMap }));
          return { label: `Nivel ${n}`, msg: right >= PASS ? "★".repeat(st) : `mín. ${PASS}`, actions, burst: right >= PASS ? (n > 6 ? "snow" : "surf") : null };
        }
      });
    }
    function startFree() {
      R.run(window.QUESTIONS.filter(q => chs.has(q.k) && lvlOf(q) <= unlockedUpTo()), {
        count: 10, subtitle: "Práctica libre", backLabel: "← Niveles", onBack: showMap,
        onEnd: () => ({ label: "Práctica libre", actions: [h("button", { class: "btn surf", type: "button", text: "Otra ronda", onclick: startFree }), h("button", { class: "btn alt", type: "button", text: "Niveles", onclick: showMap })] })
      });
    }
    function showMap() {
      const open = App.store.get("levelsOpen", false);
      const chipRow = h("div", { class: "chips" });
      const renderChips = () => chipRow.replaceChildren(...[1, 2, 3, 4, 5, 6, 7, 8, 9].map(k =>
        h("button", { class: "chip", type: "button", "aria-pressed": chs.has(k), text: "K" + k, onclick: () => { chs.has(k) ? chs.delete(k) : chs.add(k); App.store.set("quizChs", [...chs]); renderChips(); } })));
      renderChips();
      view.replaceChildren(
        h("section", { class: "panel list", "aria-label": "Niveles" },
          h("div", { class: "lh" }, h("h2", { text: "Niveles" }),
            h("button", { type: "button", "aria-pressed": open, text: open ? "Bloquear" : "Abrir todos", title: open ? "Volver a bloquear niveles" : "Desbloquear todos los niveles", onclick: () => { App.store.set("levelsOpen", !open); showMap(); } })),
          levelList(startLevel)),
        h("section", { class: "panel stack", "aria-label": "Práctica libre" },
          h("div", { class: "row between" }, h("h2", { text: "Práctica libre" }), h("button", { class: "btn surf", type: "button", text: "Empezar", onclick: startFree })),
          chipRow));
    }

    root.append(view);
    arg === "free" ? startFree() : showMap();
    return () => R.destroy();
  }

  App.register({ id: "quiz", order: 2, title: "Wave Quiz", chapters: ["Kap 1–9"], mount });
})();
