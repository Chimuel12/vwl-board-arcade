/* Preis-Setter: pick the profit-maximising price as a firm with market power (Kap 6). */
(function () {
  const { h, s } = App;
  // Demand P = a − bQ, constant marginal cost c, fixed cost F
  const CASES = [
    { who: "Gipfelbrett · Allround-Snowboard", t: "Dein Allround-Board hat viele Konkurrenten. Herstellung kostet 300 € pro Board (Grenzkosten), Presse und Halle 6.000 € Fixkosten pro Monat.", a: 900, b: 6, c: 300, F: 6000, unit: "Boards/Monat", sector: "snow" },
    { who: "Gipfelbrett · Pro-Modell Limited", t: "Signature-Board eines Freeride-Profis. Treue Fans, kaum Ersatz. Grenzkosten 400 €, Fixkosten 4.000 € für Design und Marketing.", a: 1500, b: 20, c: 400, F: 4000, unit: "Boards/Monat", sector: "snow" },
    { who: "Salzwasser Surf Co. · Board-Verleih", t: "Tagesmiete für Softboards am Strand, viele Verleiher in der Nähe. Grenzkosten 20 € (Reinigung, Wachs, Verschleiß), Fixkosten 500 € pro Tag.", a: 60, b: 0.2, c: 20, F: 500, unit: "Mieten/Tag", sector: "surf" }
  ];

  function mount(root) {
    let i = 0, total = 0, locked = false, price = 0, stop = () => {};
    const side = h("div", { class: "stack" });
    const chartBox = h("div");
    const head = h("div", { class: "row between label" });

    function start() { i = 0; total = 0; load(); }
    function load() {
      locked = false; stop();
      const C = CASES[i];
      const xmax = C.a / C.b, ymax = C.a * 1.05;
      const nice = v => { const p = Math.pow(10, Math.floor(Math.log10(v))) / 10; return [1, 2, 2.5, 5, 10, 20, 25, 50, 100].map(m => m * p).find(m => v / m <= 6); };
      const xs = nice(xmax), ys = nice(ymax);
      const P = App.plot({ xmax, ymax, xticks: Array.from({ length: Math.floor(xmax / xs) + 1 }, (_, k) => k * xs), yticks: Array.from({ length: Math.floor(ymax / ys) + 1 }, (_, k) => k * ys), xlabel: "Menge Q (" + C.unit + ")", ylabel: "Preis (€)", label: "Preissetzung", xfmt: App.n1 });
      const profit = s("rect", { class: "area-profit" });
      const cs = s("polygon", { class: "area-cs" });
      const dwl = s("polygon", { class: "area-dwl", style: "display:none" });
      const dem = s("line", { class: "curve demand" }), mc = s("line", { class: "curve mc" }), mr = s("line", { class: "curve mr", style: "display:none" });
      const gx = s("line", { class: "guide" }), gy = s("line", { class: "guide" });
      const dot = s("circle", { class: "dot hi", r: 7 }), opt = s("circle", { class: "dot ok", r: 7, style: "display:none" });
      const tags = [s("text", { class: "tag d", text: "Nachfrage" }), s("text", { class: "tag s", text: "Grenzkosten" }), s("text", { class: "tag d", text: "Grenzerlös", style: "display:none" })];
      P.back.append(cs, profit, dwl); P.mid.append(gx, gy, dem, mc, mr); P.front.append(dot, opt, ...tags);
      App.seg(P, dem, 0, C.a, xmax, 0);
      App.seg(P, mc, 0, C.c, xmax, C.c);
      App.seg(P, mr, 0, C.a, xmax / 2, 0);
      App.set(tags[0], { x: P.X(xmax * 0.04), y: P.Y(C.a * 0.96) - 8 });
      App.set(tags[1], { x: P.X(xmax * 0.80), y: P.Y(C.c) - 8 });
      App.set(tags[2], { x: P.X(xmax * 0.30) + 8, y: P.Y(C.a * 0.4) });
      chartBox.replaceChildren(P.svg);

      const Qopt = (C.a - C.c) / (2 * C.b), Popt = C.a - C.b * Qopt, PIopt = (Popt - C.c) * Qopt - C.F;
      const k = { q: h("b"), rev: h("b"), pi: h("b"), eps: h("b"), mu: h("b") };
      const kpi = (lab, el) => h("div", { class: "kpi" }, h("span", { class: "label", text: lab }), el);
      const kpiPi = kpi("Gewinn π", k.pi);
      const range = h("input", { type: "range", id: "priceRange", min: C.c, max: C.a, step: C.a > 200 ? 10 : 1, value: Math.round(C.c + (C.a - C.c) * 0.25), "aria-label": "Preis" });
      const priceOut = h("b", { class: "num", style: { fontSize: "22px" } });

      function update(p) {
        price = p;
        const Q = Math.max(0, (C.a - p) / C.b), pi = (p - C.c) * Q - C.F;
        App.set(profit, { x: P.X(0), y: P.Y(p), width: P.X(Q) - P.X(0), height: Math.max(0, P.Y(C.c) - P.Y(p)) });
        App.poly(P, cs, [[0, C.a], [0, p], [Q, p]]);
        App.set(dot, { cx: P.X(Q), cy: P.Y(p) });
        App.seg(P, gx, Q, 0, Q, p); App.seg(P, gy, 0, p, Q, p);
        priceOut.textContent = App.eur(p);
        k.q.textContent = App.n1(Q);
        k.rev.textContent = App.eur(p * Q);
        k.pi.textContent = App.eur(pi);
        kpiPi.className = "kpi " + (pi >= 0 ? "good" : "bad");
        k.eps.textContent = Q > 0 ? App.n2(p / (C.b * Q)) : "∞";
        k.mu.textContent = Math.round((p - C.c) / p * 100) + " %";
      }
      range.addEventListener("input", () => { if (!locked) update(+range.value); });
      update(+range.value);

      head.replaceChildren(h("span", { text: `Caso ${i + 1} / ${CASES.length}` }), h("span", { text: `Puntos ${total}` }));
      const lockBtn = h("button", { class: "btn surf", type: "button", text: "Fijar precio", onclick: lock });
      const fb = h("div", { "aria-live": "polite" });
      side.replaceChildren(
        h("div", { class: "case" }, h("span", { class: "who", text: C.who }), h("p", { text: C.t })),
        h("div", { class: "range" }, h("div", { class: "row" }, h("span", { class: "label", text: "Tu precio" }), priceOut), range),
        h("div", { class: "kpis" }, kpi("Absatz Q", k.q), kpi("Umsatz", k.rev), kpiPi, kpi("Elastizität ε", k.eps), kpi("Markup (P−MC)/P", k.mu)),
        h("p", { style: { color: "var(--muted)", fontSize: "14.5px" }, text: "Fixkosten " + App.eur(C.F) + " ya están restados del Gewinn. Área verde = (P − MC) · Q. Área azul = Konsumentenrente." }),
        h("div", { class: "row" }, lockBtn), fb);

      function lock() {
        if (locked) return; locked = true; range.disabled = true; lockBtn.disabled = true;
        const Q = (C.a - price) / C.b, pi = (price - C.c) * Q - C.F;
        const sc = Math.max(0, Math.round(pi / PIopt * 100));
        total += sc;
        head.lastChild.textContent = `Puntos ${total}`;
        // reveal optimum: MR line, optimum point and deadweight loss at the optimum
        [mr, tags[2], opt, dwl].forEach(e => e.style.display = "");
        const Qeff = (C.a - C.c) / C.b;
        App.poly(P, dwl, [[Qopt, Popt], [Qopt, C.c], [Qeff, C.c]]);
        App.set(opt, { cx: P.X(Qopt), cy: P.Y(Popt) });
        const from = price;
        stop = App.tween(900, t => update(App.lerp(from, Popt, t)), () => { if (sc >= 90) App.burst(opt, C.sector); });
        const epsOpt = Popt / (C.b * Qopt);
        const last = i === CASES.length - 1;
        fb.replaceChildren(h("div", { class: "feedback " + (sc >= 90 ? "ok" : "no") },
          h("b", { text: `Tu beneficio: ${App.eur(pi)} = ${sc} % del máximo` }),
          h("span", { text: `Óptimo donde MR = MC: Q* = ${App.n1(Qopt)}, P* = ${App.eur(Popt)}, π = ${App.eur(PIopt)}. Ahí ε = ${App.n2(epsOpt)} y el Markup (P − MC)/P = ${Math.round((Popt - C.c) / Popt * 100)} % = 1/ε. El triángulo rojo es el Deadweight Loss: clientes con WTP > MC que no compran.` }),
          h("div", { class: "row", style: { marginTop: "6px" } }, h("button", { class: "btn surf", type: "button", text: last ? "Ver resultado" : "Siguiente caso", onclick: () => { i++; last ? end() : load(); } }))));
      }
    }
    function end() {
      const score = Math.round(total / CASES.length);
      const rec = App.saveScore("pricing", score);
      side.replaceChildren(h("div", { class: "result" }, h("span", { class: "label", text: "Resultado medio" }), h("div", { class: "big", text: score }),
        h("p", { text: "Porcentaje medio del beneficio máximo" + (rec ? " · ¡nuevo récord!" : "") }),
        h("p", { style: { color: "var(--muted)" }, text: "Fíjate: el Pro-Modell (demanda poco elástica) admite el Markup más alto. Con mucha competencia (alquiler en la playa) el margen es menor." }),
        h("button", { class: "btn surf", type: "button", text: "Jugar otra vez", onclick: start })));
    }
    root.append(h("div", { class: "split" }, h("div", { class: "panel stack" }, head, chartBox), h("div", { class: "panel" }, side)));
    start();
    return () => stop();
  }

  App.register({
    id: "pricing", order: 4, title: "Preis-Setter",
    desc: "Tienes poder de mercado. Mueve el precio de tus tablas y busca el beneficio máximo.",
    intro: "Eres una empresa con Marktmacht. Mueve el precio y observa unidades vendidas, beneficio, elasticidad y Markup. Cuando fijes el precio aparecen el Grenzerlös, el óptimo MR = MC y el Deadweight Loss.",
    chapters: ["Kap 6"], sector: ["snow", "surf"],
    art: () => `<svg viewBox="0 0 240 96" aria-hidden="true"><rect width="240" height="96" fill="var(--sky)"/><path d="M60 12v72h130" stroke="var(--ink)" stroke-width="2" fill="none"/><rect x="60" y="38" width="55" height="22" fill="var(--ok)" opacity=".3"/><path d="M60 16L180 84" stroke="var(--snow)" stroke-width="4" stroke-linecap="round"/><path d="M60 60H190" stroke="var(--sun)" stroke-width="4" stroke-linecap="round"/><circle cx="115" cy="38" r="6" fill="var(--sun)"/><text x="200" y="36" font-size="22" font-weight="700" fill="var(--ok)">€</text></svg>`,
    mount
  });
})();
