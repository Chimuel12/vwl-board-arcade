/* Laboratorio Pigou (Kap 8): set a per-unit tax (or subsidy) so private cost = social cost.
   MPC(Q) = m0 + m1·Q (+ m2·Q²), MEC(Q) = e0 + e1·Q + e2·Q². 9 levels incl. positive externality and Zusatzblatt 4. */
(function () {
  const { h, s } = App;
  const base = () => ({ who: "Gipfelbrett · Fábrica junto al río Inn", t: "La fábrica vende tablas al precio mundial de 400 €. Los restos de resina contaminan el río; los pescadores tienen unos externe Grenzkosten de 2 € · Q.", P: 400, m: [100, 3, 0], e: [0, 2, 0], unit: "Tsd. Boards", money: "Tsd. €", river: true });
  function randLin(withE0) {
    for (;;) {
      const P = App.rnd(300, 600, 50), m0 = App.rnd(50, 150, 10), m1 = App.pick([2, 3, 4]), e1 = App.pick([1, 2, 3]), e0 = withE0 ? App.rnd(20, 80, 10) : 0;
      if ((P - m0 - e0) / (m1 + e1) > 10) return { who: App.pick(["Wachsfabrik an der Küste", "Neopren-Werk am Fluss", "Board-Lackiererei im Tal"]), t: `Weltmarktpreis ${P} €. MPC = ${m0} + ${m1}Q. Externe Grenzkosten MEC = ${e0 ? e0 + " + " : ""}${e1}Q (Abwasser, Lärm, CO₂).`, P, m: [m0, m1, 0], e: [e0, e1, 0], unit: "Tsd. Stück", money: "Tsd. €", river: true };
    }
  }
  const LEVELS = [
    { name: "Con pista", desc: "El punto verde marca la cantidad eficiente. Busca el impuesto que lleva la producción ahí. Tolerancia ±10 €.", make: base, tol: 10, hint: true },
    { name: "Sin pista", desc: "Mismo río, sin ayuda. Tolerancia ±5 €.", make: base, tol: 5 },
    { name: "Otra fábrica", desc: "Precio y costes al azar, MEC lineal. Tolerancia ±5 €.", make: () => randLin(false), tol: 5 },
    { name: "Daño constante", desc: "Cada unidad causa el mismo daño externo. ¿Cuál es el impuesto? Tolerancia ±3 €.", tol: 3,
      make: () => { const P = App.rnd(300, 500, 50), m0 = App.rnd(50, 120, 10), m1 = App.pick([2, 3, 4]), e0 = App.rnd(40, 120, 10); return { who: "Lift-Betrieb mit Dieselgeneratoren", t: `Preis ${P} €. MPC = ${m0} + ${m1}Q. Jede Einheit verursacht konstant ${e0} € Umweltkosten.`, P, m: [m0, m1, 0], e: [e0, 0, 0], unit: "Tsd. Fahrten", money: "Tsd. €", river: false }; } },
    { name: "Externalidad positiva", desc: "Una escuela forma socorristas: protegen a todos los bañistas. Aquí hace falta una SUBVENCIÓN (impuesto negativo). Tolerancia ±5 €.", tol: 5,
      make: () => { const P = App.rnd(200, 400, 50), m0 = App.rnd(50, 100, 10), m1 = App.pick([2, 3, 4]), b = App.rnd(40, 100, 10); return { who: "Salzwasser Surf Co. · Rettungsschwimmer-Kurse", t: `Kursgebühr ${P} €. MPC = ${m0} + ${m1}Q. Jeder ausgebildete Rettungsschwimmer bringt Dritten einen externen Nutzen von ${b} €.`, P, m: [m0, m1, 0], e: [-b, 0, 0], unit: "Kurse", money: "€", river: false }; } },
    { name: "Daño mixto", desc: "MEC = e0 + e1·Q. Tolerancia ±3 €.", make: () => randLin(true), tol: 3 },
    { name: "Impuesto + DWL", desc: "Fija el impuesto y después calcula el Deadweight Loss que había SIN intervención.", make: () => randLin(true), tol: 3, follow: "dwl" },
    { name: "No lineal", desc: "Zusatzblatt 4: C(Q) = 2Q² + 2Q + 5, EC(Q) = Q³/6 + Q²/2, precio 50 €. Tolerancia ±1 €.", tol: 1,
      make: () => ({ who: "Premium-Snowboard-Manufaktur (Zusatzblatt 4)", t: "C(Q) = 2Q² + 2Q + 5 → MPC = 4Q + 2. EC(Q) = Q³/6 + Q²/2 → MEC = Q²/2 + Q. Weltmarktpreis 50 €.", P: 50, m: [2, 4, 0], e: [0, 1, 0.5], unit: "Boards", money: "€", river: true }) },
    { name: "Coase", desc: "No lineal con otro precio. Fija el impuesto y calcula cuánto tendría que pagar un filántropo para que la fábrica reduzca la producción al nivel eficiente.", tol: 0.5, follow: "coase",
      make: () => { const P = App.pick([42, 58, 66, 74]); return { who: "Premium-Snowboard-Manufaktur · neuer Weltmarktpreis", t: `C(Q) = 2Q² + 2Q + 5 → MPC = 4Q + 2. MEC = Q²/2 + Q. Weltmarktpreis ${P} €.`, P, m: [2, 4, 0], e: [0, 1, 0.5], unit: "Boards", money: "€", river: true, cost: q => 2 * q * q + 2 * q + 5 }; } }
  ];
  const poly3 = (k, q) => k[0] + k[1] * q + k[2] * q * q;
  const root = (f, lo, hi) => { if (f(lo) * f(hi) > 0) return f(lo) > 0 ? lo : hi; for (let i = 0; i < 80; i++) { const m = (lo + hi) / 2; f(lo) * f(m) <= 0 ? (hi = m) : (lo = m); } return (lo + hi) / 2; };
  const integ = (f, a, b) => { const n = 200, hstep = (b - a) / n; let s = 0; for (let i = 0; i < n; i++) s += f(a + (i + 0.5) * hstep); return s * hstep; };

  function mount(rootEl) {
    let stop = () => {};
    const left = h("div", { class: "panel stack" }), side = h("div", { class: "panel stack" });
    const bar = App.levelBar("pigou", LEVELS, () => load());

    function load() {
      stop();
      const L = LEVELS[bar.cur - 1], C = L.make();
      const mpc = q => poly3(C.m, q), mec = q => poly3(C.e, q), msc = q => mpc(q) + mec(q);
      const big = 1e4;
      const Qm = root(q => C.P - mpc(q), 0, big), Qe = root(q => C.P - msc(q), 0, big), tStar = mec(Qe);
      const qOf = t => C.P - t <= mpc(0) ? 0 : root(q => C.P - t - mpc(q), 0, big);
      const xmax = Math.max(Qm, Qe) * 1.25, ymax = Math.max(C.P * 1.5, Math.min(msc(xmax), C.P * 2.2)) * 1.05;
      const nice = v => { const p = Math.pow(10, Math.floor(Math.log10(v))) / 10; return [1, 2, 2.5, 5, 10, 20, 25, 50, 100].map(m => m * p).find(m => v / m <= 6); };
      const xs = nice(xmax), ys = nice(ymax);
      const P = App.plot({ xmax, ymax, xticks: Array.from({ length: Math.floor(xmax / xs) + 1 }, (_, k) => k * xs), yticks: Array.from({ length: Math.floor(ymax / ys) + 1 }, (_, k) => k * ys), xlabel: "Menge Q (" + C.unit + ")", ylabel: "€ pro Einheit", label: "Externe Effekte", xfmt: App.n1 });
      const sample = f => Array.from({ length: 41 }, (_, i) => [i * xmax / 40, f(i * xmax / 40)]);
      const dwl = s("polygon", { class: "area-dwl" });
      const lP = s("line", { class: "curve price" }), lPt = s("line", { class: "curve ghost" });
      const lMPC = s("polyline", { class: "curve mc" }), lMSC = s("polyline", { class: "curve msc" });
      const dot = s("circle", { class: "dot hi", r: 7 }), eff = s("circle", { class: "dot ok", r: 6, style: L.hint ? "" : "display:none" });
      const gx = s("line", { class: "guide" }), gE = s("line", { class: "guide", style: L.hint ? "stroke:var(--ok)" : "display:none" });
      const tPt = s("text", { class: "tag k" });
      P.back.append(dwl); P.mid.append(gx, gE, lP, lPt, lMPC, lMSC);
      P.front.append(eff, dot, s("text", { class: "tag g", x: P.X(xmax * 0.02), y: P.Y(C.P) - 8, text: `Preis ${App.n0(C.P)} €` }), tPt,
        // legend in the bottom-right corner, clear of the curves' crossing area
        s("g", { transform: `translate(${P.X(xmax) - 150} ${P.Y(0) - 50})` },
          s("rect", { x: -8, y: -14, width: 156, height: 44, rx: 6, fill: "var(--surface)", opacity: ".9" }),
          s("line", { x1: 0, x2: 22, y1: -2, y2: -2, class: "curve mc" }), s("text", { class: "tag s", x: 30, y: 2, text: "MPC (privat)" }),
          s("line", { x1: 0, x2: 22, y1: 18, y2: 18, class: "curve msc" }), s("text", { class: "tag b", x: 30, y: 22, text: C.e[0] < 0 ? "MSC (sozial, niedriger)" : "MSC (sozial)" })));
      App.seg(P, lP, 0, C.P, xmax, C.P);
      App.poly(P, lMPC, sample(mpc)); App.poly(P, lMSC, sample(msc));
      App.set(eff, { cx: P.X(Qe), cy: P.Y(C.P) }); App.seg(P, gE, Qe, 0, Qe, C.P);

      // river scene for pollution cases
      const scene = s("svg", { viewBox: "0 0 560 150", class: "plot", "aria-hidden": "true" });
      const water = s("rect", { x: 0, y: 70, width: 560, height: 80 }), plume = s("path", { d: "M150 78 C200 80 260 96 330 92 C400 88 470 100 560 96 L560 112 C460 116 380 104 300 112 C230 118 190 96 150 86Z", fill: "#7a5c2e" }), smoke = s("g"), fishes = [];
      for (let i = 0; i < 4; i++) smoke.append(s("circle", { cx: 99 + i * 6, cy: 2 - i * 4, r: 5 + i * 2, fill: "var(--muted)" }));
      const fishG = s("g");
      for (let i = 0; i < 10; i++) { const f = s("path", { d: "M0 0 c6 -6 14 -6 18 0 c-4 6 -12 6 -18 0z M18 0 l7 -5 v10z", fill: "var(--surface)", transform: `translate(${200 + (i % 5) * 70 + (i > 4 ? 30 : 0)} ${100 + (i > 4 ? 22 : 0)})` }); fishes.push(f); fishG.append(f); }
      scene.append(s("rect", { width: 560, height: 150, fill: "var(--sky)" }), water, smoke,
        s("g", {}, s("rect", { x: 30, y: 30, width: 90, height: 42, fill: "var(--rock)" }), s("rect", { x: 92, y: 8, width: 14, height: 26, fill: "var(--rock)" }), s("path", { d: "M30 30 l22-14 v14 l22-14 v14 l22-14 v14", fill: "var(--rock)" })),
        s("path", { d: "M120 62 h30 v14", stroke: "var(--muted)", "stroke-width": 6, fill: "none" }), plume, fishG,
        s("g", { transform: "translate(450 52)" }, s("path", { d: "M0 18h50l-8 10H8z", fill: "var(--sun)" }), s("line", { x1: 25, y1: 18, x2: 25, y2: -6, stroke: "var(--ink)", "stroke-width": 2 })));
      left.replaceChildren(C.river ? scene : h("p", { class: "hintbox", text: C.e[0] < 0 ? "Externer Nutzen: Die soziale Grenzkostenkurve liegt UNTER der privaten. Ohne Eingriff wird zu wenig angeboten." : "Konstanter externer Schaden: MSC liegt parallel über MPC." }), P.svg);

      const k = { t: h("b", { class: "num" }), q: h("b"), rev: h("b"), ext: h("b"), dwl: h("b") };
      const kpi = (l, e) => h("div", { class: "kpi" }, h("span", { class: "label", text: l }), e);
      const pos = C.e[0] < 0, step = C.P <= 100 ? 0.5 : 1;
      const tmin = pos ? -Math.round(C.P * 0.6) : 0, tmax = pos ? Math.round(C.P * 0.3) : Math.round(C.P * 0.75);
      const range = h("input", { type: "range", id: "taxRange", min: tmin, max: tmax, step, value: 0, "aria-label": "Steuer pro Einheit" });
      function update(t) {
        const q = qOf(t);
        App.seg(P, lPt, 0, C.P - t, xmax, C.P - t);
        lPt.style.display = t ? "" : "none";
        App.set(tPt, { x: P.X(xmax * 0.02), y: P.Y(C.P - t) + (t > 0 ? 16 : -8), text: t ? (t > 0 ? "Preis nach Steuer " : "Preis mit Subvention ") + App.n1(C.P - t) + " €" : "" });
        App.set(dot, { cx: P.X(q), cy: P.Y(mpc(q)) }); App.seg(P, gx, q, 0, q, mpc(q));
        const a = Math.min(q, Qe), b = Math.max(q, Qe), pts = [];
        for (let i = 0; i <= 20; i++) pts.push([a + (b - a) * i / 20, msc(a + (b - a) * i / 20)]);
        App.poly(P, dwl, [...pts, [b, C.P], [a, C.P]]);
        const dw = Math.abs(integ(x => msc(x) - C.P, Qe, q));
        k.t.textContent = (t < 0 ? "Subvención " : "") + App.n1(Math.abs(t)) + " €";
        k.q.textContent = App.n1(q); k.rev.textContent = App.n1(t * q) + " " + C.money; k.ext.textContent = App.n1(Math.abs(integ(mec, 0, q))) + " " + C.money; k.dwl.textContent = App.n1(dw) + " " + C.money;
        const dirt = Math.max(0, Math.min(1, q / Qm));
        water.setAttribute("fill", `color-mix(in srgb, #7a5c2e ${Math.round(dirt * 70)}%, var(--sea2))`);
        plume.setAttribute("opacity", (0.15 + dirt * 0.75).toFixed(2)); smoke.setAttribute("opacity", (0.2 + dirt * 0.8).toFixed(2));
        fishes.forEach((f, i) => f.style.opacity = i < Math.round(10 - dirt * 8) ? 1 : 0.08);
      }
      range.addEventListener("input", () => update(+range.value));
      const fb = h("div", { class: "stack", "aria-live": "polite" });
      const lockBtn = h("button", { class: "btn surf", type: "button", text: pos ? "Aplicar subvención" : "Aplicar impuesto", onclick: lock });
      side.replaceChildren(
        h("div", { class: "case" }, h("span", { class: "who", text: C.who }), h("p", { text: C.t })),
        h("div", { class: "range" }, h("div", { class: "row between" }, h("span", { class: "label", text: pos ? "Impuesto (negativo = subvención)" : "Impuesto por unidad" }), k.t), range),
        h("div", { class: "kpis" }, kpi("Producción", k.q), kpi(pos ? "Coste fiscal" : "Recaudación", k.rev), kpi(pos ? "Beneficio externo" : "Daño externo", k.ext), kpi("Deadweight Loss", k.dwl)),
        h("div", { class: "row" }, lockBtn), fb);
      update(0);

      function lock() {
        range.disabled = lockBtn.disabled = true;
        const t = +range.value, off = Math.abs(t - tStar);
        let stars = off <= L.tol / 3 ? 3 : off <= 2 * L.tol / 3 ? 2 : off <= L.tol ? 1 : 0;
        stop = App.tween(900, x => update(App.lerp(t, tStar, x)));
        eff.style.display = gE.style.display = "";
        if (stars) App.burst(eff, "surf");
        fb.append(h("div", { class: "feedback " + (stars ? "ok" : "no") },
          h("b", { text: `Tu ${t < 0 ? "subvención" : "impuesto"}: ${App.n1(Math.abs(t))} € · óptimo: ${tStar < 0 ? "subvención de " : ""}${App.n2(Math.abs(tStar))} €` }),
          h("span", { text: `Sin intervención: P = MPC → Q = ${App.n2(Qm)}. Eficiente: P = MSC → Q* = ${App.n2(Qe)}. La Pigou-Steuer es igual a MEC(Q*) = ${App.n2(tStar)} €${tStar < 0 ? " (negativo: subvención por el beneficio externo)" : ""}.` })));
        const finish = extraOk => {
          if (extraOk === false) stars = 0;
          App.saveScore("pigou", Math.max(0, Math.round(100 - off * 10 / L.tol)));
          fb.append(App.levelResult(bar, stars, `Nivel ${bar.cur}`, stars ? "" : extraOk === false ? "La pregunta extra tiene que estar bien." : `Necesitas quedar a ±${L.tol} € del óptimo.`, load));
        };
        if (L.follow === "dwl") {
          const d0 = integ(x => msc(x) - C.P, Qe, Qm);
          fb.append(App.numQuestion("Deadweight Loss SIN intervención", d0, Math.max(0.5, d0 * 0.01), C.money, ok => { fb.append(h("p", { class: "hintbox", text: `DWL = ½ · (Q_Markt − Q*) · (MSC(Q_Markt) − P) = ½ · (${App.n2(Qm)} − ${App.n2(Qe)}) · ${App.n2(msc(Qm) - C.P)} = ${App.n2(d0)}.` })); finish(ok); }));
        } else if (L.follow === "coase") {
          const pr = q => C.P * q - C.cost(q), pay = pr(Qm) - pr(Qe);
          fb.append(App.numQuestion("Pago mínimo del filántropo para reducir a Q*", pay, 0.5, "€", ok => { fb.append(h("p", { class: "hintbox", text: `Gewinn bei Q = ${App.n2(Qm)}: ${App.n2(pr(Qm))} €. Bei Q* = ${App.n2(Qe)}: ${App.n2(pr(Qe))} €. Entschädigung = Differenz = ${App.n2(pay)} €. Umweltkosten sinken von ${App.n2(integ(mec, 0, Qm))} auf ${App.n2(integ(mec, 0, Qe))} €.` })); finish(ok); }));
        } else finish();
      }
    }
    rootEl.append(bar.el, h("div", { class: "split" }, left, side));
    load();
    return () => stop();
  }

  App.register({
    id: "pigou", order: 6, title: "Laboratorio Pigou", levelsKey: "pigou",
    desc: "9 niveles de externalidades: del río contaminado a daños constantes, subvenciones, curvas no lineales (Zusatzblatt 4) y el pago de Coase.",
    intro: "Mueve el impuesto por unidad y observa la producción, el daño externo y el Deadweight Loss. El objetivo es que el coste privado coincida con el coste social. Desde el nivel 5 aparecen externalidades positivas (subvención) y curvas no lineales del Zusatzblatt 4.",
    chapters: ["Kap 8"], sector: ["snow", "surf"],
    art: () => `<svg viewBox="0 0 240 96" aria-hidden="true"><rect width="240" height="96" fill="var(--sky)"/><rect y="56" width="240" height="40" fill="var(--sea2)"/><rect x="20" y="24" width="56" height="34" fill="var(--rock)"/><rect x="60" y="8" width="10" height="20" fill="var(--rock)"/><path d="M76 50h18v10" stroke="var(--muted)" stroke-width="5" fill="none"/><path d="M94 62c30 2 60 10 146 6v10c-60 4-110-2-146-8z" fill="#7a5c2e" opacity=".75"/><path d="M150 82c4-4 9-4 12 0-3 4-8 4-12 0zm12 0 5-3v6z" fill="var(--surface)"/><text x="196" y="40" font-size="20" font-weight="700" fill="var(--bad)">€</text></svg>`,
    mount
  });
})();
