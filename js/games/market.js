/* Board-Markt (Kap 7): 9 levels. 1–5 read news and predict shifts (incl. two news at once);
   6–9 compute equilibria, shortages under a price ceiling, surpluses and the ski-equipment market (Übungsblatt 6). */
(function () {
  const { h, s } = App;
  const EVENTS = [
    { icon: "snow", t: "Rekord-Schneefall in den Alpen: Die Saison startet vier Wochen früher.", m: "Snowboards", curve: "D", dir: +1, x: "Bei jedem Preis wollen mehr Leute ein Board: Nachfrage nach rechts." },
    { icon: "sun", t: "Schneearmer Winter: Viele Pisten bleiben bis Januar geschlossen.", m: "Snowboards", curve: "D", dir: -1, x: "Geringere Zahlungsbereitschaft: Nachfrage nach links." },
    { icon: "sun", t: "Rezession: Die Einkommen der Wintertouristen sinken deutlich.", m: "Snowboards", curve: "D", dir: -1, x: "Weniger Einkommen → weniger Nachfrage bei jedem Preis (normales Gut)." },
    { icon: "gear", t: "Eine neue CNC-Fräse senkt die Grenzkosten der Holzkerne um 30 %.", m: "Snowboards", curve: "S", dir: +1, x: "Niedrigere Grenzkosten: Angebot nach rechts/unten." },
    { icon: "flag", t: "Die EU erhebt einen Zoll auf importierte Snowboards.", m: "Snowboards", curve: "S", dir: -1, x: "Der Zoll verteuert das Anbieten: Angebot nach links." },
    { icon: "wave", t: "Surfen ist olympisch, der Sport erlebt einen Hype auf Social Media.", m: "Surfboards", curve: "D", dir: +1, x: "Hype erhöht die Zahlungsbereitschaft: Nachfrage nach rechts (wie bei den Hüten)." },
    { icon: "drop", t: "Neoprenanzüge (ein Komplement) werden viel teurer.", m: "Surfboards", curve: "D", dir: -1, x: "Teureres Komplement → weniger Nachfrage nach Surfboards." },
    { icon: "drop", t: "Der Preis für Glasfaser und Epoxidharz verdoppelt sich.", m: "Surfboards", curve: "S", dir: -1, x: "Höhere Inputkosten: Angebot nach links." },
    { icon: "gear", t: "Zehn neue Shaper eröffnen Werkstätten an der Küste.", m: "Surfboards", curve: "S", dir: +1, x: "Markteintritt: Angebot nach rechts." }
  ];
  const ICONS = {
    snow: '<path d="M16 3v26M5 9.5l22 13M5 22.5l22-13" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>',
    sun: '<circle cx="16" cy="16" r="6" fill="currentColor"/><path d="M16 2v5M16 25v5M2 16h5M25 16h5M6 6l3.5 3.5M22.5 22.5 26 26M6 26l3.5-3.5M22.5 9.5 26 6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
    gear: '<circle cx="16" cy="16" r="5" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M16 3v5M16 24v5M3 16h5M24 16h5M7 7l3.5 3.5M21.5 21.5 25 25M7 25l3.5-3.5M21.5 10.5 25 7" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>',
    drop: '<path d="M16 4c5 7 8 11 8 15a8 8 0 0 1-16 0c0-4 3-8 8-15z" fill="currentColor"/>',
    wave: '<path d="M2 20c4-6 8-6 12 0s8 6 12 0 4-3 4-3" stroke="currentColor" stroke-width="2.6" fill="none" stroke-linecap="round"/>',
    flag: '<path d="M7 28V4M7 5h17l-4 5 4 5H7" stroke="currentColor" stroke-width="2.4" fill="none" stroke-linejoin="round"/>'
  };
  const LEVELS = [
    { name: "Solo demanda", desc: "5 noticias que mueven la Nachfrage. ¿Qué curva y hacia dónde? ¿Y el precio?", type: "news", filter: "D", rounds: 5 },
    { name: "Solo oferta", desc: "5 noticias que mueven el Angebot (costes, aranceles, nuevos fabricantes).", type: "news", filter: "S", rounds: 5 },
    { name: "Mezcla", desc: "6 noticias de todo tipo. Ahora tienes que distinguir demanda de oferta.", type: "news", rounds: 6 },
    { name: "Precio y cantidad", desc: "6 noticias. Además del precio, predice también la cantidad de equilibrio.", type: "news", askQ: true, rounds: 6 },
    { name: "Dos noticias", desc: "Dos noticias a la vez (una mueve la demanda y otra la oferta): a veces el efecto es indeterminado.", type: "double", rounds: 6 },
    { name: "Calcula P*", desc: "Con P = a − bQ y P = c + dQ, calcula el nuevo precio de equilibrio tras la noticia.", type: "eq", rounds: 5 },
    { name: "Precio máximo", desc: "El gobierno fija un Höchstpreis por debajo de P*. Calcula la escasez (Nachfrageüberschuss).", type: "ceiling", rounds: 5 },
    { name: "Rentas", desc: "Calcula la Konsumentenrente o la Produzentenrente en el equilibrio.", type: "surplus", rounds: 5 },
    { name: "Skiausrüstung", desc: "Nivel examen (Übungsblatt 6): Q_D = 2.005 − 10p + 0,01Y − 7T y Q_S = −100 + 15p. Calcula p*.", type: "ski", rounds: 5 }
  ];
  const eqOf = p => { const Q = (p.a - p.c) / (p.b + p.d); return { Q, P: p.a - p.b * Q }; };
  function genMarket() {
    for (;;) { const p = { a: App.rnd(600, 900, 50), b: App.pick([4, 5, 6, 8]), c: App.rnd(100, 300, 50), d: App.pick([2, 3, 4]) }; const e = eqOf(p); if (e.Q >= 25 && e.Q <= 65) return p; }
  }
  // integer market: choose Q*, P*, slopes; intercepts follow
  function genInt() {
    for (;;) { const b = App.pick([2, 3, 4, 5]), d = App.pick([1, 2, 3]), Q = App.rnd(20, 50, 5), P = App.rnd(300, 500, 10), a = P + b * Q, c = P - d * Q; if (c >= 40 && a <= 900) return { a, b, c, d }; }
  }

  function chart(xmax, ymax, xlabel) {
    const nice = v => { const p = Math.pow(10, Math.floor(Math.log10(v))) / 10; return [1, 2, 2.5, 5, 10, 20, 25, 50, 100].map(m => m * p).find(m => v / m <= 6); };
    const xs = nice(xmax), ys = nice(ymax);
    const P = App.plot({ xmax, ymax, xticks: Array.from({ length: Math.floor(xmax / xs) + 1 }, (_, k) => k * xs), yticks: Array.from({ length: Math.floor(ymax / ys) + 1 }, (_, k) => k * ys), xlabel, ylabel: "Preis P (€)", label: "Angebot und Nachfrage", xfmt: App.n1 });
    const ghostD = s("line", { class: "curve ghost" }), ghostS = s("line", { class: "curve ghost" });
    const lD = s("line", { class: "curve demand" }), lS = s("line", { class: "curve supply" });
    const gx = s("line", { class: "guide" }), gy = s("line", { class: "guide" });
    const ceil = s("line", { class: "curve price", style: "display:none;stroke-dasharray:8 5" });
    const dot = s("circle", { class: "dot hi", r: 7 });
    const tD = s("text", { class: "tag d", text: "Nachfrage" }), tS = s("text", { class: "tag s", text: "Angebot" }), tE = s("text", { class: "tag k" }), tC = s("text", { class: "tag g" });
    const cs = s("polygon", { class: "area-cs", style: "display:none" }), ps = s("polygon", { class: "area-profit", style: "display:none" });
    P.back.append(cs, ps, ghostD, ghostS); P.mid.append(gx, gy, lD, lS, ceil); P.front.append(dot, tD, tS, tE, tC);
    [ghostD, ghostS].forEach(g => g.style.display = "none");
    const api = {
      svg: P.svg, P,
      draw(p, label = true) {
        App.seg(P, lD, 0, p.a, xmax, p.a - p.b * xmax);
        App.seg(P, lS, 0, p.c, xmax, p.c + p.d * xmax);
        const e = eqOf(p);
        App.set(dot, { cx: P.X(e.Q), cy: P.Y(e.P) });
        App.seg(P, gx, e.Q, 0, e.Q, e.P); App.seg(P, gy, 0, e.P, e.Q, e.P);
        const tq = xmax * 0.84;
        App.set(tD, { x: P.X(tq), y: P.Y(p.a - p.b * tq) - 10 });
        App.set(tS, { x: P.X(tq), y: P.Y(Math.min(ymax * 0.95, p.c + p.d * tq)) - 10 });
        App.set(tE, { x: P.X(e.Q) + 10, y: P.Y(e.P) - 10, text: label ? `P* ${App.fmtNum(e.P)} € · Q* ${App.fmtNum(e.Q)}` : "" });
      },
      ghosts(p) { [ghostD, ghostS].forEach(g => g.style.display = ""); App.seg(P, ghostD, 0, p.a, xmax, p.a - p.b * xmax); App.seg(P, ghostS, 0, p.c, xmax, p.c + p.d * xmax); },
      ceiling(p, pc) { ceil.style.display = ""; App.seg(P, ceil, 0, pc, xmax, pc); App.set(tC, { x: P.X(xmax * 0.02), y: P.Y(pc) + 16, text: "Höchstpreis " + App.n0(pc) + " €" }); },
      surplus(p) {
        const e = eqOf(p); cs.style.display = ps.style.display = "";
        App.poly(P, cs, [[0, p.a], [0, e.P], [e.Q, e.P]]); App.poly(P, ps, [[0, e.P], [0, p.c], [e.Q, e.P]]);
      },
      dot
    };
    return api;
  }
  const iconEl = ev => h("span", { style: { color: ev.curve === "D" ? "var(--snow)" : "var(--sun)", display: "inline-flex" }, html: `<svg width="30" height="30" viewBox="0 0 32 32" fill="none" aria-hidden="true">${ICONS[ev.icon]}</svg>` });

  function mount(root) {
    let L, deck, idx, pts, maxPts, stop = () => {};
    const left = h("div", { class: "panel stack" });
    const side = h("div", { class: "stack" });
    const head = h("div", { class: "row between label" });
    const progress = h("div", { class: "progress" }, h("i", { style: { width: "0%" } }));
    const bar = App.levelBar("market", LEVELS, () => start());

    function setHead() {
      head.replaceChildren(h("span", { text: `Ronda ${Math.min(idx + 1, L.rounds)} / ${L.rounds}` }), h("span", { text: `Puntos ${pts} / ${maxPts}` }));
      progress.firstChild.style.width = (idx / L.rounds * 100) + "%";
    }
    function start() {
      stop(); L = LEVELS[bar.cur - 1]; idx = 0; pts = 0;
      const perRound = L.type === "news" ? (L.askQ ? 3 : 2) : L.type === "double" ? 2 : 1;
      maxPts = perRound * L.rounds;
      if (L.type === "news") deck = App.shuffle(EVENTS.filter(e => !L.filter || e.curve === L.filter)).slice(0, L.rounds);
      while (deck && L.type === "news" && deck.length < L.rounds) deck.push(App.pick(EVENTS.filter(e => !L.filter || e.curve === L.filter)));
      round();
    }
    function nextBtn() {
      const last = idx === L.rounds - 1;
      return h("div", { class: "row", style: { marginTop: "6px" } }, h("button", { class: "btn surf", type: "button", text: last ? "Ver resultado" : "Siguiente", onclick: () => { idx++; last ? end() : round(); } }));
    }
    function scoreUp(n) { pts += n; head.lastChild.textContent = `Puntos ${pts} / ${maxPts}`; }
    function mcBlock(label, opts, onPick) {
      const box = h("div", { class: "opts two" });
      opts.forEach(([v, t]) => box.append(h("button", { class: "opt", type: "button", text: t, onclick: e => { [...box.children].forEach(b => b.disabled = true); onPick(v, e.currentTarget, box); } })));
      return [h("span", { class: "label", text: label }), box];
    }
    const mark = (btn, ok) => btn.classList.add(ok ? "right" : "wrong");

    function round() {
      stop(); setHead();
      ({ news: roundNews, double: roundDouble, eq: roundEq, ceiling: roundCeiling, surplus: roundSurplus, ski: roundSki })[L.type]();
    }

    // ── levels 1–4
    function roundNews() {
      const ev = deck[idx], base = genMarket(), C = chart(100, 1000, "Menge Q (Tsd. Boards)");
      C.draw(base); left.replaceChildren(head, progress, C.svg, h("p", { class: "label", text: "Líneas grises = mercado antes de la noticia" }));
      const shift = Math.round((base.a - base.c) * 0.32 / 10) * 10;
      const target = { ...base }; if (ev.curve === "D") target.a += ev.dir * shift; else target.c -= ev.dir * shift;
      const e0 = eqOf(base), e1 = eqOf(target);
      let ok = [];
      side.replaceChildren(h("div", { class: "case" }, h("div", { class: "row" }, iconEl(ev), h("span", { class: "who", text: "Markt für " + ev.m })), h("p", { text: ev.t })),
        ...mcBlock("1 · ¿Qué curva se mueve y hacia dónde?", [["D-1", "Nachfrage ← (sinkt)"], ["D1", "Nachfrage → (steigt)"], ["S-1", "Angebot ← (sinkt)"], ["S1", "Angebot → (steigt)"]], (v, btn) => {
          ok.push(v === ev.curve + ev.dir); mark(btn, ok[0]); if (ok[0]) scoreUp(1);
          side.append(...mcBlock("2 · ¿Precio de equilibrio?", [["up", "Precio sube ↑"], ["down", "Precio baja ↓"]], (v2, b2) => {
            ok.push(v2 === (e1.P > e0.P ? "up" : "down")); mark(b2, ok[1]); if (ok[1]) scoreUp(1);
            if (L.askQ) side.append(...mcBlock("3 · ¿Cantidad de equilibrio?", [["up", "Cantidad sube ↑"], ["down", "Cantidad baja ↓"]], (v3, b3) => { ok.push(v3 === (e1.Q > e0.Q ? "up" : "down")); mark(b3, ok[2]); if (ok[2]) scoreUp(1); reveal(); }));
            else reveal();
          }));
        }));
      function reveal() {
        C.ghosts(base);
        stop = App.tween(1100, t => C.draw({ a: App.lerp(base.a, target.a, t), b: base.b, c: App.lerp(base.c, target.c, t), d: base.d }), () => { if (ok.every(Boolean)) App.burst(C.dot, ev.m === "Surfboards" ? "surf" : "snow"); });
        side.append(h("div", { class: "feedback " + (ok.every(Boolean) ? "ok" : "no") }, h("b", { text: ok.every(Boolean) ? "¡Bien leído el mercado!" : "Mira cómo se mueven las curvas" }),
          h("span", { text: ev.x + ` P*: ${App.n0(e0.P)} → ${App.n0(e1.P)} €, Q*: ${App.n1(e0.Q)} → ${App.n1(e1.Q)} Tsd.` }), nextBtn()));
      }
    }
    // ── level 5: one demand + one supply shift
    function roundDouble() {
      const m = App.pick(["Snowboards", "Surfboards"]);
      const evD = App.pick(EVENTS.filter(e => e.m === m && e.curve === "D")), evS = App.pick(EVENTS.filter(e => e.m === m && e.curve === "S"));
      const base = genMarket(), C = chart(100, 1000, "Menge Q (Tsd. Boards)"); C.draw(base);
      left.replaceChildren(head, progress, C.svg, h("p", { class: "label", text: "Líneas grises = mercado antes de las noticias" }));
      const span = base.a - base.c, target = { ...base };
      target.a += evD.dir * Math.round(span * App.pick([0.18, 0.28, 0.38]) / 10) * 10;
      target.c -= evS.dir * Math.round(span * App.pick([0.18, 0.28, 0.38]) / 10) * 10;
      const theoryP = evD.dir === evS.dir ? "?" : evD.dir > 0 ? "up" : "down";
      const theoryQ = evD.dir === evS.dir ? (evD.dir > 0 ? "up" : "down") : "?";
      const e0 = eqOf(base), e1 = eqOf(target);
      const opts = w => [["up", w + " sube"], ["down", w + " baja"], ["?", "Indeterminado"]];
      const ok = [];
      side.replaceChildren(
        h("div", { class: "case" }, h("span", { class: "who", text: "Markt für " + m + " · dos noticias" }), h("div", { class: "row" }, iconEl(evD), h("p", { text: evD.t })), h("div", { class: "row" }, iconEl(evS), h("p", { text: evS.t }))),
        h("p", { class: "hintbox", text: "Sin saber cuánto se mueve cada curva: ¿qué puedes asegurar?" }),
        ...mcBlock("1 · Precio de equilibrio", opts("Precio"), (v, b) => {
          ok.push(v === theoryP); mark(b, ok[0]); if (ok[0]) scoreUp(1);
          side.append(...mcBlock("2 · Cantidad de equilibrio", opts("Cantidad"), (v2, b2) => {
            ok.push(v2 === theoryQ); mark(b2, ok[1]); if (ok[1]) scoreUp(1);
            C.ghosts(base);
            stop = App.tween(1100, t => C.draw({ a: App.lerp(base.a, target.a, t), b: base.b, c: App.lerp(base.c, target.c, t), d: base.d }));
            const word = d => d === "up" ? "sube" : d === "down" ? "baja" : "es indeterminado (depende del tamaño de los desplazamientos)";
            side.append(h("div", { class: "feedback " + (ok.every(Boolean) ? "ok" : "no") }, h("b", { text: `Precio ${word(theoryP)} · cantidad ${word(theoryQ)}` }),
              h("span", { text: `${evD.x} ${evS.x} Cuando ambas curvas se mueven, solo una de las dos variables tiene dirección segura. En este ejemplo concreto: P* ${App.n0(e0.P)} → ${App.n0(e1.P)} €, Q* ${App.n1(e0.Q)} → ${App.n1(e1.Q)}.` }), nextBtn()));
          }));
        }));
    }
    // ── level 6: compute new P*
    function roundEq() {
      const base = genInt(), ev = App.pick(EVENTS), k = App.pick([5, 10, 15]), delta = k * (base.b + base.d);
      const target = { ...base }; if (ev.curve === "D") target.a += ev.dir * delta; else target.c -= ev.dir * delta;
      const e1 = eqOf(target), C = chart(100, 1000, "Menge Q"); C.draw(base);
      left.replaceChildren(head, progress, C.svg);
      const change = ev.curve === "D" ? `a ${ev.dir > 0 ? "sube" : "baja"} en ${delta}` : `c ${ev.dir < 0 ? "sube" : "baja"} en ${delta}`;
      side.replaceChildren(
        h("div", { class: "case" }, h("span", { class: "who", text: "Markt für " + ev.m }),
          h("p", { text: `Nachfrage: P = ${base.a} − ${base.b}Q · Angebot: P = ${base.c} + ${base.d}Q.` }),
          h("p", { text: `Noticia: ${ev.t} En el modelo: ${change}.` })),
        App.numQuestion("Nuevo precio de equilibrio P*", e1.P, 0.5, "€", ok => {
          if (ok) scoreUp(1);
          C.ghosts(base); stop = App.tween(1000, t => C.draw({ a: App.lerp(base.a, target.a, t), b: base.b, c: App.lerp(base.c, target.c, t), d: base.d }));
          side.append(h("div", { class: "feedback " + (ok ? "ok" : "no") }, h("b", { text: `P* = ${App.fmtNum(e1.P)} €, Q* = ${App.fmtNum(e1.Q)}` }),
            h("span", { text: `Igualar ${target.a} − ${base.b}Q = ${target.c} + ${base.d}Q → Q* = (${target.a} − ${target.c}) / ${base.b + base.d} = ${App.fmtNum(e1.Q)}. P* = ${target.a} − ${base.b} · ${App.fmtNum(e1.Q)} = ${App.fmtNum(e1.P)} €.` }), nextBtn()));
        }));
    }
    // ── level 7: price ceiling shortage
    function roundCeiling() {
      const p = genInt(), e = eqOf(p), m = App.pick([1, 2, 3]), pc = e.P - m * p.b * p.d;
      if (pc <= p.c) return roundCeiling();
      const qd = (p.a - pc) / p.b, qs = (pc - p.c) / p.d, short = qd - qs;
      const C = chart(100, 1000, "Menge Q (Skipässe/Tag)"); C.draw(p); C.ceiling(p, pc);
      left.replaceChildren(head, progress, C.svg);
      side.replaceChildren(
        h("div", { class: "case" }, h("span", { class: "who", text: "Alpenlift AG · Tagesskipass" }),
          h("p", { text: `Nachfrage: P = ${p.a} − ${p.b}Q · Angebot: P = ${p.c} + ${p.d}Q. Gleichgewicht P* = ${App.fmtNum(e.P)} €. Der Staat setzt einen Höchstpreis von ${App.fmtNum(pc)} €.` })),
        App.numQuestion("Nachfrageüberschuss (Q_D − Q_S) beim Höchstpreis", short, 0.5, "", ok => {
          if (ok) scoreUp(1);
          side.append(h("div", { class: "feedback " + (ok ? "ok" : "no") }, h("b", { text: `Escasez = ${App.fmtNum(short)}` }),
            h("span", { text: `Q_D = (${p.a} − ${App.fmtNum(pc)}) / ${p.b} = ${App.fmtNum(qd)}. Q_S = (${App.fmtNum(pc)} − ${p.c}) / ${p.d} = ${App.fmtNum(qs)}. Solo se venden ${App.fmtNum(qs)}: el precio máximo crea escasez y un Deadweight Loss.` }), nextBtn()));
        }));
    }
    // ── level 8: consumer / producer surplus
    function roundSurplus() {
      const p = genInt(), e = eqOf(p), which = App.pick(["KR", "PR"]);
      const val = which === "KR" ? 0.5 * e.Q * (p.a - e.P) : 0.5 * e.Q * (e.P - p.c);
      const C = chart(100, 1000, "Menge Q (Surfkurse/Woche)"); C.draw(p);
      left.replaceChildren(head, progress, C.svg);
      side.replaceChildren(
        h("div", { class: "case" }, h("span", { class: "who", text: "Markt für Surfkurse in Ericeira" }),
          h("p", { text: `Nachfrage: P = ${p.a} − ${p.b}Q · Angebot: P = ${p.c} + ${p.d}Q.` })),
        App.numQuestion(which === "KR" ? "Konsumentenrente im Gleichgewicht" : "Produzentenrente im Gleichgewicht", val, 0.5, "€", ok => {
          if (ok) scoreUp(1); C.surplus(p);
          side.append(h("div", { class: "feedback " + (ok ? "ok" : "no") }, h("b", { text: `${which === "KR" ? "Konsumentenrente" : "Produzentenrente"} = ${App.fmtNum(val)} €` }),
            h("span", { text: `Primero el equilibrio: Q* = (${p.a} − ${p.c}) / ${p.b + p.d} = ${App.fmtNum(e.Q)}, P* = ${App.fmtNum(e.P)}. ` + (which === "KR" ? `KR = ½ · ${App.fmtNum(e.Q)} · (${p.a} − ${App.fmtNum(e.P)}).` : `PR = ½ · ${App.fmtNum(e.Q)} · (${App.fmtNum(e.P)} − ${p.c}).`) + " Azul = KR, verde = PR." }), nextBtn()));
        }));
    }
    // ── level 9: ski equipment market from Übungsblatt 6
    function roundSki() {
      const Y = App.rnd(20000, 30000, 1000), T = App.pick([5, 7.5, 10, 12.5, 15, 20]);
      const K = 2005 + 0.01 * Y - 7 * T, pstar = (K + 100) / 25, qstar = K - 10 * pstar;
      const p = { a: K / 10, b: 0.1, c: 100 / 15, d: 1 / 15 };
      const C = chart(2200, 260, "Menge Q (Tsd. Skiausrüstungen)"); C.draw(p, false);
      left.replaceChildren(head, progress, C.svg);
      side.replaceChildren(
        h("div", { class: "case" }, h("span", { class: "who", text: "Skiausrüstung im Wintersportgebiet" }),
          h("p", { text: `Q_D = 2.005 − 10p + 0,01Y − 7T, Q_S = −100 + 15p. Einkommen Y = ${App.n0(Y)}, warme Regentage T = ${App.n1(T)}.` })),
        App.numQuestion("Gleichgewichtspreis p*", pstar, 0.05, "€", ok => {
          if (ok) scoreUp(1); C.draw(p, true);
          side.append(h("div", { class: "feedback " + (ok ? "ok" : "no") }, h("b", { text: `p* = ${App.n2(pstar)} €, Q* = ${App.n1(qstar)} Tsd.` }),
            h("span", { text: `Q_D = ${App.n1(K)} − 10p. Gleichsetzen: ${App.n1(K)} − 10p = −100 + 15p → 25p = ${App.n1(K + 100)} → p* = ${App.n2(pstar)}. Mehr warme Tage (T↑) senken die Nachfrage, mehr Einkommen (Y↑) erhöht sie.` }), nextBtn()));
        }));
    }
    function end() {
      progress.firstChild.style.width = "100%";
      const r = pts / maxPts, stars = r >= 1 ? 3 : r >= 0.85 ? 2 : r >= 0.7 ? 1 : 0;
      App.saveScore("market", Math.round(r * 100));
      side.replaceChildren(App.levelResult(bar, stars, `Nivel ${bar.cur}: ${pts}/${maxPts} puntos`, "Necesitas el 70 % para pasar.", start));
    }

    root.append(bar.el, h("div", { class: "split" }, left, h("div", { class: "panel" }, side)));
    start();
    return () => stop();
  }

  App.register({
    id: "market", order: 3, title: "Board-Markt", levelsKey: "market",
    desc: "9 niveles: de leer noticias del sector a calcular equilibrios, precios máximos, rentas y el caso de la Skiausrüstung.",
    intro: "Los niveles 1–5 entrenan la intuición: ¿qué curva mueve cada noticia? Los niveles 6–9 piden cálculos como en la Übung 6: nuevo P*, escasez con un precio máximo, Konsumenten- y Produzentenrente, y el mercado de Skiausrüstung con Y y T. Los números cambian en cada ronda.",
    chapters: ["Kap 7"], sector: ["surf", "snow"],
    art: () => `<svg viewBox="0 0 240 96" aria-hidden="true"><rect width="240" height="96" fill="var(--sky)"/><path d="M60 12v72h130" stroke="var(--ink)" stroke-width="2" fill="none"/><path d="M70 18L180 80" stroke="var(--snow)" stroke-width="4" stroke-linecap="round"/><path d="M70 80L180 18" stroke="var(--sun)" stroke-width="4" stroke-linecap="round"/><path d="M92 18L200 78" stroke="var(--snow)" stroke-width="2.5" stroke-dasharray="5 5" opacity=".7"/><circle cx="125" cy="49" r="6" fill="var(--ink)"/></svg>`,
    mount
  });
})();
