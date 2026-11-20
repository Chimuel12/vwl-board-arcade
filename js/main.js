/* Navigation, home and router. Each game registers {id, order, title, chapters, levelsKey?, nogame?, mount(root, arg)}.
   Routes: #, #<game>, #<game>/<arg> (e.g. #videos/k3, #news/2026-11-20, #quiz/free). */
(function () {
  const { h } = App;
  const view = document.getElementById("view");
  const nav = document.getElementById("nav");
  let cleanup = null;

  // icon and colour of each section (the colour fills its round icon)
  const META = {
    home: { icon: "home", label: "Inicio" },
    quiz: { icon: "quiz", color: "#2f6af5", label: "Quiz" },
    memory: { icon: "memory", color: "#5a5cf0", label: "Memory" },
    videos: { icon: "videos", color: "#e23d8f", label: "Vídeos" },
    news: { icon: "news", color: "#ff6b3d", label: "Hoy" },
    market: { icon: "market", color: "#0a9e96" },
    pricing: { icon: "pricing", color: "#e89a0c" },
    duel: { icon: "duel", color: "#7b5cff" },
    pigou: { icon: "pigou", color: "#12a150" },
    advantage: { icon: "advantage", color: "#0b9bd8" }
  };
  const PRIMARY = ["home", "quiz", "memory", "videos", "news"];
  const QUIZ_PASS = 7;
  const meta = id => META[id] || META.quiz;
  const games = () => App.games.slice().sort((a, b) => a.order - b.order);
  const iconCircle = (id, size = 22) => h("span", { class: "ic", style: `--c:${meta(id).color}`, html: App.icon(meta(id).icon, size) });
  const ring = (v, max) => `<svg class="ring" viewBox="0 0 36 36" aria-hidden="true"><circle cx="18" cy="18" r="15" class="rb"/>${v > 0 ? `<circle cx="18" cy="18" r="15" class="rf" stroke-dasharray="${(v / max * 94.25).toFixed(1)} 94.25" transform="rotate(-90 18 18)"/>` : ""}</svg>`;

  function buildNav() {
    const link = (id, label, cls) => h("a", { class: "nav" + (cls || ""), href: id === "home" ? "#" : "#" + id, "data-id": id },
      h("span", { class: "ni", html: App.icon(meta(id).icon, 22) }), h("span", { class: "nl", text: label }));
    nav.replaceChildren(
      h("a", { class: "brand", href: "#", "aria-label": "Board Arcade, inicio" }, h("i", { html: App.icon("wave", 18) }), h("span", { text: "Board Arcade" })),
      ...PRIMARY.map(id => link(id, META[id].label)),
      h("div", { class: "navsep", text: "Juegos" }),
      ...games().filter(g => !PRIMARY.includes(g.id)).map(g => link(g.id, g.title, " sec")));
  }
  function markNav(id) {
    nav.querySelectorAll(".nav").forEach(a => a.dataset.id === id ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current"));
  }

  const quizPassed = () => Object.values(App.store.get("levels", {})).filter(r => r.best >= QUIZ_PASS).length;
  function levelsOf(g) {
    if (g.id === "quiz") return quizPassed();
    return g.levelsKey ? App.levels.passed(g.levelsKey) : null;
  }

  function home() {
    document.title = "VWL Board Arcade";
    markNav("home");
    const lvGames = games().filter(g => levelsOf(g) != null);
    const passed = lvGames.reduce((a, g) => a + levelsOf(g), 0), max = lvGames.length * 9;
    const mastery = App.store.get("mastery", {});
    const mastered = Object.values(mastery).filter(r => r.s >= 2).length, concepts = window.CH.reduce((a, c) => a + c.p.length, 0);
    const vids = App.videos.all(), seen = App.videos.seen(), unseen = vids.filter(v => !seen[v.id]);
    const days = App.newsDays(), newsBest = App.store.get("newsBest", {});

    const balance = h("section", { class: "balance", "aria-label": "Tu progreso" },
      h("span", { class: "bl-label", text: "Niveles superados" }),
      h("div", { class: "bl-num" }, h("b", { text: passed }), h("span", { text: "/ " + max })),
      h("div", { class: "bl-bar" }, h("i", { style: { width: (max ? passed / max * 100 : 0) + "%" } })),
      h("div", { class: "bl-pills" },
        h("a", { href: "#memory", text: `${mastered} / ${concepts} conceptos` }),
        vids.length ? h("a", { href: "#videos", text: `${vids.length - unseen.length} / ${vids.length} vídeos` }) : null));

    const last = App.store.get("lastGame", "quiz");
    const act = (label, iconName, color, attrs) => h(attrs.href ? "a" : "button", Object.assign({ class: "act" }, attrs.href ? {} : { type: "button" }, attrs),
      h("span", { class: "ic", style: `color:${color}`, html: App.icon(iconName, 24) }), h("span", { text: label }));
    const actions = h("div", { class: "actions" },
      act("Seguir", "resume", meta(last).color, { href: "#" + (App.games.some(g => g.id === last) ? last : "quiz") }),
      act("Repaso", "shuffle", META.quiz.color, { href: "#quiz/free" }),
      act("Vídeo", "videos", META.videos.color, vids.length ? { onclick: () => App.videos.open(unseen[0] || vids[0], unseen.length ? unseen : vids) } : { href: "#videos" }),
      act("Hoy", "news", META.news.color, { href: days.length ? "#news/" + days[0].d : "#news" }));

    const gameList = h("section", { class: "panel list", "aria-label": "Juegos" },
      h("div", { class: "lh" }, h("h2", { text: "Juegos" })),
      games().filter(g => !["videos", "news"].includes(g.id)).map(g => {
        const v = levelsOf(g);
        return h("a", { class: "li", href: "#" + g.id }, iconCircle(g.id),
          h("span", { class: "tx" }, h("b", { text: g.title }), h("span", { text: (g.chapters || []).join(", ") + (v != null ? ` · ${v}/9` : "") })),
          h("span", { class: "rt", html: v != null ? ring(v, 9) : "" }));
      }));

    const newsList = h("section", { class: "panel list", "aria-label": "Actualidad" },
      h("div", { class: "lh" }, h("h2", { text: "Actualidad" }), h("a", { href: "#news", text: "Todo" })),
      days.length ? days.slice(0, 3).map(d => h("a", { class: "li", href: "#news/" + d.d }, iconCircle("news"),
        h("span", { class: "tx" }, h("b", { text: App.fmtDay(d.d) }), h("span", { text: d.title })),
        h("span", { class: "rt" }, newsBest[d.d] != null ? h("span", { text: newsBest[d.d] + " %" }) : h("span", { class: "label", text: d.n }), h("span", { class: "chev", html: App.icon("next", 18) }))))
        : h("div", { class: "empty", text: "—" }));

    const shelf = (unseen.length ? unseen : vids).slice(0, 12);
    const videoRow = vids.length ? h("section", { class: "panel list", "aria-label": "Vídeos" },
      h("div", { class: "lh" }, h("h2", { text: "Vídeos" }), h("a", { href: "#videos", text: "Todo" })),
      h("div", { class: "scroller" }, shelf.map(v => h("button", { class: "vmini", type: "button", "aria-label": "Vídeo: " + v.term, onclick: () => App.videos.open(v, shelf) },
        h("img", { src: App.videos.poster(v), alt: "", loading: "lazy", width: 112, height: 199 }), h("span", { lang: "de", text: v.term }))))) : null;

    view.replaceChildren(h("div", { class: "home" },
      h("div", { class: "col" }, balance, actions, gameList),
      h("div", { class: "col" }, newsList, videoRow)));
  }

  function game(g, arg) {
    document.title = g.title + " · VWL Board Arcade";
    markNav(g.id);
    if (!g.nogame && g.id !== "news") App.store.set("lastGame", g.id);
    const root = h("div", { class: "stack" });
    view.replaceChildren(
      h("header", { class: "pagehead" },
        h("a", { href: "#", class: "back", "aria-label": "Inicio", html: App.icon("back", 20) }),
        h("h1", { text: g.title }),
        g.chapters ? h("span", { class: "pill", text: g.chapters.join(", ") }) : null),
      root);
    cleanup = g.mount(root, arg) || null;
  }

  function route() {
    if (typeof cleanup === "function") { try { cleanup(); } catch (e) {} }
    cleanup = null;
    App.videos.close();
    const [id, arg] = location.hash.slice(1).split("/");
    const g = App.games.find(x => x.id === id);
    g ? game(g, arg) : home();
    window.scrollTo(0, 0);
  }
  buildNav();
  window.addEventListener("hashchange", route);
  route();
  App.loadRecentNews(30); // news questions also feed the Wave Quiz levels
})();
