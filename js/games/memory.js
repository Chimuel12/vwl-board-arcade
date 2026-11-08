/* Memory: Begriff ↔ Erklärung, all 247 pairs. 9 levels (more pairs, hidden cards, fewer errors allowed) + free mode. */
(function () {
  const { h } = App;
  const PAIRS = [];
  window.CH.forEach(c => c.p.forEach((x, i) => PAIRS.push({ id: c.n + "-" + i, ch: c.n, term: x[0], def: x[1] })));
  const BY = Object.fromEntries(PAIRS.map(p => [p.id, p]));
  const ALL = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  const LEVELS = [
    { name: "Calentamiento", desc: "4 parejas abiertas (modo Relacionar) de Kap 1–3. Máximo 2 errores.", chs: [1, 2, 3], size: 4, mode: "match", maxErr: 2 },
    { name: "Primeras olas", desc: "6 parejas abiertas de Kap 1–5. Máximo 2 errores.", chs: [1, 2, 3, 4, 5], size: 6, mode: "match", maxErr: 2 },
    { name: "Boca abajo", desc: "6 parejas tapadas (modo Memory) de Kap 1–3. Máximo 3 errores de memoria.", chs: [1, 2, 3], size: 6, mode: "memory", maxErr: 3 },
    { name: "Hogares y juegos", desc: "8 parejas tapadas de Kap 4–5. Máximo 3 errores.", chs: [4, 5], size: 8, mode: "memory", maxErr: 3 },
    { name: "Empresas y mercados", desc: "8 parejas tapadas de Kap 6–7. Máximo 3 errores.", chs: [6, 7], size: 8, mode: "memory", maxErr: 3 },
    { name: "Fallos y macro", desc: "8 parejas tapadas de Kap 8–9. Máximo 3 errores.", chs: [8, 9], size: 8, mode: "memory", maxErr: 3 },
    { name: "Mezcla total", desc: "10 parejas tapadas de todo el script. Máximo 3 errores.", chs: ALL, size: 10, mode: "memory", maxErr: 3 },
    { name: "Un solo capítulo", desc: "10 parejas de UN capítulo al azar: conceptos parecidos entre sí. Máximo 2 errores.", chs: "one", size: 10, mode: "memory", maxErr: 2 },
    { name: "Cumbre", desc: "12 parejas tapadas de todo el script. Máximo 2 errores.", chs: ALL, size: 12, mode: "memory", maxErr: 2 }
  ];

  const backArt = ch => (ch % 2 ? App.art.wave() : App.art.peak()).replace("</svg>",
    `<rect x="94" y="34" width="52" height="28" rx="6" fill="var(--surface)" opacity=".9"/><text x="120" y="53" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="14" font-weight="600" fill="var(--ink)">K${ch}</text></svg>`);

  function mount(root) {
    let mastery = App.store.get("mastery", {});
    const prefs = App.store.get("memoryPrefs", {});
    const S = {
      play: prefs.play || "levels",
      chs: new Set(prefs.chs && prefs.chs.length ? prefs.chs : ALL),
      mode: prefs.mode || "memory", size: prefs.size || 8,
      cfg: null, deck: [], open: [], sel: null, seen: new Set(), pending: null, moves: 0, errors: 0, matched: 0, err: new Set(), log: []
    };
    const savePrefs = () => App.store.set("memoryPrefs", { play: S.play, chs: [...S.chs], mode: S.mode, size: S.size });

    const playSeg = h("div", { class: "seg" });
    const freePanel = h("div", { class: "panel stack" });
    const chips = h("div", { class: "chips" });
    const modeSeg = h("div", { class: "seg" });
    const sizeSeg = h("div", { class: "seg" });
    const board = h("div", { class: "mboard" });
    const log = h("div", { class: "mlog" });
    const stat = h("div", { class: "row label", "aria-live": "polite" });
    const hint = h("p", { style: { color: "var(--muted)" } });
    const bar = App.levelBar("memory", LEVELS, () => newRound());

    function renderPlay() {
      playSeg.replaceChildren(...[["levels", "Niveles"], ["free", "Libre"]].map(([v, t]) =>
        h("button", { type: "button", "aria-pressed": S.play === v, text: t, onclick: () => { S.play = v; savePrefs(); renderPlay(); newRound(); } })));
      bar.el.hidden = S.play !== "levels";
      freePanel.hidden = S.play !== "free";
    }
    function renderChips() {
      chips.replaceChildren(...window.CH.map(c => {
        const done = c.p.filter((_, i) => (mastery[c.n + "-" + i] || {}).s >= 2).length;
        return h("button", { class: "chip", type: "button", "aria-pressed": S.chs.has(c.n), title: c.t,
          onclick: () => { S.chs.has(c.n) ? S.chs.delete(c.n) : S.chs.add(c.n); savePrefs(); renderChips(); }, text: "K" + c.n + " · " + done + "/" + c.p.length });
      }));
    }
    function renderSegs() {
      modeSeg.replaceChildren(...[["memory", "Memory"], ["match", "Relacionar"]].map(([v, t]) =>
        h("button", { type: "button", "aria-pressed": S.mode === v, text: t, onclick: () => { S.mode = v; savePrefs(); renderSegs(); newRound(); } })));
      sizeSeg.replaceChildren(...[6, 8, 10, 12].map(v =>
        h("button", { type: "button", "aria-pressed": S.size === v, text: v, onclick: () => { S.size = v; savePrefs(); renderSegs(); newRound(); } })));
    }
    function renderStat() {
      const lim = S.cfg && S.cfg.maxErr != null ? ` (máx. ${S.cfg.maxErr})` : "";
      stat.textContent = `Jugadas ${S.moves} · Errores ${S.errors}${lim} · Parejas ${S.matched}/${S.deck.length / 2}`;
    }

    function newRound() {
      clearTimeout(S.pending); S.pending = null;
      if (S.play === "levels") {
        const L = LEVELS[bar.cur - 1];
        S.cfg = { ...L, chs: L.chs === "one" ? [App.pick(ALL)] : L.chs };
      } else S.cfg = { chs: [...S.chs], size: S.size, mode: S.mode, maxErr: null };
      const cfg = S.cfg, chs = new Set(cfg.chs);
      hint.textContent = (cfg.mode === "memory"
        ? "Gira dos cartas: un Begriff (borde naranja) y su Erklärung (borde azul). Si no coinciden, se tapan de nuevo. Un error de memoria cuenta cuando ya habías visto la pareja correcta."
        : "Todas las cartas están abiertas: toca un Begriff y luego su Erklärung.") + (cfg.chs.length === 1 && S.play === "levels" ? ` Capítulo de esta ronda: K${cfg.chs[0]}.` : "");
      const pool = PAIRS.filter(p => chs.has(p.ch)).map(p => ({ p, k: (mastery[p.id] ? mastery[p.id].s : -1) + Math.random() * 0.95 }));
      pool.sort((a, b) => a.k - b.k);
      const pairs = pool.slice(0, cfg.size).map(x => x.p);
      S.deck = App.shuffle(pairs.flatMap(p => [{ pid: p.id, kind: "term" }, { pid: p.id, kind: "def" }])).map((c, i) => ({ ...c, i, up: cfg.mode === "match", done: false }));
      Object.assign(S, { open: [], sel: null, seen: new Set(), moves: 0, errors: 0, matched: 0, err: new Set(), log: [] });
      board.replaceChildren();
      if (!S.deck.length) board.append(h("div", { class: "empty", style: { gridColumn: "1/-1" }, text: "Elige al menos un capítulo." }));
      S.deck.forEach(c => {
        const p = BY[c.pid];
        board.append(h("button", { class: "mcard", type: "button", id: "mc" + c.i, onclick: () => click(c.i) },
          h("div", { class: "in" },
            h("div", { class: "fc bk", html: backArt(p.ch) }),
            h("div", { class: "fc ft " + c.kind },
              h("div", { class: "lb" }, h("span", { text: (c.kind === "term" ? "Begriff" : "Erklärung") + " · K" + p.ch })),
              h("div", { class: "tx", text: c.kind === "term" ? p.term : p.def })))));
      });
      sync(); renderLog(); renderStat();
    }
    function sync() {
      S.deck.forEach(c => {
        const e = document.getElementById("mc" + c.i); if (!e) return;
        const p = BY[c.pid];
        e.classList.toggle("up", c.up || c.done);
        e.classList.toggle("done", c.done);
        e.classList.toggle("sel", S.sel === c.i);
        e.setAttribute("aria-label", c.up || c.done ? (c.kind === "term" ? "Begriff: " + p.term : "Erklärung: " + p.def) : "Carta tapada, capítulo " + p.ch);
      });
    }
    function flipBack() {
      clearTimeout(S.pending); S.pending = null;
      S.open.forEach(i => { S.deck[i].up = false; S.seen.add(i); document.getElementById("mc" + i)?.classList.remove("wrong"); });
      S.open = []; sync();
    }
    function click(i) {
      const c = S.deck[i]; if (!c || c.done) return;
      if (S.cfg.mode === "memory") {
        if (S.pending) flipBack();
        if (c.up) return;
        c.up = true; S.open.push(i); sync();
        if (S.open.length < 2) return;
        S.moves++;
        const [a, b] = S.open.map(k => S.deck[k]);
        if (a.pid === b.pid) { S.open.forEach(k => S.seen.add(k)); S.open = []; match(a.pid, i); }
        else {
          const partner = S.deck.find(x => x.pid === a.pid && x.i !== a.i);
          if (S.seen.has(partner.i)) { S.errors++; S.err.add(a.pid); }
          S.open.forEach(k => document.getElementById("mc" + k)?.classList.add("wrong"));
          S.pending = setTimeout(flipBack, 1300);
        }
      } else {
        if (S.sel === null || S.sel === i || S.deck[S.sel].kind === c.kind) { S.sel = S.sel === i ? null : i; sync(); return; }
        const a = S.deck[S.sel]; S.moves++;
        if (a.pid === c.pid) { S.sel = null; match(c.pid, i); }
        else {
          S.errors++; S.err.add(a.pid);
          [S.sel, i].forEach(k => { const e = document.getElementById("mc" + k); e.classList.remove("shake"); void e.offsetWidth; e.classList.add("shake"); });
          S.sel = null; sync();
        }
      }
      renderStat();
    }
    function match(pid, i) {
      S.deck.forEach(x => { if (x.pid === pid) { x.done = true; x.up = true; } });
      S.matched++;
      const r = mastery[pid] || { s: 0, n: 0 };
      const bad = S.err.has(pid);
      r.n++; r.s = bad ? 0 : Math.min(3, r.s + 1); mastery[pid] = r;
      App.store.set("mastery", mastery);
      S.log.unshift({ pid, bad });
      sync(); renderLog(); renderChips(); renderStat();
      App.burst(document.getElementById("mc" + i), BY[pid].ch % 2 ? "surf" : "snow", 18);
      if (S.matched === S.deck.length / 2) finish();
    }
    function renderLog() {
      log.replaceChildren();
      if (!S.log.length) { log.append(h("div", { class: "empty", text: "Cada pareja encontrada aparece aquí con el texto completo para repasarla." })); return; }
      S.log.forEach(x => { const p = BY[x.pid]; log.append(h("div", { class: "e" }, h("div", { class: "row between" }, h("b", { text: p.term }), h("span", { class: "label", text: "K" + p.ch + (x.bad ? " · repasar" : ""), style: x.bad ? { color: "var(--bad)" } : null })), h("p", { text: p.def }))); });
    }
    function finish() {
      const n = S.deck.length / 2;
      if (S.play === "levels") {
        const m = S.cfg.maxErr;
        const stars = S.errors === 0 ? 3 : S.errors <= Math.floor(m / 2) ? 2 : S.errors <= m ? 1 : 0;
        App.saveScore("memory", Math.max(10, 100 - S.errors * 10));
        board.prepend(App.levelResult(bar, stars, `Nivel ${bar.cur}: ${S.errors} errores`, `${n} parejas en ${S.moves} jugadas.`, newRound));
        return;
      }
      const score = Math.max(10, 100 - S.errors * 10);
      const rec = App.saveScore("memory", score);
      board.prepend(h("div", { class: "feedback ok", style: { gridColumn: "1/-1" } },
        h("b", { text: "Ronda completada · " + score + " puntos" + (rec ? " · ¡nuevo récord!" : "") }),
        h("span", { text: `${n} parejas en ${S.moves} jugadas, ${S.errors} errores de memoria. Las parejas falladas vuelven antes.` }),
        h("div", { class: "row", style: { marginTop: "6px" } }, h("button", { class: "btn surf", type: "button", text: "Siguiente ronda", onclick: newRound }))));
    }

    freePanel.append(
      h("div", { class: "row between" }, h("span", { class: "label", text: "Capítulos" }),
        h("div", { class: "row" },
          h("button", { class: "chip", type: "button", text: "Todos", onclick: () => { S.chs = new Set(ALL); savePrefs(); renderChips(); } }),
          h("button", { class: "chip", type: "button", text: "Ninguno", onclick: () => { S.chs = new Set(); savePrefs(); renderChips(); } }))),
      chips,
      h("div", { class: "row" }, h("span", { class: "label", text: "Modo" }), modeSeg, h("span", { class: "label", text: "Parejas" }), sizeSeg,
        h("button", { class: "btn", type: "button", text: "Nueva ronda", onclick: newRound })));
    root.append(
      h("div", { class: "row" }, h("span", { class: "label", text: "Cómo jugar" }), playSeg),
      bar.el, freePanel,
      h("div", { class: "split" },
        h("div", { class: "stack" }, hint, stat, board),
        h("div", { class: "panel stack" }, h("span", { class: "label", text: "Encontradas en esta ronda" }), log)));
    renderChips(); renderSegs(); renderPlay(); newRound();
    return () => clearTimeout(S.pending);
  }

  App.register({
    id: "memory", order: 1, title: "Memory de conceptos", levelsKey: "memory",
    desc: "Las 247 parejas Begriff–Erklärung del script en 9 niveles: más parejas, cartas tapadas y menos errores permitidos.",
    intro: "Encuentra cada Begriff con su Erklärung. En el modo Niveles cada nivel tiene más parejas y permite menos errores. En el modo Libre eliges capítulos y tamaño. Cada ronda prioriza los conceptos que aún no has visto o que fallaste.",
    chapters: ["Kap 1–9"], sector: ["surf", "snow"], art: () => App.art.wave().replace("</svg>", `<g transform="translate(70 24)"><rect width="44" height="54" rx="6" fill="var(--surface)" stroke="var(--line)"/><rect x="56" y="-6" width="44" height="54" rx="6" fill="var(--snow)" transform="rotate(8 78 21)"/><text x="22" y="33" text-anchor="middle" font-size="18" font-weight="700" fill="var(--sun)">?</text></g></svg>`),
    mount
  });
})();
