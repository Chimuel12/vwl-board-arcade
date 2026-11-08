/* Board-Markt: predict how news shifts supply or demand, then watch the curves move (Kap 7). */
(function () {
  const { h, s } = App;
  // Demand P = a − bQ, supply P = c + dQ (P in €, Q in Tsd. Boards)
  const BASE = { a: 800, b: 8, c: 200, d: 4 }, SHIFT = 180;
  const EVENTS = [
    { icon: "snow", t: "Rekord-Schneefall in den Alpen: Die Saison startet vier Wochen früher.", m: "Snowboards", curve: "D", dir: +1, x: "Bei jedem Preis wollen mehr Leute ein Board: Die Nachfrage verschiebt sich nach rechts. Preis und Menge steigen." },
    { icon: "sun", t: "Schneearmer Winter: Viele Pisten bleiben bis Januar geschlossen.", m: "Snowboards", curve: "D", dir: -1, x: "Geringere Zahlungsbereitschaft verschiebt die Nachfrage nach links. Preis und Menge fallen." },
    { icon: "gear", t: "Eine neue CNC-Fräse senkt die Grenzkosten der Holzkerne um 30 %.", m: "Snowboards", curve: "S", dir: +1, x: "Niedrigere Grenzkosten verschieben die Angebotskurve nach rechts/unten. Der Preis sinkt, die Menge steigt." },
    { icon: "drop", t: "Der Preis für Glasfaser und Epoxidharz verdoppelt sich.", m: "Surfboards", curve: "S", dir: -1, x: "Höhere Inputkosten verschieben das Angebot nach links. Der Preis steigt, die Menge sinkt." },
    { icon: "wave", t: "Surfen ist olympisch, der Sport erlebt einen Hype auf Social Media.", m: "Surfboards", curve: "D", dir: +1, x: "Mode und Hype erhöhen die Zahlungsbereitschaft (wie bei den Hüten): Nachfrage nach rechts." },
    { icon: "gear", t: "Zehn neue Shaper eröffnen Werkstätten an der Küste.", m: "Surfboards", curve: "S", dir: +1, x: "Markteintritt erhöht das Angebot bei jedem Preis: Angebot nach rechts, Preis sinkt." },
    { icon: "drop", t: "Neoprenanzüge (ein Komplement zum Surfboard) werden viel teurer.", m: "Surfboards", curve: "D", dir: -1, x: "Wer keinen Anzug kauft, kauft auch kein Board: Die Nachfrage nach Surfboards sinkt." },
    { icon: "flag", t: "Die EU erhebt einen Zoll auf importierte Boards aus Asien.", m: "Snowboards", curve: "S", dir: -1, x: "Der Zoll verteuert das Anbieten: Das Angebot sinkt, der Preis steigt (getragen meist von den Kunden)." },
    { icon: "sun", t: "Rezession: Die Einkommen der Wintertouristen sinken deutlich.", m: "Snowboards", curve: "D", dir: -1, x: "Weniger Einkommen bedeutet weniger Nachfrage bei jedem Preis: Nachfrage nach links." }
  ];
  const ICONS = {
    snow: '<path d="M16 3v26M5 9.5l22 13M5 22.5l22-13" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>',
    sun: '<circle cx="16" cy="16" r="6" fill="currentColor"/><path d="M16 2v5M16 25v5M2 16h5M25 16h5M6 6l3.5 3.5M22.5 22.5 26 26M6 26l3.5-3.5M22.5 9.5 26 6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
    gear: '<circle cx="16" cy="16" r="5" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M16 3v5M16 24v5M3 16h5M24 16h5M7 7l3.5 3.5M21.5 21.5 25 25M7 25l3.5-3.5M21.5 10.5 25 7" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>',
    drop: '<path d="M16 4c5 7 8 11 8 15a8 8 0 0 1-16 0c0-4 3-8 8-15z" fill="currentColor"/>',
    wave: '<path d="M2 20c4-6 8-6 12 0s8 6 12 0 4-3 4-3" stroke="currentColor" stroke-width="2.6" fill="none" stroke-linecap="round"/><path d="M2 26c4-4 8-4 12 0s8 4 12 0" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" opacity=".6"/>',
    flag: '<path d="M7 28V4M7 5h17l-4 5 4 5H7" stroke="currentColor" stroke-width="2.4" fill="none" stroke-linejoin="round"/>'
  };
  const eq = p => { const Q = (p.a - p.c) / (p.b + p.d); return { Q, P: p.a - p.b * Q }; };

  function mount(root) {
    let deck = [], idx = 0, pts = 0, step = 0, pick = null, cur = { ...BASE }, stopTween = () => {};
    const P = App.plot({ xmax: 100, ymax: 900, xticks: [0, 25, 50, 75, 100], yticks: [0, 200, 400, 600, 800], xlabel: "Menge Q (Tsd. Boards)", ylabel: "Preis P (€)", label: "Angebot und Nachfrage" });
    const ghostD = s("line", { class: "curve ghost" }), ghostS = s("line", { class: "curve ghost" });
    const lD = s("line", { class: "curve demand" }), lS = s("line", { class: "curve supply" });
    const gx = s("line", { class: "guide" }), gy = s("line", { class: "guide" });
    const dot = s("circle", { class: "dot hi", r: 7 });
    const tD = s("text", { class: "tag d", text: "Nachfrage" }), tS = s("text", { class: "tag s", text: "Angebot" });
    const tE = s("text", { class: "tag k" });
    P.back.append(ghostD, ghostS);
    P.mid.append(gx, gy, lD, lS);
    P.front.append(dot, tD, tS, tE);

    function draw(p) {
      App.seg(P, lD, 0, p.a, 100, p.a - p.b * 100);
      App.seg(P, lS, 0, p.c, 100, p.c + p.d * 100);
      const e = eq(p);
      App.set(dot, { cx: P.X(e.Q), cy: P.Y(e.P) });
      App.seg(P, gx, e.Q, 0, e.Q, e.P); App.seg(P, gy, 0, e.P, e.Q, e.P);
      App.set(tD, { x: P.X(84), y: P.Y(p.a - p.b * 84) - 10 });
      App.set(tS, { x: P.X(84), y: P.Y(p.c + p.d * 84) - 10 });
      App.set(tE, { x: P.X(e.Q) + 10, y: P.Y(e.P) - 10, text: `P* ${App.n0(e.P)} € · Q* ${App.n1(e.Q)}` });
    }
    function ghosts(show) {
      [ghostD, ghostS].forEach(g => g.style.display = show ? "" : "none");
      App.seg(P, ghostD, 0, BASE.a, 100, BASE.a - BASE.b * 100);
      App.seg(P, ghostS, 0, BASE.c, 100, BASE.c + BASE.d * 100);
    }

    const side = h("div", { class: "stack" });
    const progress = h("div", { class: "progress" }, h("i", { style: { width: "0%" } }));
    const head = h("div", { class: "row between label" });

    function start() {
      deck = App.shuffle(EVENTS.slice()).slice(0, 6); idx = 0; pts = 0; next();
    }
    function next() {
      stopTween(); cur = { ...BASE }; draw(cur); ghosts(false); step = 0; pick = null;
      const ev = deck[idx];
      head.replaceChildren(h("span", { text: `Noticia ${idx + 1} / ${deck.length}` }), h("span", { text: `Puntos ${pts} / ${deck.length * 2}` }));
      progress.firstChild.style.width = (idx / deck.length * 100) + "%";
      const opts = h("div", { class: "opts two" });
      [["D", -1, "Nachfrage ← (sinkt)"], ["D", 1, "Nachfrage → (steigt)"], ["S", -1, "Angebot ← (sinkt)"], ["S", 1, "Angebot → (steigt)"]].forEach(([c, d, t]) =>
        opts.append(h("button", { class: "opt", type: "button", text: t, onclick: e => choose1(c, d, e.currentTarget, opts) })));
      side.replaceChildren(
        h("div", { class: "case" },
          h("div", { class: "row" }, h("span", { style: { color: ev.curve === "D" ? "var(--snow)" : "var(--sun)", display: "inline-flex" }, html: `<svg width="30" height="30" viewBox="0 0 32 32" fill="none" aria-hidden="true">${ICONS[ev.icon]}</svg>` }), h("span", { class: "who", text: "Markt für " + ev.m })),
          h("p", { text: ev.t })),
        h("span", { class: "label", text: "1 · ¿Qué curva se mueve y hacia dónde?" }), opts);
    }
    function choose1(c, d, btn, opts) {
      const ev = deck[idx]; pick = { c, d };
      const ok = c === ev.curve && d === ev.dir;
      [...opts.children].forEach(b => b.disabled = true);
      btn.classList.add(ok ? "right" : "wrong");
      if (ok) pts++;
      const opts2 = h("div", { class: "opts two" });
      [["up", "Precio sube ↑"], ["down", "Precio baja ↓"]].forEach(([v, t]) => opts2.append(h("button", { class: "opt", type: "button", text: t, onclick: e => choose2(v, e.currentTarget, opts2, ok) })));
      side.append(h("span", { class: "label", text: "2 · ¿Qué pasa con el precio de equilibrio?" }), opts2);
    }
    function choose2(v, btn, opts2, ok1) {
      const ev = deck[idx];
      const target = { ...BASE };
      if (ev.curve === "D") target.a += ev.dir * SHIFT; else target.c -= ev.dir * SHIFT;
      const e0 = eq(BASE), e1 = eq(target);
      const truth = e1.P > e0.P ? "up" : "down";
      const ok2 = v === truth;
      [...opts2.children].forEach(b => b.disabled = true);
      btn.classList.add(ok2 ? "right" : "wrong");
      if (ok2) pts++;
      ghosts(true);
      stopTween = App.tween(1100, t => draw({ a: App.lerp(BASE.a, target.a, t), b: BASE.b, c: App.lerp(BASE.c, target.c, t), d: BASE.d }), () => { if (ok1 && ok2) App.burst(dot, ev.m === "Surfboards" ? "surf" : "snow"); });
      const last = idx === deck.length - 1;
      side.append(h("div", { class: "feedback " + (ok1 && ok2 ? "ok" : "no") },
        h("b", { text: (ok1 && ok2) ? "¡Bien leído el mercado!" : "Mira cómo se mueven las curvas" }),
        h("span", { text: ev.x + ` Nuevo equilibrio: P* ${App.n0(e1.P)} € (antes ${App.n0(e0.P)} €), Q* ${App.n1(e1.Q)} Tsd. (antes ${App.n1(e0.Q)}).` }),
        h("div", { class: "row", style: { marginTop: "6px" } }, h("button", { class: "btn surf", type: "button", text: last ? "Ver resultado" : "Siguiente noticia", onclick: () => { idx++; last ? end() : next(); } }))));
      head.lastChild.textContent = `Puntos ${pts} / ${deck.length * 2}`;
    }
    function end() {
      progress.firstChild.style.width = "100%";
      const score = Math.round(pts / (deck.length * 2) * 100);
      const rec = App.saveScore("market", score);
      side.replaceChildren(h("div", { class: "result" }, h("span", { class: "label", text: "Resultado" }), h("div", { class: "big", text: score }),
        h("p", { text: `${pts} de ${deck.length * 2} predicciones correctas` + (rec ? " · ¡nuevo récord!" : "") }),
        h("p", { style: { color: "var(--muted)" }, text: "Regla: la noticia cambia la disposición a pagar (Nachfrage) o los costes marginales (Angebot). Después el precio se ajusta hasta que el mercado vuelve a vaciarse." }),
        h("button", { class: "btn surf", type: "button", text: "Jugar otra vez", onclick: start })));
    }

    root.append(h("div", { class: "split" },
      h("div", { class: "panel stack" }, head, progress, P.svg, h("p", { class: "label", text: "Líneas grises = mercado antes de la noticia" })),
      h("div", { class: "panel" }, side)));
    start();
    return () => stopTween();
  }

  App.register({
    id: "market", order: 3, title: "Board-Markt",
    desc: "Llegan noticias del sector. Predice qué curva se mueve y mira el nuevo equilibrio animado.",
    intro: "Cada noticia afecta al mercado de tablas. Decide si mueve la oferta o la demanda y hacia qué lado, predice el precio y observa cómo se desplazan las curvas.",
    chapters: ["Kap 7"], sector: ["surf", "snow"],
    art: () => `<svg viewBox="0 0 240 96" aria-hidden="true"><rect width="240" height="96" fill="var(--sky)"/><path d="M60 12v72h130" stroke="var(--ink)" stroke-width="2" fill="none"/><path d="M70 18L180 80" stroke="var(--snow)" stroke-width="4" stroke-linecap="round"/><path d="M70 80L180 18" stroke="var(--sun)" stroke-width="4" stroke-linecap="round"/><path d="M92 18L200 78" stroke="var(--snow)" stroke-width="2.5" stroke-dasharray="5 5" opacity=".7"/><circle cx="125" cy="49" r="6" fill="var(--ink)"/></svg>`,
    mount
  });
})();
