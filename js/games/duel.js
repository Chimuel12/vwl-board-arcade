/* Duelo en la playa (Kap 5): 9 levels. 1–8 are generated payoff-matrix puzzles
   (Nash equilibria, Pareto efficiency, backward induction), 9 is the repeated price game vs. a hidden strategy. */
(function () {
  const { h } = App;
  const PUZZLES = 6, PASS = 4;
  const LEVELS = [
    { name: "Dilema de precios", desc: "Matrices tipo Gefangenendilemma entre dos escuelas. Marca el Nash-Gleichgewicht. 6 matrices, pasa con 4.", kind: "ne", r: 2, c: 2, pd: true },
    { name: "Nash 2×2", desc: "Matrices 2×2 al azar: marca TODOS los Nash-Gleichgewichte (puede haber 0, 1 o 2).", kind: "ne", r: 2, c: 2 },
    { name: "Nash 2×3", desc: "La escuela rival tiene tres precios. Marca todos los NE.", kind: "ne", r: 2, c: 3 },
    { name: "Nash 3×3", desc: "Tres opciones por jugador. Marca todos los NE.", kind: "ne", r: 3, c: 3 },
    { name: "Pareto 2×2", desc: "Marca todas las celdas Pareto-effizient (ninguna otra mejora a uno sin empeorar al otro).", kind: "pareto", r: 2, c: 2 },
    { name: "Pareto 3×3", desc: "Lo mismo en 3×3.", kind: "pareto", r: 3, c: 3 },
    { name: "Secuencial 2×2", desc: "Salzwasser decide primero y la rival lo ve. Marca el resultado por Rückwärtsinduktion.", kind: "seq", r: 2, c: 2 },
    { name: "Secuencial 3×3", desc: "Tres opciones cada uno, juego secuencial. Marca el resultado.", kind: "seq", r: 3, c: 3 },
    { name: "Temporadas", desc: "Juego repetido contra una estrategia oculta. Pasa si adivinas la estrategia y ganas al menos el 60 % de lo que daría cooperar siempre.", kind: "repeated" }
  ];
  const ROWS = ["Hoch", "Mittel", "Niedrig"], COLS = ["Hoch", "Mittel", "Niedrig"];
  const rowName = (r, i) => r === 2 ? ["Hoch", "Niedrig"][i] : ROWS[i];
  const colName = (c, j) => c === 2 ? ["Hoch", "Niedrig"][j] : COLS[j];

  // payoffs M[i][j] = [p1, p2]
  function gen(L) {
    if (L.pd) { const S = App.rnd(0, 2), P = S + App.rnd(1, 2), R = P + App.rnd(1, 3), T = R + App.rnd(1, 3); return [[[R, R], [S, T]], [[T, S], [P, P]]]; }
    for (;;) {
      const M = Array.from({ length: L.r }, () => Array.from({ length: L.c }, () => [App.rnd(0, 9), App.rnd(0, 9)]));
      if (L.kind === "seq") { // distinct responses so the answer is unique
        const okRows = M.every(row => new Set(row.map(x => x[1])).size === row.length);
        if (!okRows) continue;
        const resp = M.map(row => row.reduce((b, x, j) => (x[1] > row[b][1] ? j : b), 0));
        const vals = resp.map((j, i) => M[i][j][0]);
        if (new Set(vals).size !== vals.length) continue;
      }
      return M;
    }
  }
  const nash = M => { const out = []; M.forEach((row, i) => row.forEach((x, j) => { const best1 = Math.max(...M.map(r => r[j][0])), best2 = Math.max(...row.map(y => y[1])); if (x[0] === best1 && x[1] === best2) out.push(i + "," + j); })); return out; };
  const pareto = M => { const cells = M.flatMap((row, i) => row.map((x, j) => ({ k: i + "," + j, x }))); return cells.filter(a => !cells.some(b => b.x[0] >= a.x[0] && b.x[1] >= a.x[1] && (b.x[0] > a.x[0] || b.x[1] > a.x[1]))).map(a => a.k); };
  const seq = M => { const resp = M.map(row => row.reduce((b, x, j) => (x[1] > row[b][1] ? j : b), 0)); const i = resp.reduce((b, j, r) => (M[r][j][0] > M[b][resp[b]][0] ? r : b), 0); return { cell: i + "," + resp[i], resp }; };

  function matrixEl(M, sel, onToggle) {
    const r = M.length, c = M[0].length;
    const m = h("div", { class: "matrix", style: { gridTemplateColumns: `auto repeat(${c}, minmax(0,1fr))` }, role: "group", "aria-label": "Auszahlungsmatrix" }, h("div", { class: "h" }),
      Array.from({ length: c }, (_, j) => h("div", { class: "h", html: `Rival<br><b>${colName(c, j)}</b>` })));
    const cells = {};
    M.forEach((row, i) => {
      m.append(h("div", { class: "h", html: `Tú<br><b>${rowName(r, i)}</b>` }));
      row.forEach((x, j) => {
        const k = i + "," + j;
        cells[k] = h("button", { class: "cell" + (sel.has(k) ? " hit" : ""), type: "button", "aria-pressed": sel.has(k), "aria-label": `Tú ${rowName(r, i)}, rival ${colName(c, j)}: ${x[0]} y ${x[1]}`, onclick: () => onToggle(k) },
          h("span", { class: "p1", text: x[0] }), h("span", { class: "p2", text: x[1] }));
        m.append(cells[k]);
      });
    });
    return { m, cells };
  }

  // repeated game (level 9)
  const PAY = { HH: [5, 5], HN: [1, 7], NH: [7, 1], NN: [3, 3] };
  const STRATS = {
    tft: { name: "Tit-for-Tat", d: "Empieza alto y luego copia tu última jugada.", play: hs => hs.length ? hs[hs.length - 1].you : "H" },
    grim: { name: "Grim Trigger", d: "Alto hasta que bajes una vez; después, bajo para siempre.", play: hs => hs.some(r => r.you === "N") ? "N" : "H" },
    always: { name: "Siempre bajo", d: "Juega su estrategia dominante siempre.", play: () => "N" },
    random: { name: "Al azar", d: "Alto o bajo con 50 % cada vez.", play: () => (Math.random() < 0.5 ? "H" : "N") }
  };

  function mount(root) {
    const left = h("div", { class: "stack" }), side = h("div", { class: "stack" });
    const bar = App.levelBar("duel", LEVELS, () => start());
    let L, n, right, M, sel;

    function start() { L = LEVELS[bar.cur - 1]; n = 0; right = 0; L.kind === "repeated" ? repeated() : puzzle(); }
    function puzzle() {
      M = gen(L); sel = new Set();
      const single = L.kind === "seq";
      const draw = () => {
        const { m } = matrixEl(M, sel, k => { if (single) sel = new Set(sel.has(k) ? [] : [k]); else sel.has(k) ? sel.delete(k) : sel.add(k); draw(); });
        left.replaceChildren(h("div", { class: "row between label" }, h("span", { text: `Matriz ${n + 1} / ${PUZZLES}` }), h("span", { text: `Aciertos ${right}` })),
          h("span", { class: "label", text: "Verde = tu pago (Salzwasser) · naranja = pago de Swell Academy" }), m);
      };
      draw();
      const task = { ne: "Marca todos los Nash-Gleichgewichte. Si no hay ninguno, no marques nada.", pareto: "Marca todas las celdas Pareto-effizient.", seq: "Tú decides primero, la rival ve tu jugada y responde. Marca el resultado del juego." }[L.kind];
      side.replaceChildren(
        h("div", { class: "case" }, h("span", { class: "who", text: `Nivel ${bar.cur} · ${L.name}` }), h("p", { text: task })),
        h("div", { class: "row" }, h("button", { class: "btn surf", type: "button", text: "Comprobar", onclick: check })));
    }
    function check() {
      const truth = L.kind === "ne" ? nash(M) : L.kind === "pareto" ? pareto(M) : [seq(M).cell];
      const ok = truth.length === sel.size && truth.every(k => sel.has(k));
      if (ok) right++;
      const { m, cells } = matrixEl(M, new Set(), () => {});
      Object.entries(cells).forEach(([k, el]) => { el.disabled = true; if (truth.includes(k)) el.classList.add("right"); else if (sel.has(k)) el.classList.add("wrong"); });
      left.lastChild.replaceWith(m);
      left.firstChild.lastChild.textContent = `Aciertos ${right}`;
      if (ok) App.burst(cells[truth[0]] || side, "surf");
      let why = "";
      if (L.kind === "ne") why = truth.length ? `NE: ${truth.map(k => { const [i, j] = k.split(","); return `(${rowName(M.length, i)}, ${colName(M[0].length, j)})`; }).join(", ")}. En cada uno, ninguno gana desviándose: tu pago es el máximo de su columna y el de la rival el máximo de su fila.` : "No hay ningún Nash-Gleichgewicht en estrategias puras: en cada celda alguien querría cambiar.";
      if (L.kind === "pareto") why = `Una celda está Pareto-dominada si otra da a ambos al menos lo mismo y a uno más. Quedan ${truth.length} celdas eficientes. Ojo: el NE no tiene por qué ser una de ellas.`;
      if (L.kind === "seq") { const { resp } = seq(M); why = "Rückwärtsinduktion: " + resp.map((j, i) => `si eliges ${rowName(M.length, i)}, la rival responde ${colName(M[0].length, j)} (te da ${M[i][j][0]})`).join("; ") + ". Eliges la fila con tu mejor pago."; }
      const last = n === PUZZLES - 1;
      side.replaceChildren(h("div", { class: "feedback " + (ok ? "ok" : "no") }, h("b", { text: ok ? "¡Correcto!" : "No exactamente" }), h("span", { text: why }),
        h("div", { class: "row", style: { marginTop: "6px" } }, h("button", { class: "btn surf", type: "button", text: last ? "Ver resultado" : "Siguiente matriz", onclick: () => { n++; last ? endPuzzles() : puzzle(); } }))));
    }
    function endPuzzles() {
      const stars = right >= 6 ? 3 : right >= 5 ? 2 : right >= PASS ? 1 : 0;
      App.saveScore("duel", Math.round(right / PUZZLES * 100));
      side.replaceChildren(App.levelResult(bar, stars, `Nivel ${bar.cur}: ${right}/${PUZZLES} matrices`, `Necesitas ${PASS} de ${PUZZLES}.`, start));
    }

    // ── level 9: repeated game
    let rounds, hist, strat, you, riv;
    function repeated() {
      rounds = 8 + Math.floor(Math.random() * 5); hist = []; you = 0; riv = 0;
      const keys = Object.keys(STRATS); strat = keys[Math.floor(Math.random() * keys.length)];
      render();
    }
    function render(lastKey) {
      const M2 = [[PAY.HH, PAY.HN], [PAY.NH, PAY.NN]];
      const { m, cells } = matrixEl(M2, new Set(), () => {});
      Object.values(cells).forEach(c => c.disabled = true);
      if (lastKey) { const k = (lastKey[0] === "H" ? 0 : 1) + "," + (lastKey[1] === "H" ? 0 : 1); cells[k].classList.add("hit", "pop"); }
      left.replaceChildren(h("span", { class: "label", text: "Beneficio por temporada en miles de €" }), m,
        h("div", { class: "kpis" }, h("div", { class: "kpi" }, h("span", { class: "label", text: "Tu total" }), h("b", { text: you + " Tsd. €" })), h("div", { class: "kpi" }, h("span", { class: "label", text: "Rival" }), h("b", { text: riv + " Tsd. €" })), h("div", { class: "kpi" }, h("span", { class: "label", text: "Temporada" }), h("b", { text: String(hist.length + 1) }))),
        h("div", { class: "hist" }, hist.map(r => h("span", {}, h("i", { class: r.you, text: r.you }), h("i", { class: r.riv, text: r.riv })))));
      if (hist.length >= rounds) return guess();
      side.replaceChildren(h("div", { class: "case" }, h("span", { class: "who", text: "Juego repetido" }), h("p", { text: "No sabes cuántas temporadas durará. La rival sigue una estrategia fija y oculta." })),
        h("div", { class: "opts two" }, h("button", { class: "opt", type: "button", text: "Precio alto (H)", onclick: () => play("H") }), h("button", { class: "opt", type: "button", text: "Precio bajo (N)", onclick: () => play("N") })));
    }
    function play(y) { const r = STRATS[strat].play(hist); hist.push({ you: y, riv: r }); you += PAY[y + r][0]; riv += PAY[y + r][1]; render(y + r); }
    function guess() {
      side.replaceChildren(h("div", { class: "case" }, h("span", { class: "who", text: `Fin tras ${rounds} temporadas` }), h("p", { text: "¿Qué estrategia seguía la rival?" })),
        h("div", { class: "opts" }, Object.entries(STRATS).map(([k, v]) => h("button", { class: "opt", type: "button", onclick: e => reveal(k, e.currentTarget) }, h("span", { html: `<b>${v.name}</b> · ${v.d}` })))));
    }
    function reveal(k, btn) {
      const same = k !== "random" && strat !== "random" && hist.every((r, j) => STRATS[k].play(hist.slice(0, j)) === r.riv);
      const ok = k === strat || same;
      side.querySelectorAll(".opt").forEach(b => b.disabled = true);
      btn.classList.add(ok ? "right" : "wrong");
      const coop = rounds * 5, share = you / coop;
      const stars = !ok || share < 0.6 ? 0 : share >= 0.95 ? 3 : share >= 0.8 ? 2 : 1;
      App.saveScore("duel", Math.min(100, Math.round(share * 80) + (ok ? 20 : 0)));
      side.append(h("p", { class: "hintbox", text: `Era ${STRATS[strat].name}${same && k !== strat ? " (con tus jugadas se comporta igual que tu respuesta)" : ""}. Ganaste ${you} Tsd. € de ${coop} posibles cooperando siempre (${Math.round(share * 100)} %). Con final desconocido, cooperar puede sostenerse porque desviarse se castiga.` }),
        App.levelResult(bar, stars, `Nivel 9: ${ok ? "estrategia correcta" : "estrategia incorrecta"}`, "", start));
    }

    root.append(bar.el, h("div", { class: "split" }, h("div", { class: "panel stack" }, left), h("div", { class: "panel" }, side)));
    start();
  }

  App.register({
    id: "duel", order: 5, title: "Duelo en la playa", levelsKey: "duel",
    desc: "9 niveles de teoría de juegos con matrices al azar: Nash, Pareto, Rückwärtsinduktion y un juego repetido contra una estrategia oculta.",
    intro: "Dos escuelas de surf compiten en precios. Los niveles 1–8 generan matrices nuevas en cada partida: marca Nash-Gleichgewichte (2×2 hasta 3×3), celdas Pareto-effizient y resultados de juegos secuenciales. El nivel 9 es un juego repetido en el que tienes que adivinar la estrategia de la rival.",
    chapters: ["Kap 5"], sector: ["surf"],
    art: () => App.art.wave().replace("</svg>", `<g font-family="JetBrains Mono, monospace" font-weight="600" font-size="13"><rect x="64" y="12" width="52" height="30" rx="6" fill="var(--surface)"/><rect x="122" y="12" width="52" height="30" rx="6" fill="var(--surface)"/><rect x="64" y="46" width="52" height="30" rx="6" fill="var(--surface)"/><rect x="122" y="46" width="52" height="30" rx="6" fill="var(--okbg)" stroke="var(--ok)" stroke-width="2"/><text x="90" y="32" text-anchor="middle" fill="var(--ink)">5,5</text><text x="148" y="32" text-anchor="middle" fill="var(--ink)">1,7</text><text x="90" y="66" text-anchor="middle" fill="var(--ink)">7,1</text><text x="148" y="66" text-anchor="middle" fill="var(--ok)">3,3</text></g></svg>`),
    mount
  });
})();
