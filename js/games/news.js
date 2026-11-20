/* Actualidad: 20 new questions per day from real surf, snowboard and tech news (written by a daily cloud routine).
   Data: js/data/news/index.js (manifest) + js/data/news/YYYY-MM-DD.js. Uses the shared App.quizRunner. */
(function () {
  const { h } = App;

  function mount(root, arg) {
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
      const days = App.newsDays(), b = best();
      view.replaceChildren(
        h("div", { class: "row between" }, chipRow(),
          h("button", { class: "btn surf", type: "button", text: "Mezcla 7 días", disabled: !days.length, onclick: playMix })),
        h("section", { class: "panel list", "aria-label": "Días" }, days.length ? days.map(x =>
          h("button", { class: "li", type: "button", onclick: () => playDay(x.d) },
            h("span", { class: "ic", style: "--c:#ff6b3d", html: App.icon("news", 22) }),
            h("span", { class: "tx" }, h("b", { text: App.fmtDay(x.d) }), h("span", { text: x.title })),
            h("span", { class: "rt" }, b[x.d] != null ? h("span", { text: b[x.d] + " %" }) : h("span", { class: "label", text: x.n }), h("span", { class: "chev", html: App.icon("next", 18) }))))
          : [h("div", { class: "empty", text: "—" })]));
    }
    async function playDay(d) {
      const items = (await App.loadNewsDay(d)).filter(q => topics.has(q.t));
      R.run(items, {
        count: items.length, sortByLevel: true, subtitle: App.fmtDay(d), backLabel: "← Días", onBack: home,
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
        count: 10, subtitle: "Mezcla 7 días", backLabel: "← Días", onBack: home,
        onEnd: ({ pct }) => {
          App.saveScore("news", pct);
          return { label: "Mezcla 7 días", actions: [h("button", { class: "btn surf", type: "button", text: "Otra mezcla", onclick: playMix }), h("button", { class: "btn alt", type: "button", text: "Volver", onclick: home })] };
        }
      });
    }

    root.append(view);
    App.newsDays().some(x => x.d === arg) ? playDay(arg) : home();
    return () => R.destroy();
  }

  App.register({ id: "news", order: 2.5, title: "Actualidad", chapters: ["Kap 1–9"], mount });
})();
