/* Wave Quiz: 10 applied multiple-choice questions; a rider surfs forward on every right answer. */
(function () {
  const { h, s } = App;
  const N = 10;

  function mount(root) {
    const chs = new Set(App.store.get("quizChs", [1, 2, 3, 4, 5, 6, 7, 8, 9]));
    let qs = [], idx = 0, right = 0, streak = 0, best = 0, answered = false;
    const stage = h("div", { class: "stack" });

    // track: a long wave with a rider that moves by right answers
    const track = s("svg", { viewBox: "0 0 800 120", class: "track", "aria-hidden": "true" });
    const waveD = (() => { let d = "M0 80"; for (let x = 0; x < 800; x += 80) d += " c20 -16 40 -16 40 0 s20 16 40 0"; return d; })();
    track.append(
      s("rect", { width: 800, height: 120, rx: 14, fill: "var(--sky)" }),
      s("path", { d: waveD + " V120 H0Z", fill: "var(--sea2)" }),
      s("path", { d: waveD, fill: "none", stroke: "var(--sea1)", "stroke-width": 3 }));
    const flags = s("g");
    for (let i = 1; i <= N; i++) flags.append(s("g", { transform: `translate(${40 + i * 70} 58)` }, s("line", { y1: 0, y2: 22, stroke: "var(--muted)", "stroke-width": 1.5 }), s("path", { d: "M0 0h12l-3 4 3 4H0z", fill: "var(--line)", class: "flag" })));
    const rider = s("g", { class: "rider", transform: "translate(20 0)" },
      s("g", { class: "body" },
        s("path", { d: "M-18 76 Q0 82 22 74 L20 70 Q0 76 -16 72Z", fill: "var(--sun)" }),
        s("circle", { cx: 2, cy: 38, r: 6, fill: "var(--ink)" }),
        s("path", { d: "M2 44 L0 60 M0 60 L-8 72 M0 60 L10 71 M2 48 L-10 54 M2 48 L14 44", stroke: "var(--ink)", "stroke-width": 4, "stroke-linecap": "round", fill: "none" })));
    track.append(flags, rider);
    const scoreLine = h("div", { class: "row between label" });

    function setRider() {
      rider.setAttribute("transform", `translate(${20 + right * 70} 0)`);
      [...flags.children].forEach((f, i) => f.querySelector(".flag").setAttribute("fill", i < right ? "var(--ok)" : "var(--line)"));
      scoreLine.replaceChildren(h("span", { text: `Pregunta ${Math.min(idx + 1, qs.length)} / ${qs.length}` }), h("span", { text: `Aciertos ${right} · Racha ${streak}` }));
    }

    function start() {
      const pool = window.QUESTIONS.filter(q => chs.has(q.k));
      qs = App.shuffle(pool.slice()).slice(0, N).map(q => ({ ...q, opts: App.shuffle(q.a.map((t, i) => ({ t, ok: i === 0 }))) }));
      idx = 0; right = 0; streak = 0; best = 0;
      if (!qs.length) { stage.replaceChildren(h("div", { class: "empty", text: "Elige al menos un capítulo." })); return; }
      ask();
    }
    function ask() {
      answered = false; setRider();
      const q = qs[idx];
      const opts = h("div", { class: "opts" });
      const fb = h("div", { "aria-live": "polite" });
      q.opts.forEach((o, i) => opts.append(h("button", { class: "opt", type: "button", onclick: e => answer(i, e.currentTarget, opts, fb) }, h("span", { class: "key", text: i + 1 }), h("span", { text: o.t }))));
      stage.replaceChildren(
        h("div", { class: "case" }, h("span", { class: "who", text: "Kap " + q.k }), h("p", { text: q.q })),
        opts, fb);
    }
    function answer(i, btn, opts, fb) {
      if (answered) return; answered = true;
      const q = qs[idx], ok = q.opts[i].ok;
      [...opts.children].forEach((b, j) => { b.disabled = true; if (q.opts[j].ok) b.classList.add("right"); });
      if (ok) { right++; streak++; best = Math.max(best, streak); App.burst(btn, q.k % 2 ? "surf" : "snow"); }
      else { streak = 0; btn.classList.add("wrong"); const b = rider.querySelector(".body"); b.classList.remove("wipe"); void b.getBoundingClientRect(); b.classList.add("wipe"); }
      setRider();
      const last = idx === qs.length - 1;
      fb.replaceChildren(h("div", { class: "feedback " + (ok ? "ok" : "no") },
        h("b", { text: ok ? "Correcto" : "No exactamente" }), h("span", { text: q.x }),
        h("div", { class: "row", style: { marginTop: "6px" } }, h("button", { class: "btn surf", type: "button", id: "quizNext", text: last ? "Ver resultado" : "Siguiente", onclick: () => { idx++; last ? end() : ask(); } }))));
      document.getElementById("quizNext").focus({ preventScroll: true });
    }
    function end() {
      const score = Math.round(right / qs.length * 100);
      const rec = App.saveScore("quiz", score);
      setRider();
      stage.replaceChildren(h("div", { class: "result" },
        h("span", { class: "label", text: "Resultado" }),
        h("div", { class: "big", text: score }),
        h("p", { text: `${right} de ${qs.length} correctas · mejor racha ${best}` + (rec ? " · ¡nuevo récord!" : "") }),
        h("button", { class: "btn surf", type: "button", text: "Otra ronda", onclick: start })));
    }
    const onKey = e => {
      if (answered || !/^[1-4]$/.test(e.key)) return;
      const b = stage.querySelectorAll(".opt")[+e.key - 1]; b && b.click();
    };
    document.addEventListener("keydown", onKey);

    const chipRow = h("div", { class: "chips" });
    const renderChips = () => chipRow.replaceChildren(...[1, 2, 3, 4, 5, 6, 7, 8, 9].map(k => {
      const n = window.QUESTIONS.filter(q => q.k === k).length;
      return h("button", { class: "chip", type: "button", "aria-pressed": chs.has(k), text: `K${k} · ${n}`, onclick: () => { chs.has(k) ? chs.delete(k) : chs.add(k); App.store.set("quizChs", [...chs]); renderChips(); } });
    }));
    renderChips();

    root.append(
      h("div", { class: "panel stack" }, h("div", { class: "row between" }, h("span", { class: "label", text: "Capítulos de las preguntas" }), h("button", { class: "btn alt", type: "button", text: "Empezar de nuevo", onclick: start })), chipRow),
      h("div", { class: "panel stack" }, track, scoreLine, stage));
    start();
    return () => document.removeEventListener("keydown", onKey);
  }

  App.register({
    id: "quiz", order: 2, title: "Wave Quiz",
    desc: window.QUESTIONS.length + " casos de tiendas, escuelas y fábricas de tablas. Cada acierto te lleva más lejos en la ola.",
    intro: "Diez preguntas por ronda, todas aplicadas a empresas ficticias de surf y snowboard. Cada respuesta trae su explicación. Puedes responder con las teclas 1–4.",
    chapters: ["Kap 1–9"], sector: ["surf", "snow"], art: () => App.art.wave().replace("</svg>", `<g transform="translate(96 30)"><path d="M-14 36 Q0 41 18 34 L16 31 Q0 36 -12 33Z" fill="var(--sun)"/><circle cx="2" cy="6" r="5" fill="var(--ink)"/><path d="M2 11 L0 24 M0 24 L-7 33 M0 24 L8 32 M2 14 L-9 19 M2 14 L12 10" stroke="var(--ink)" stroke-width="3.4" stroke-linecap="round" fill="none"/></g></svg>`),
    mount
  });
})();
