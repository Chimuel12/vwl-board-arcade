/* Actualidad: 20 new questions per day from real surf, snowboard and tech news (written by a daily cloud routine).
   Data: js/data/news/index.js (manifest) + js/data/news/YYYY-MM-DD.js. Uses the shared App.quizRunner. */
(function () {
  const { h } = App;

  function mount(root) {
    const view = h("div", { class: "stack" });
    const R = App.quizRunner(view);
    const topics = new Set(App.store.get("newsTopics", Object.keys(App.TOPICS)));
    const best = () => App.store.get("newsBest", {});

    function chipRow() {
      const row = h("div", { class: "chips" });
      const render = () => row.replaceChildren(...Object.entries(App.TOPICS).map(([k, t]) =>
        h("button", { class: "chip", type: "button", "aria-pressed": topics.has(k), text: t, onclick: () => { topics.has(k) ? topics.delete(k) : topics.add(k); App.store.set("newsTopics", [...topics]); render(); } })));
      render();
      return row;
    }
    function home() {
      const days = App.newsDays(), b = best(), latest = days[0];
      view.replaceChildren(
        h("div", { class: "panel stack" },
          h("div", { class: "row between" },
            h("h3", { text: latest ? `Última actualización: ${App.fmtDay(latest.d)}` : "Actualidad" }),
            h("span", { class: "label", text: "20 preguntas nuevas cada día" })),
          h("p", { style: { color: "var(--muted)" }, text: "Cada mañana una tarea en la nube busca noticias reales de surf, snowboard y tecnología y las convierte en preguntas de los capítulos 1–9, del nivel 1 al 9. Cada pregunta enlaza su fuente. También se mezclan en los niveles del Wave Quiz." }),
          h("div", { class: "row" }, h("span", { class: "label", text: "Temas" }), chipRow(),
            h("button", { class: "btn", type: "button", text: "Mezcla de los últimos 7 días", disabled: !days.length, onclick: playMix }))),
        h("div", { class: "newslist" }, days.length ? days.map(x =>
          h("div", { class: "newsday" },
            h("div", { class: "stack", style: { gap: "3px", minWidth: "0" } },
              h("span", { class: "label", text: `${App.fmtDay(x.d)} · ${x.n} preguntas` + (b[x.d] != null ? ` · tu mejor: ${b[x.d]} %` : "") }),
              h("b", { text: x.title })),
            h("button", { class: "btn surf", type: "button", text: "Jugar", onclick: () => playDay(x.d) })))
          : [h("div", { class: "empty", text: "Todavía no hay preguntas de actualidad. La primera tanda llega con la próxima ejecución de la tarea diaria." })]));
    }
    async function playDay(d) {
      const items = (await App.loadNewsDay(d)).filter(q => topics.has(q.t));
      R.run(items, {
        count: items.length, sortByLevel: true, tag: `Actualidad ${App.fmtDay(d)}`, subtitle: "Ordenadas de nivel 1 a 9", backLabel: "← Actualidad", onBack: home,
        onEnd: ({ pct }) => {
          const bb = best();
          if (bb[d] == null || pct > bb[d]) { bb[d] = pct; App.store.set("newsBest", bb); }
          App.saveScore("news", pct);
          return { label: `Actualidad · ${App.fmtDay(d)}`, burst: pct >= 70 ? "surf" : null,
            actions: [h("button", { class: "btn surf", type: "button", text: "Repetir", onclick: () => playDay(d) }), h("button", { class: "btn alt", type: "button", text: "Volver", onclick: home })] };
        }
      });
    }
    async function playMix() {
      const loaded = await Promise.all(App.newsDays().slice(0, 7).map(x => App.loadNewsDay(x.d)));
      const pool = loaded.flat().filter(q => topics.has(q.t));
      R.run(pool, {
        count: 10, tag: "Mezcla reciente", backLabel: "← Actualidad", onBack: home,
        onEnd: ({ pct }) => {
          App.saveScore("news", pct);
          return { label: "Mezcla de los últimos 7 días", actions: [h("button", { class: "btn surf", type: "button", text: "Otra mezcla", onclick: playMix }), h("button", { class: "btn alt", type: "button", text: "Volver", onclick: home })] };
        }
      });
    }

    root.append(view);
    home();
    return () => R.destroy();
  }

  App.register({
    id: "news", order: 2.5, title: "Actualidad",
    desc: "20 preguntas nuevas cada día a partir de noticias reales de surf, snowboard y tecnología, con su fuente.",
    intro: "Noticias reales del sector aplicadas al temario: precios de forfaits, parques de olas, ofertas de compra, aranceles, chips de IA… Cada día llegan 20 preguntas nuevas de los niveles 1 a 9, y cada una enlaza la noticia original.",
    chapters: ["Kap 1–9"], sector: ["surf", "snow", "tech"],
    art: () => `<svg viewBox="0 0 240 96" aria-hidden="true"><rect width="240" height="96" fill="var(--sky)"/><path d="M0 96L46 44l22 20 26-30 34 62z" fill="var(--rock)"/><path d="M46 44l8 10-6-2-6 5z" fill="var(--peak)"/><path d="M120 72c20-10 40-10 60 0s40 10 60 0v24H120z" fill="var(--sea2)"/><g transform="translate(78 16)"><rect width="84" height="60" rx="6" fill="var(--surface)" stroke="var(--line)"/><rect x="8" y="8" width="44" height="8" rx="2" fill="var(--ink)"/><rect x="8" y="22" width="68" height="4" rx="2" fill="var(--line)"/><rect x="8" y="30" width="68" height="4" rx="2" fill="var(--line)"/><rect x="8" y="38" width="50" height="4" rx="2" fill="var(--line)"/><circle cx="68" cy="12" r="9" fill="var(--sun)"/><text x="68" y="16" text-anchor="middle" font-family="Unbounded, sans-serif" font-size="9" font-weight="700" fill="#fff">20</text></g></svg>`,
    mount
  });
})();
