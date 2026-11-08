/* Strand-Duell: find the Nash equilibrium, then play a repeated price game against a rival surf school (Kap 5). */
(function () {
  const { h } = App;
  // payoffs in Tsd. € per season: [you, rival]; H = hoher Preis, N = niedriger Preis
  const PAY = { HH: [5, 5], HN: [1, 7], NH: [7, 1], NN: [3, 3] };
  const STRATS = {
    tft: { name: "Tit-for-Tat", d: "Empieza con precio alto y luego copia tu última jugada.", play: hist => hist.length ? hist[hist.length - 1].you : "H" },
    grim: { name: "Grim Trigger", d: "Precio alto hasta que bajes una vez; después, bajo para siempre.", play: hist => hist.some(r => r.you === "N") ? "N" : "H" },
    always: { name: "Siempre bajo", d: "Juega su estrategia dominante en cada temporada.", play: () => "N" },
    random: { name: "Al azar", d: "Elige alto o bajo con 50 % cada vez.", play: () => (Math.random() < 0.5 ? "H" : "N") }
  };

  function matrix(onCell) {
    const cells = {};
    const m = h("div", { class: "matrix", role: "group", "aria-label": "Auszahlungsmatrix" },
      h("div", { class: "h" }), h("div", { class: "h", html: "Swell Academy<br><b>Hoch</b>" }), h("div", { class: "h", html: "Swell Academy<br><b>Niedrig</b>" }));
    ["H", "N"].forEach(y => {
      m.append(h("div", { class: "h", html: `Salzwasser (tú)<br><b>${y === "H" ? "Hoch" : "Niedrig"}</b>` }));
      ["H", "N"].forEach(r => {
        const k = y + r, p = PAY[k];
        cells[k] = h("button", { class: "cell", type: "button", "aria-label": `Tú ${y === "H" ? "alto" : "bajo"}, rival ${r === "H" ? "alto" : "bajo"}: tú ${p[0]}, rival ${p[1]}`, onclick: onCell ? () => onCell(k) : null },
          h("span", { class: "p1", text: p[0] }), h("span", { class: "p2", text: p[1] }));
        if (!onCell) cells[k].disabled = true;
        m.append(cells[k]);
      });
    });
    return { m, cells };
  }

  function mount(root) {
    const side = h("div", { class: "stack" });
    const left = h("div", { class: "stack" });
    let rounds, hist, strat, you, riv, bonus;

    function phase1() {
      const { m, cells } = matrix(k => {
        Object.values(cells).forEach(c => c.disabled = true);
        const ok = k === "NN";
        cells[k].classList.add(ok ? "right" : "wrong");
        if (!ok) cells.NN.classList.add("right");
        bonus = ok ? 10 : 0;
        const why = {
          HH: "Si el rival pone precio alto, a ti te conviene bajarlo (7 > 5). (Hoch, Hoch) no es estable aunque sea mejor para ambos.",
          HN: "Si el rival baja, a ti también te conviene bajar (3 > 1).",
          NH: "Aquí el rival querría bajar también (3 > 1).",
          NN: "Correcto: bajar es la mejor respuesta a cualquier jugada del rival (estrategia dominante) y lo mismo vale para él."
        }[k];
        side.replaceChildren(h("div", { class: "feedback " + (ok ? "ok" : "no") },
          h("b", { text: ok ? "Nash-Gleichgewicht: (Niedrig, Niedrig) · +10" : "El Nash-Gleichgewicht es (Niedrig, Niedrig)" }),
          h("span", { text: why + " Pero (Hoch, Hoch) da 5 a cada uno: es una Pareto-Verbesserung. Eso es un Gefangenendilemma." }),
          h("div", { class: "row", style: { marginTop: "6px" } }, h("button", { class: "btn surf", type: "button", text: "Jugar temporadas", onclick: phase2 }))));
        if (ok) App.burst(cells[k], "surf");
      });
      left.replaceChildren(h("span", { class: "label", text: "Beneficio por temporada en miles de € · verde = tú · naranja = rival" }), m);
      side.replaceChildren(
        h("div", { class: "case" }, h("span", { class: "who", text: "Ericeira · dos escuelas de surf en la misma playa" }),
          h("p", { text: "Salzwasser Surf Co. (tú) y Swell Academy deciden cada temporada si cobran un precio alto o bajo por sus cursos." })),
        h("span", { class: "label", text: "Paso 1 · Toca la celda que es el Nash-Gleichgewicht" }));
    }

    function phase2() {
      rounds = 8 + Math.floor(Math.random() * 5);
      hist = []; you = 0; riv = 0;
      const keys = Object.keys(STRATS); strat = keys[Math.floor(Math.random() * keys.length)];
      render();
    }
    function render(lastKey) {
      const { m, cells } = matrix(null);
      if (lastKey) { cells[lastKey].classList.add("hit"); }
      const histEl = h("div", { class: "hist", "aria-label": "Historial" }, hist.map((r, i) => h("span", { title: "Temporada " + (i + 1) }, h("i", { class: r.you, text: r.you }), h("i", { class: r.riv, text: r.riv }))));
      const youEl = h("b"), rivEl = h("b");
      left.replaceChildren(
        h("span", { class: "label", text: "Beneficio por temporada en miles de € · verde = tú · naranja = rival" }), m,
        h("div", { class: "kpis" },
          h("div", { class: "kpi" }, h("span", { class: "label", text: "Tu total" }), youEl),
          h("div", { class: "kpi" }, h("span", { class: "label", text: "Rival total" }), rivEl),
          h("div", { class: "kpi" }, h("span", { class: "label", text: "Temporada" }), h("b", { text: String(hist.length + 1) }))),
        h("span", { class: "label", text: "Historial (arriba tú, abajo rival)" }), histEl);
      youEl.dataset.v = hist.length ? you - PAY[lastKey][0] : 0; rivEl.dataset.v = hist.length ? riv - PAY[lastKey][1] : 0;
      App.countTo(youEl, you, v => App.n0(v) + " Tsd. €"); App.countTo(rivEl, riv, v => App.n0(v) + " Tsd. €");
      if (lastKey) { cells[lastKey].classList.add("pop"); }
      if (hist.length >= rounds) return guess();
      side.replaceChildren(
        h("div", { class: "case" }, h("span", { class: "who", text: "Juego repetido" }),
          h("p", { text: "No sabes cuántas temporadas durará. El rival sigue una estrategia fija y desconocida. ¿Cooperas o bajas el precio?" })),
        h("div", { class: "opts two" },
          h("button", { class: "opt", type: "button", text: "Precio alto (Hoch)", onclick: () => play("H") }),
          h("button", { class: "opt", type: "button", text: "Precio bajo (Niedrig)", onclick: () => play("N") })),
        lastKey ? h("p", { style: { color: "var(--muted)" }, text: `Última temporada: tú ${hist[hist.length - 1].you === "H" ? "alto" : "bajo"}, rival ${hist[hist.length - 1].riv === "H" ? "alto" : "bajo"} → +${PAY[lastKey][0]} / +${PAY[lastKey][1]}` }) : null);
    }
    function play(y) {
      const r = STRATS[strat].play(hist);
      hist.push({ you: y, riv: r });
      const k = y + r; you += PAY[k][0]; riv += PAY[k][1];
      render(k);
    }
    function guess() {
      side.replaceChildren(
        h("div", { class: "case" }, h("span", { class: "who", text: `Fin tras ${rounds} temporadas` }), h("p", { text: "¿Qué estrategia seguía Swell Academy?" })),
        h("div", { class: "opts" }, Object.entries(STRATS).map(([k, v]) => h("button", { class: "opt", type: "button", onclick: e => reveal(k, e.currentTarget) }, h("span", { html: `<b>${v.name}</b> · ${v.d}` })))));
    }
    function reveal(k, btn) {
      // a guess also counts if that strategy would have produced exactly the rival's moves
      const same = k !== "random" && strat !== "random" && hist.every((r, j) => STRATS[k].play(hist.slice(0, j)) === r.riv);
      const ok = k === strat || same;
      side.querySelectorAll(".opt").forEach(b => b.disabled = true);
      btn.classList.add(ok ? "right" : "wrong");
      const coop = rounds * PAY.HH[0];
      const score = Math.min(100, Math.round(you / coop * 80) + bonus + (ok ? 10 : 0));
      const rec = App.saveScore("duel", score);
      if (ok) App.burst(btn, "surf");
      side.append(h("div", { class: "feedback " + (ok ? "ok" : "no") },
        h("b", { text: (ok ? (k === strat ? "¡Correcto! " : `Era ${STRATS[strat].name}, pero con tus jugadas se comporta igual: cuenta como acierto. `) : "Era " + STRATS[strat].name + ". ") + `Puntuación ${score}` + (rec ? " · ¡nuevo récord!" : "") }),
        h("span", { text: `Ganaste ${you} Tsd. €; cooperando siempre habríais ganado ${coop} cada uno. Si el final es desconocido, la cooperación puede sostenerse porque desviarse se castiga (Tit-for-Tat, Grim Trigger). Si el final se conoce, la Rückwärtsinduktion lleva a bajar el precio en todas las temporadas.` }),
        h("div", { class: "row", style: { marginTop: "6px" } }, h("button", { class: "btn surf", type: "button", text: "Jugar otra vez", onclick: phase1 }))));
    }

    root.append(h("div", { class: "split" }, h("div", { class: "panel stack" }, left), h("div", { class: "panel" }, side)));
    phase1();
  }

  App.register({
    id: "duel", order: 5, title: "Duelo en la playa",
    desc: "Dos escuelas de surf, una guerra de precios. Encuentra el Nash-Gleichgewicht y adivina la estrategia del rival.",
    intro: "Primero identifica el Nash-Gleichgewicht en la matriz de pagos. Después juega varias temporadas contra una escuela rival con una estrategia oculta y adivina cuál era.",
    chapters: ["Kap 5"], sector: ["surf"],
    art: () => App.art.wave().replace("</svg>", `<g font-family="JetBrains Mono, monospace" font-weight="600" font-size="13"><rect x="64" y="12" width="52" height="30" rx="6" fill="var(--surface)"/><rect x="122" y="12" width="52" height="30" rx="6" fill="var(--surface)"/><rect x="64" y="46" width="52" height="30" rx="6" fill="var(--surface)"/><rect x="122" y="46" width="52" height="30" rx="6" fill="var(--okbg)" stroke="var(--ok)" stroke-width="2"/><text x="90" y="32" text-anchor="middle" fill="var(--ink)">5,5</text><text x="148" y="32" text-anchor="middle" fill="var(--ink)">1,7</text><text x="90" y="66" text-anchor="middle" fill="var(--ink)">7,1</text><text x="148" y="66" text-anchor="middle" fill="var(--ok)">3,3</text></g></svg>`),
    mount
  });
})();
