/* Taller doble: allocate workshop hours between surfboards and snowboards (Kap 3, komparativer Vorteil). */
(function () {
  const { h, s } = App;
  // hours per board · 40 h/week each
  const W = {
    eri: { name: "Ericeira (PT)", surf: 2, snow: 3 },
    inn: { name: "Innsbruck (AT)", surf: 8, snow: 4 }
  };
  const HRS = 40, NEED = 12.5, MAXSNOW = 15;
  const out = (w, hs) => ({ surf: hs / W[w].surf, snow: (HRS - hs) / W[w].snow });

  function mount(root) {
    let hE = 20, hI = 20, locked = false, phase = 0;
    const P = App.plot({ xmax: 26, ymax: 25, xticks: [0, 5, 10, 15, 20, 25], yticks: [0, 5, 10, 15, 20, 25], xlabel: "Surfboards / Woche", ylabel: "Snowboards / Woche", label: "Produktionsmöglichkeiten", m: { l: 50 } });
    const ppf = s("polyline", { class: "curve ppf" });
    const need = s("line", { class: "guide", style: "stroke:var(--sun);stroke-dasharray:6 4;stroke-width:2" });
    const aut = s("circle", { class: "dot", r: 6 });
    const cur = s("circle", { class: "dot hi", r: 8 });
    const tA = s("text", { class: "tag k", text: "Autarkie" }), tN = s("text", { class: "tag s", text: "mín. 12,5 Surfboards" }), tF = s("text", { class: "tag g", text: "Frontera conjunta" });
    P.back.append(need); P.mid.append(ppf); P.front.append(aut, cur, tA, tN, tF);
    // joint PPF: cheapest surfboards first (Ericeira), then Innsbruck
    App.poly(P, ppf, [[0, HRS / 3 + HRS / 4], [HRS / 2, HRS / 4], [HRS / 2 + HRS / 8, 0]]);
    App.seg(P, need, NEED, 0, NEED, 25);
    const a0 = { surf: out("eri", 20).surf + out("inn", 20).surf, snow: out("eri", 20).snow + out("inn", 20).snow };
    App.set(aut, { cx: P.X(a0.surf), cy: P.Y(a0.snow) });
    App.set(tA, { x: P.X(a0.surf) - 10, y: P.Y(a0.snow) + 20, "text-anchor": "end" });
    App.set(tN, { x: P.X(NEED) + 6, y: P.Y(24) });
    App.set(tF, { x: P.X(1), y: P.Y(HRS / 3 + HRS / 4) - 8 });

    const bar = (lab, cls) => { const i = h("i", { class: cls }), v = h("span", { class: "num" }); return { el: h("div", { class: "bar" }, h("span", { text: lab }), h("div", { class: "tr" }, i), v), i, v }; };
    const bars = { es: bar("Surf · Ericeira", "s"), is: bar("Surf · Innsbruck", "s"), ew: bar("Snow · Ericeira", "w"), iw: bar("Snow · Innsbruck", "w") };
    const tot = { surf: h("b"), snow: h("b") };
    const rE = h("input", { type: "range", id: "hoursEri", min: 0, max: HRS, step: 1, value: hE, "aria-label": "Horas de surf en Ericeira" });
    const rI = h("input", { type: "range", id: "hoursInn", min: 0, max: HRS, step: 1, value: hI, "aria-label": "Horas de surf en Innsbruck" });
    const lE = h("b", { class: "num" }), lI = h("b", { class: "num" });
    const fb = h("div", { "aria-live": "polite", class: "stack" });
    const lockBtn = h("button", { class: "btn surf", type: "button", text: "Enviar plan de producción", onclick: lock });
    let pos = { x: a0.surf, y: a0.snow }, stop = () => {};

    function update() {
      const e = out("eri", hE), i = out("inn", hI);
      const S = e.surf + i.surf, N = e.snow + i.snow;
      lE.textContent = `${hE} h surf · ${HRS - hE} h snow`; lI.textContent = `${hI} h surf · ${HRS - hI} h snow`;
      [["es", e.surf, 20], ["is", i.surf, 20], ["ew", e.snow, 15], ["iw", i.snow, 15]].forEach(([k, v, m]) => { bars[k].i.style.width = (v / m * 100) + "%"; bars[k].v.textContent = App.n1(v); });
      tot.surf.textContent = App.n1(S); tot.snow.textContent = App.n1(N);
      tot.surf.parentElement.className = "kpi " + (S >= NEED ? "good" : "bad");
      stop();
      const from = { ...pos };
      stop = App.tween(350, t => { pos = { x: App.lerp(from.x, S, t), y: App.lerp(from.y, N, t) }; App.set(cur, { cx: P.X(pos.x), cy: P.Y(pos.y) }); });
    }
    rE.addEventListener("input", () => { if (!locked) { hE = +rE.value; update(); } });
    rI.addEventListener("input", () => { if (!locked) { hI = +rI.value; update(); } });

    function lock() {
      if (locked) return; locked = true; rE.disabled = rI.disabled = lockBtn.disabled = true;
      const e = out("eri", hE), i = out("inn", hI), S = e.surf + i.surf, N = e.snow + i.snow;
      const ok = S >= NEED - 1e-9;
      const base = ok ? Math.round(N / MAXSNOW * 70) : 0;
      if (ok && N >= MAXSNOW - 1e-9) App.burst(cur, "snow");
      fb.replaceChildren(h("div", { class: "feedback " + (ok && N >= MAXSNOW - 1e-9 ? "ok" : "no") },
        h("b", { text: ok ? `${App.n1(S)} Surfboards y ${App.n1(N)} Snowboards (máximo posible: 15)` : `Solo ${App.n1(S)} Surfboards: el pedido exige 12,5` }),
        h("span", { text: "Óptimo: Innsbruck se especializa al 100 % en Snowboards (10) y Ericeira dedica 25 h a Surfboards (12,5) y 15 h a Snowboards (5). Total 12,5 + 15, frente a 12,5 + 11,7 en autarquía. La ganancia viene de los costes de oportunidad, no de quién es más rápido." })));
      const q = (text, opts, right, next) => {
        const box = h("div", { class: "stack" }, h("span", { class: "label", text }));
        const os = h("div", { class: "opts two" });
        opts.forEach((o, j) => os.append(h("button", { class: "opt", type: "button", text: o, onclick: ev => { [...os.children].forEach(b => b.disabled = true); ev.currentTarget.classList.add(j === right ? "right" : "wrong"); os.children[right].classList.add("right"); next(j === right); } })));
        box.append(os); fb.append(box);
      };
      let pts = base;
      q("¿Quién tiene ventaja ABSOLUTA en ambos productos?", ["Ericeira", "Innsbruck", "Nadie", "Cada uno en uno"], 0, a => {
        if (a) pts += 15;
        q("¿Quién tiene ventaja COMPARATIVA en Snowboards?", ["Ericeira", "Innsbruck"], 1, b => {
          if (b) pts += 15;
          const rec = App.saveScore("advantage", pts);
          fb.append(h("div", { class: "feedback " + (pts >= 85 ? "ok" : "no") },
            h("b", { text: `Puntuación ${pts}` + (rec ? " · ¡nuevo récord!" : "") }),
            h("span", { text: "Ericeira es más rápida en todo (ventaja absoluta). Pero un Snowboard le cuesta 1,5 Surfboards, y a Innsbruck solo 0,5. Por eso Innsbruck tiene la ventaja comparativa en Snowboards, igual que Carlos con las manzanas." }),
            h("div", { class: "row", style: { marginTop: "6px" } }, h("button", { class: "btn surf", type: "button", text: "Jugar otra vez", onclick: reset }))));
        });
      });
    }
    function reset() { locked = false; rE.disabled = rI.disabled = lockBtn.disabled = false; hE = hI = 20; rE.value = rI.value = 20; fb.replaceChildren(); update(); }

    const table = h("div", { class: "kpis" },
      h("div", { class: "kpi" }, h("span", { class: "label", text: "Ericeira: horas por tabla" }), h("b", { text: "Surf 2 · Snow 3", style: { fontSize: "15px" } })),
      h("div", { class: "kpi" }, h("span", { class: "label", text: "Innsbruck: horas por tabla" }), h("b", { text: "Surf 8 · Snow 4", style: { fontSize: "15px" } })));

    root.append(h("div", { class: "split" },
      h("div", { class: "panel stack" }, P.svg, h("div", { class: "bars" }, Object.values(bars).map(b => b.el))),
      h("div", { class: "panel stack" },
        h("div", { class: "case" }, h("span", { class: "who", text: "Una marca, dos talleres" }),
          h("p", { text: "Cada taller trabaja 40 h por semana. Un distribuidor pide al menos 12,5 Surfboards por semana. Reparte las horas para cumplir el pedido y fabricar el máximo de Snowboards." })),
        table,
        h("div", { class: "range" }, h("div", { class: "row between" }, h("span", { class: "label", text: "Ericeira" }), lE), rE),
        h("div", { class: "range" }, h("div", { class: "row between" }, h("span", { class: "label", text: "Innsbruck" }), lI), rI),
        h("div", { class: "kpis" }, h("div", { class: "kpi" }, h("span", { class: "label", text: "Surfboards" }), tot.surf), h("div", { class: "kpi" }, h("span", { class: "label", text: "Snowboards" }), tot.snow)),
        h("div", { class: "row" }, lockBtn), fb)));
    update();
    return () => stop();
  }

  App.register({
    id: "advantage", order: 7, title: "Taller doble",
    desc: "Un taller en Portugal y otro en los Alpes. Reparte las horas según la ventaja comparativa.",
    intro: "Reparte las horas de dos talleres entre Surfboards y Snowboards. El punto naranja se mueve sobre la frontera de posibilidades de producción conjunta.",
    chapters: ["Kap 3"], sector: ["surf", "snow"],
    art: () => `<svg viewBox="0 0 240 96" aria-hidden="true"><rect width="240" height="96" fill="var(--sky)"/><path d="M0 96L50 40l25 22 30-34 40 68z" fill="var(--rock)"/><path d="M50 40l9 10-7-2-6 5z" fill="var(--peak)"/><path d="M120 70c20-10 40-10 60 0s40 10 60 0v26H120z" fill="var(--sea2)"/><g transform="rotate(-30 150 40)"><rect x="132" y="34" width="44" height="10" rx="5" fill="var(--sun)"/></g><g transform="rotate(20 70 30)"><rect x="52" y="24" width="40" height="9" rx="4" fill="var(--snow)"/></g></svg>`,
    mount
  });
})();
