/* Preis-Setter (Kap 6): pick the profit-maximising price as a firm with market power.
   Demand P = a − bQ, cost C(Q) = F + cQ + dQ² (MC = c + 2dQ). 9 levels: hints → random markets → rising MC → exam follow-ups. */
(function () {
  const { h, s } = App;
  const A = { who: "Gipfelbrett · Allround-Snowboard", t: "Dein Allround-Board hat viele Konkurrenten. Grenzkosten 300 € pro Board, Fixkosten 6.000 € pro Monat.", a: 900, b: 6, c: 300, d: 0, F: 6000, unit: "Boards/Monat", sector: "snow" };
  const B = { who: "Gipfelbrett · Pro-Modell Limited", t: "Signature-Board eines Freeride-Profis. Treue Fans, kaum Ersatz. Grenzkosten 400 €, Fixkosten 4.000 €.", a: 1500, b: 20, c: 400, d: 0, F: 4000, unit: "Boards/Monat", sector: "snow" };
  const Cc = { who: "Salzwasser Surf Co. · Board-Verleih", t: "Tagesmiete für Softboards am Strand, viele Verleiher in der Nähe. Grenzkosten 20 €, Fixkosten 500 € pro Tag.", a: 60, b: 0.2, c: 20, d: 0, F: 500, unit: "Mieten/Tag", sector: "surf" };
  const U5 = { who: "Einziger Splitboard-Hersteller (Übungsblatt 5)", t: "Marktnachfrage P(Q) = 100 − 2Q, Kosten C(Q) = 50 + 4Q + Q².", a: 100, b: 2, c: 4, d: 1, F: 50, unit: "Splitboards", sector: "snow" };

  function randConst() {
    const a = App.rnd(400, 1200, 100), b = App.pick([2, 4, 5, 8, 10]), c = Math.round(a * App.pick([0.2, 0.3, 0.4, 0.5]) / 10) * 10;
    const F = Math.round(0.3 * (a - c) ** 2 / (4 * b) / 100) * 100;
    const who = App.pick(["Neue Marke · Carbon-Surfboard", "Gipfelbrett · Kinder-Snowboard", "Salzwasser · Wetsuit-Linie", "Alpenlift · Nachtski-Ticket"]);
    return { who, t: `Nachfrage P = ${a} − ${b}Q. Konstante Grenzkosten ${c} €, Fixkosten ${App.n0(F)} €.`, a, b, c, d: 0, F, unit: "Stück", sector: who.includes("Surf") || who.includes("Wetsuit") ? "surf" : "snow" };
  }
  function randQuad() {
    for (;;) {
      const a = App.rnd(150, 400, 10), b = App.pick([1, 2, 3]), c = App.rnd(5, 40, 5), d = App.pick([0.5, 1, 2]);
      const Q = (a - c) / (2 * b + 2 * d), P = a - b * Q, F = Math.round(0.25 * ((P - c) * Q - d * Q * Q) / 10) * 10;
      if (Q >= 15 && F > 0) return { who: "Gipfelbrett · Handgefertigte Serie", t: `Nachfrage P = ${a} − ${b}Q. Kosten C(Q) = ${F} + ${c}Q + ${App.n1(d)}Q² – die Grenzkosten steigen mit jedem Board (Überstunden, knappes Holz).`, a, b, c, d, F, unit: "Boards", sector: "snow" };
    }
  }
  const LEVELS = [
    { name: "Con ayuda", desc: "Caso con ayuda: la línea de Grenzerlös está visible desde el principio. Busca MR = MC. Pasa con ≥ 80 % del beneficio máximo.", make: () => A, pass: 80, showMR: true },
    { name: "Alquiler en la playa", desc: "Sin ayuda. Mucha competencia: demanda elástica. Pasa con ≥ 85 %.", make: () => Cc, pass: 85 },
    { name: "Pro-Modell", desc: "Fans fieles, demanda poco elástica: Markup alto. Pasa con ≥ 90 %.", make: () => B, pass: 90 },
    { name: "Mercado nuevo", desc: "Demanda y costes al azar. Pasa con ≥ 90 %.", make: randConst, pass: 90 },
    { name: "Precisión", desc: "Demanda y costes al azar. Pasa con ≥ 96 %.", make: randConst, pass: 96 },
    { name: "Costes crecientes", desc: "Ahora MC = c + 2dQ sube con la cantidad. Pasa con ≥ 90 %.", make: randQuad, pass: 90 },
    { name: "Costes + DWL", desc: "MC creciente. Después del precio, calcula el Deadweight Loss del óptimo. Pasa con ≥ 90 % y el DWL correcto.", make: randQuad, pass: 90, follow: "dwl" },
    { name: "Markup", desc: "Mercado al azar. Después calcula el Markup (P − MC)/P del óptimo en %. Pasa con ≥ 95 % y el Markup correcto.", make: randConst, pass: 95, follow: "markup" },
    { name: "Übungsblatt 5", desc: "P = 100 − 2Q, C = 50 + 4Q + Q². Precio con ≥ 97 %, después el beneficio máximo y el DWL.", make: () => U5, pass: 97, follow: "u5" }
  ];
  const solve = C => {
    const Qo = (C.a - C.c) / (2 * C.b + 2 * C.d), Po = C.a - C.b * Qo, MCo = C.c + 2 * C.d * Qo;
    const prof = P => { const Q = Math.max(0, (C.a - P) / C.b); return P * Q - (C.F + C.c * Q + C.d * Q * Q); };
    const Qe = (C.a - C.c) / (C.b + 2 * C.d);
    return { Qo, Po, MCo, PIo: prof(Po), prof, Qe, Pe: C.a - C.b * Qe, dwl: 0.5 * (Qe - Qo) * (Po - MCo), markup: (Po - MCo) / Po * 100, eps: Po / (C.b * Qo) };
  };

  function mount(root) {
    let locked = false, price = 0, stop = () => {};
    const side = h("div", { class: "stack" }), chartBox = h("div");
    const bar = App.levelBar("pricing", LEVELS, () => load());

    function load() {
      locked = false; stop();
      const L = LEVELS[bar.cur - 1], C = L.make(), X = solve(C);
      const xmax = C.a / C.b, mcTop = C.c + 2 * C.d * xmax, ymax = Math.max(C.a, Math.min(mcTop, C.a * 1.4)) * 1.05;
      const nice = v => { const p = Math.pow(10, Math.floor(Math.log10(v))) / 10; return [1, 2, 2.5, 5, 10, 20, 25, 50, 100].map(m => m * p).find(m => v / m <= 6); };
      const xs = nice(xmax), ys = nice(ymax);
      const P = App.plot({ xmax, ymax, xticks: Array.from({ length: Math.floor(xmax / xs) + 1 }, (_, k) => k * xs), yticks: Array.from({ length: Math.floor(ymax / ys) + 1 }, (_, k) => k * ys), xlabel: "Menge Q (" + C.unit + ")", ylabel: "Preis (€)", label: "Preissetzung", xfmt: App.n1 });
      const ps = s("polygon", { class: "area-profit" }), cs = s("polygon", { class: "area-cs" }), dwl = s("polygon", { class: "area-dwl", style: "display:none" });
      const dem = s("line", { class: "curve demand" }), mc = s("line", { class: "curve mc" }), mr = s("line", { class: "curve mr", style: L.showMR ? "" : "display:none" });
      const gx = s("line", { class: "guide" }), gy = s("line", { class: "guide" });
      const dot = s("circle", { class: "dot hi", r: 7 }), opt = s("circle", { class: "dot ok", r: 7, style: "display:none" });
      const tMR = s("text", { class: "tag d", text: "Grenzerlös", style: L.showMR ? "" : "display:none" });
      P.back.append(cs, ps, dwl); P.mid.append(gx, gy, dem, mc, mr);
      P.front.append(dot, opt, s("text", { class: "tag d", text: "Nachfrage", x: P.X(xmax * 0.04), y: P.Y(C.a * 0.96) - 8 }), s("text", { class: "tag s", text: "Grenzkosten", x: P.X(xmax * 0.78), y: P.Y(Math.min(ymax * 0.95, C.c + 2 * C.d * xmax * 0.78)) - 8 }), tMR);
      App.seg(P, dem, 0, C.a, xmax, 0); App.seg(P, mc, 0, C.c, xmax, mcTop); App.seg(P, mr, 0, C.a, xmax / 2, 0);
      App.set(tMR, { x: P.X(xmax * 0.3) + 8, y: P.Y(C.a * 0.4) });
      chartBox.replaceChildren(P.svg);

      const k = { q: h("b"), rev: h("b"), pi: h("b"), eps: h("b"), mu: h("b") };
      const kpi = (lab, el) => h("div", { class: "kpi" }, h("span", { class: "label", text: lab }), el);
      const kpiPi = kpi("Gewinn π", k.pi);
      const step = C.a > 600 ? 5 : C.a > 150 ? 1 : 0.5;
      const range = h("input", { type: "range", id: "priceRange", min: C.c, max: C.a, step, value: C.c + Math.round((C.a - C.c) * App.pick([0.15, 0.25, 0.8]) / step) * step, "aria-label": "Preis" });
      const priceOut = h("b", { class: "num", style: { fontSize: "22px" } });
      function update(p) {
        price = p;
        const Q = Math.max(0, (C.a - p) / C.b), mcQ = C.c + 2 * C.d * Q, pi = X.prof(p);
        App.poly(P, ps, [[0, p], [Q, p], [Q, mcQ], [0, C.c]]);
        App.poly(P, cs, [[0, C.a], [0, p], [Q, p]]);
        App.set(dot, { cx: P.X(Q), cy: P.Y(p) }); App.seg(P, gx, Q, 0, Q, p); App.seg(P, gy, 0, p, Q, p);
        priceOut.textContent = App.n2(p).replace(",00", "") + " €";
        k.q.textContent = App.n1(Q); k.rev.textContent = App.eur(p * Q); k.pi.textContent = App.eur(pi);
        kpiPi.className = "kpi " + (pi >= 0 ? "good" : "bad");
        k.eps.textContent = Q > 0 ? App.n2(p / (C.b * Q)) : "∞";
        k.mu.textContent = Math.round((p - mcQ) / p * 100) + " %";
      }
      range.addEventListener("input", () => { if (!locked) update(+range.value); });
      update(+range.value);

      const lockBtn = h("button", { class: "btn surf", type: "button", text: "Fijar precio", onclick: lock });
      const fb = h("div", { class: "stack", "aria-live": "polite" });
      side.replaceChildren(
        h("div", { class: "case" }, h("span", { class: "who", text: C.who }), h("p", { text: C.t })),
        h("div", { class: "range" }, h("div", { class: "row between" }, h("span", { class: "label", text: "Tu precio" }), priceOut), range),
        h("div", { class: "kpis" }, kpi("Absatz Q", k.q), kpi("Umsatz", k.rev), kpiPi, kpi("Elastizität ε", k.eps), kpi("Markup (P−MC)/P", k.mu)),
        h("p", { style: { color: "var(--muted)", fontSize: "14.5px" }, text: `Fixkosten ${App.eur(C.F)} ya restados. Verde = Produzentenrente (P − MC). Azul = Konsumentenrente.` }),
        h("div", { class: "row" }, lockBtn), fb);

      function lock() {
        if (locked) return; locked = true; range.disabled = lockBtn.disabled = true;
        const pi = X.prof(price), sc = Math.max(0, Math.round(pi / X.PIo * 100));
        [mr, tMR, opt, dwl].forEach(e => e.style.display = "");
        App.poly(P, dwl, [[X.Qo, X.Po], [X.Qo, X.MCo], [X.Qe, X.Pe]]);
        App.set(opt, { cx: P.X(X.Qo), cy: P.Y(X.Po) });
        const from = price;
        stop = App.tween(900, t => update(App.lerp(from, X.Po, t)), () => { if (sc >= L.pass) App.burst(opt, C.sector); });
        fb.append(h("div", { class: "feedback " + (sc >= L.pass ? "ok" : "no") },
          h("b", { text: `Tu beneficio: ${App.eur(pi)} = ${sc} % del máximo (necesitas ${L.pass} %)` }),
          h("span", { text: `MR = ${C.a} − ${App.n1(2 * C.b)}Q y MC = ${C.c}${C.d ? " + " + App.n1(2 * C.d) + "Q" : ""}. MR = MC → Q* = ${App.n2(X.Qo)}, P* = ${App.n2(X.Po)} €, π = ${App.eur(X.PIo)}. ε = ${App.n2(X.eps)}, Markup = ${App.n1(X.markup)} % = 1/ε. Rojo = Deadweight Loss.` })));
        const finish = extraOk => {
          let stars = sc >= 99 ? 3 : sc >= (L.pass + 100) / 2 ? 2 : sc >= L.pass ? 1 : 0;
          if (extraOk === false) stars = 0;
          App.saveScore("pricing", sc);
          fb.append(App.levelResult(bar, stars, `Nivel ${bar.cur}: ${sc} %`, extraOk === false ? "El precio cuenta, pero la pregunta extra tiene que estar bien." : "", load));
        };
        if (!L.follow) return finish();
        if (L.follow === "dwl") fb.append(App.numQuestion("Deadweight Loss en el óptimo del monopolio", X.dwl, Math.max(0.5, X.dwl * 0.005), "€", ok => { fb.append(h("p", { class: "hintbox", text: `DWL = ½ · (Q_eff − Q*) · (P* − MC(Q*)) = ½ · (${App.n2(X.Qe)} − ${App.n2(X.Qo)}) · (${App.n2(X.Po)} − ${App.n2(X.MCo)}) = ${App.n2(X.dwl)}. Q_eff sale de P = MC.` })); finish(ok); }));
        if (L.follow === "markup") fb.append(App.numQuestion("Markup (P* − MC)/P* en el óptimo", X.markup, 1, "%", ok => { fb.append(h("p", { class: "hintbox", text: `(${App.n2(X.Po)} − ${C.c}) / ${App.n2(X.Po)} = ${App.n1(X.markup)} % = 1/ε con ε = ${App.n2(X.eps)}.` })); finish(ok); }));
        if (L.follow === "u5") fb.append(App.numQuestion("Beneficio máximo π*", X.PIo, 0.5, "€", ok1 => {
          fb.append(App.numQuestion("Deadweight Loss frente a P = MC", X.dwl, 0.5, "€", ok2 => {
            fb.append(h("p", { class: "hintbox", text: `π* = 68 · 16 − (50 + 64 + 256) = 718. Eficiente: 100 − 2Q = 4 + 2Q → Q = 24. DWL = ½ · 8 · (68 − 36) = 128.` })); finish(ok1 && ok2);
          }));
        }));
      }
    }
    root.append(bar.el, h("div", { class: "split" }, h("div", { class: "panel stack" }, chartBox), h("div", { class: "panel" }, side)));
    load();
    return () => stop();
  }

  App.register({
    id: "pricing", order: 4, title: "Preis-Setter", levelsKey: "pricing",
    desc: "9 niveles con poder de mercado: de casos guiados a costes marginales crecientes, DWL, Markup y el ejercicio del Übungsblatt 5.",
    intro: "Eres una empresa con Marktmacht. Mueve el precio y observa unidades vendidas, beneficio, elasticidad y Markup. En los niveles altos los costes marginales suben con la cantidad y además calculas el DWL, el Markup o el beneficio máximo.",
    chapters: ["Kap 6"], sector: ["snow", "surf"],
    art: () => `<svg viewBox="0 0 240 96" aria-hidden="true"><rect width="240" height="96" fill="var(--sky)"/><path d="M60 12v72h130" stroke="var(--ink)" stroke-width="2" fill="none"/><rect x="60" y="38" width="55" height="22" fill="var(--ok)" opacity=".3"/><path d="M60 16L180 84" stroke="var(--snow)" stroke-width="4" stroke-linecap="round"/><path d="M60 60H190" stroke="var(--sun)" stroke-width="4" stroke-linecap="round"/><circle cx="115" cy="38" r="6" fill="var(--sun)"/><text x="200" y="36" font-size="22" font-weight="700" fill="var(--ok)">€</text></svg>`,
    mount
  });
})();
