/* Pigou-Labor: set a tax on a polluting board factory until private cost = social cost (Kap 8). */
(function () {
  const { h, s } = App;
  // World price P = 400 €; MPC = 100 + 3Q; MEC = 2Q; MSC = 100 + 5Q (Q in Tsd. Boards)
  const PR = 400, mpc = q => 100 + 3 * q, msc = q => 100 + 5 * q, Qm = 100, Qe = 60, Topt = 120;
  const qOf = t => Math.max(0, (PR - t - 100) / 3);

  function mount(root) {
    let locked = false, stop = () => {};
    const P = App.plot({ xmax: 120, ymax: 800, xticks: [0, 20, 40, 60, 80, 100, 120], yticks: [0, 200, 400, 600, 800], xlabel: "Menge Q (Tsd. Boards)", ylabel: "€ pro Board", label: "Externe Effekte und Pigou-Steuer" });
    const dwl = s("polygon", { class: "area-dwl" });
    const lP = s("line", { class: "curve price" }), lPt = s("line", { class: "curve ghost" });
    const lMPC = s("line", { class: "curve mc" }), lMSC = s("line", { class: "curve msc" });
    const dot = s("circle", { class: "dot hi", r: 7 }), eff = s("circle", { class: "dot ok", r: 6 });
    const gx = s("line", { class: "guide" });
    const tg = (cls, t) => s("text", { class: "tag " + cls, text: t });
    const tP = tg("g", "Weltmarktpreis 400 €"), tPt = tg("k", ""), tMPC = tg("s", "MPC (privat)"), tMSC = tg("b", "MSC (sozial)");
    P.back.append(dwl); P.mid.append(gx, lP, lPt, lMPC, lMSC); P.front.append(eff, dot, tP, tPt, tMPC, tMSC);
    App.seg(P, lP, 0, PR, 120, PR);
    App.seg(P, lMPC, 0, mpc(0), 120, mpc(120));
    App.seg(P, lMSC, 0, msc(0), 120, msc(120));
    App.set(eff, { cx: P.X(Qe), cy: P.Y(PR) });
    App.set(tP, { x: P.X(2), y: P.Y(PR) - 8 });
    App.set(tMPC, { x: P.X(104), y: P.Y(mpc(104)) + 18 });
    App.set(tMSC, { x: P.X(118), y: P.Y(760) , "text-anchor": "end" });

    // river scene: water gets murkier with output, fish disappear
    const scene = s("svg", { viewBox: "0 0 560 150", class: "plot", "aria-hidden": "true" });
    const water = s("rect", { x: 0, y: 70, width: 560, height: 80 });
    const factory = s("g", {},
      s("rect", { x: 30, y: 30, width: 90, height: 42, fill: "var(--rock)" }),
      s("rect", { x: 92, y: 8, width: 14, height: 26, fill: "var(--rock)" }),
      s("path", { d: "M30 30 l22-14 v14 l22-14 v14 l22-14 v14", fill: "var(--rock)" }),
      s("text", { x: 75, y: 57, "text-anchor": "middle", class: "tag k", text: "Gipfelbrett" }));
    const smoke = s("g");
    for (let i = 0; i < 4; i++) smoke.append(s("circle", { cx: 99 + i * 6, cy: 2 - i * 4, r: 5 + i * 2, fill: "var(--muted)" }));
    const pipe = s("path", { d: "M120 62 h30 v14", stroke: "var(--muted)", "stroke-width": 6, fill: "none" });
    const plume = s("path", { d: "M150 78 C200 80 260 96 330 92 C400 88 470 100 560 96 L560 112 C460 116 380 104 300 112 C230 118 190 96 150 86Z", fill: "#7a5c2e" });
    const fishG = s("g");
    const fishes = [];
    for (let i = 0; i < 10; i++) {
      const f = s("path", { d: "M0 0 c6 -6 14 -6 18 0 c-4 6 -12 6 -18 0z M18 0 l7 -5 v10z", fill: "var(--surface)", transform: `translate(${200 + (i % 5) * 70 + (i > 4 ? 30 : 0)} ${100 + (i > 4 ? 22 : 0)})` });
      fishes.push(f); fishG.append(f);
    }
    const boat = s("g", { transform: "translate(450 52)" }, s("path", { d: "M0 18h50l-8 10H8z", fill: "var(--sun)" }), s("line", { x1: 25, y1: 18, x2: 25, y2: -6, stroke: "var(--ink)", "stroke-width": 2 }), s("text", { x: 25, y: -10, "text-anchor": "middle", class: "tag k", text: "Fischer" }));
    scene.append(s("rect", { width: 560, height: 150, fill: "var(--sky)" }), water, smoke, factory, pipe, plume, fishG, boat);

    const k = { t: h("b"), q: h("b"), rev: h("b"), ext: h("b"), dwl: h("b") };
    const kpi = (l, e) => h("div", { class: "kpi" }, h("span", { class: "label", text: l }), e);
    const range = h("input", { type: "range", id: "taxRange", min: 0, max: 250, step: 5, value: 0, "aria-label": "Steuer pro Board" });
    const fb = h("div", { "aria-live": "polite" });
    const lockBtn = h("button", { class: "btn surf", type: "button", text: "Aplicar impuesto", onclick: lock });

    function update(t) {
      const q = qOf(t);
      App.seg(P, lPt, 0, PR - t, 120, PR - t);
      lPt.style.display = t > 0 ? "" : "none"; tPt.style.display = t > 0 ? "" : "none";
      App.set(tPt, { x: P.X(2), y: P.Y(PR - t) + 16, text: "Preis nach Steuer " + App.n0(PR - t) + " €" });
      App.set(dot, { cx: P.X(q), cy: P.Y(mpc(q)) });
      App.seg(P, gx, q, 0, q, mpc(q));
      const tri = q >= Qe ? [[Qe, PR], [q, msc(q)], [q, PR]] : [[q, msc(q)], [q, PR], [Qe, PR]];
      App.poly(P, dwl, tri);
      const dwlV = Math.abs(0.5 * (q - Qe) * (msc(q) - PR));
      k.t.textContent = App.eur(t); k.q.textContent = App.n1(q) + " Tsd.";
      k.rev.textContent = App.n0(t * q) + " Tsd. €"; k.ext.textContent = App.n0(q * q) + " Tsd. €"; k.dwl.textContent = App.n0(dwlV) + " Tsd. €";
      // scene
      const dirt = Math.min(1, q / Qm);
      water.setAttribute("fill", `color-mix(in srgb, #7a5c2e ${Math.round(dirt * 70)}%, var(--sea2))`);
      plume.setAttribute("opacity", (0.15 + dirt * 0.75).toFixed(2));
      smoke.setAttribute("opacity", (0.2 + dirt * 0.8).toFixed(2));
      const alive = Math.round(10 - dirt * 8);
      fishes.forEach((f, i) => f.style.opacity = i < alive ? 1 : 0.08);
    }
    range.addEventListener("input", () => { if (!locked) update(+range.value); });

    function lock() {
      if (locked) return; locked = true; range.disabled = true; lockBtn.disabled = true;
      const t = +range.value, off = Math.abs(t - Topt);
      const score = Math.max(0, 100 - off);
      const rec = App.saveScore("pigou", score);
      if (off !== 0) stop = App.tween(900, x => update(App.lerp(t, Topt, x)));
      if (score >= 95) App.burst(eff, "surf");
      fb.replaceChildren(h("div", { class: "feedback " + (score >= 95 ? "ok" : "no") },
        h("b", { text: `Tu impuesto: ${App.eur(t)} · ${score} puntos` + (rec ? " · ¡nuevo récord!" : "") }),
        h("span", { text: `Sin impuesto la fábrica produce hasta P = MPC (Q = 100 Tsd.), pero lo eficiente es P = MSC (Q = 60 Tsd.). La Pigou-Steuer óptima es igual a los externe Grenzkosten en el óptimo: MEC(60) = 2 · 60 = 120 € por tabla. El precio con el impuesto (280 €) corta la MPC exactamente en Q = 60 y el Deadweight Loss desaparece.` }),
        h("div", { class: "row", style: { marginTop: "6px" } }, h("button", { class: "btn surf", type: "button", text: "Intentar otra vez", onclick: reset }))));
    }
    function reset() { stop(); locked = false; range.disabled = false; lockBtn.disabled = false; range.value = 0; update(0); fb.replaceChildren(); }

    root.append(h("div", { class: "split" },
      h("div", { class: "panel stack" }, scene, P.svg),
      h("div", { class: "panel stack" },
        h("div", { class: "case" }, h("span", { class: "who", text: "Gipfelbrett · Fábrica junto al río Inn" }),
          h("p", { text: "La fábrica vende tablas al precio mundial de 400 €. Los restos de resina contaminan el río y los pescadores pierden capturas: unos externe Grenzkosten de 2 € · Q por tabla. Eres el gobierno: ¿qué impuesto por tabla corrige el precio?" })),
        h("div", { class: "range" }, h("div", { class: "row" }, h("span", { class: "label", text: "Impuesto por tabla" }), k.t), range),
        h("div", { class: "kpis" }, kpi("Producción", k.q), kpi("Recaudación", k.rev), kpi("Daño externo", k.ext), kpi("Deadweight Loss", k.dwl)),
        h("div", { class: "row" }, lockBtn), fb)));
    update(0);
    return () => stop();
  }

  App.register({
    id: "pigou", order: 6, title: "Laboratorio Pigou",
    desc: "Una fábrica de tablas contamina el río. Ajusta el impuesto hasta que el río y el gráfico queden limpios.",
    intro: "Mueve el impuesto por tabla y observa la producción, el daño a los pescadores y el Deadweight Loss. El objetivo es que el coste privado coincida con el coste social (MSC).",
    chapters: ["Kap 8"], sector: ["snow"],
    art: () => `<svg viewBox="0 0 240 96" aria-hidden="true"><rect width="240" height="96" fill="var(--sky)"/><rect y="56" width="240" height="40" fill="var(--sea2)"/><rect x="20" y="24" width="56" height="34" fill="var(--rock)"/><rect x="60" y="8" width="10" height="20" fill="var(--rock)"/><path d="M76 50h18v10" stroke="var(--muted)" stroke-width="5" fill="none"/><path d="M94 62c30 2 60 10 146 6v10c-60 4-110-2-146-8z" fill="#7a5c2e" opacity=".75"/><path d="M150 82c4-4 9-4 12 0-3 4-8 4-12 0zm12 0 5-3v6z" fill="var(--surface)"/><text x="196" y="40" font-size="20" font-weight="700" fill="var(--bad)">€</text></svg>`,
    mount
  });
})();
