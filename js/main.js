/* Router + hub. Each game registers {id, order, title, desc, chapters, sector, art, mount}. */
(function () {
  const { h } = App;
  const view = document.getElementById("view");
  const crumb = document.getElementById("crumb");
  let cleanup = null;

  function heroScene() {
    // mountains (snow side) flow into the sea (surf side); waves drift, flakes fall
    const flakes = Array.from({ length: 14 }, (_, i) => {
      const x = 20 + ((i * 37) % 360), d = 6 + (i % 5) * 1.7, dl = -(i * 0.9);
      return `<circle class="flake" cx="${x}" cy="0" r="${1.4 + (i % 3) * 0.6}" fill="var(--peak)" style="animation-duration:${d}s;animation-delay:${dl}s"/>`;
    }).join("");
    const wavePath = y => {
      let d = `M0 ${y}`;
      for (let x = 0; x < 2000; x += 200) d += ` c50 -18 100 -18 100 0 s50 18 100 0`;
      return d + ` V400 H0 Z`;
    };
    return `<svg class="scene" viewBox="0 0 1200 400" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <rect width="1200" height="400" fill="var(--sky)"/>
      <circle cx="930" cy="90" r="46" fill="var(--sun)" opacity=".9"/>
      <path d="M-20 400 L120 150 L190 230 L300 90 L430 260 L520 200 L640 330 L700 400Z" fill="var(--rock)"/>
      <path d="M300 90 L335 138 L312 130 L296 150 L278 128 Z M120 150 L146 196 L128 186 L112 200 L98 190Z" fill="var(--peak)"/>
      <path d="M-20 400 C120 330 260 300 420 320 C520 332 600 360 700 400Z" fill="var(--peak)" opacity=".95"/>
      <g>${flakes}</g>
      <g transform="translate(420 0)">
        <path class="wave w3" d="${wavePath(250)}" fill="var(--sea1)"/>
        <path class="wave w2" d="${wavePath(290)}" fill="var(--sea2)"/>
        <path class="wave" d="${wavePath(330)}" fill="var(--sea3)"/>
      </g>
      <rect width="1200" height="400" fill="url(#heroFade)"/>
      <defs><linearGradient id="heroFade" x1="0" y1="0" x2="0" y2="1"><stop offset=".35" stop-color="var(--sky)" stop-opacity="0"/><stop offset="1" stop-color="var(--sky)" stop-opacity=".55"/></linearGradient></defs>
    </svg>`;
  }

  function home() {
    crumb.textContent = "";
    document.title = "VWL Board Arcade";
    const mastery = App.store.get("mastery", {});
    const mastered = Object.values(mastery).filter(r => r.s >= 2).length;
    const total = window.CH.reduce((a, c) => a + c.p.length, 0);
    const games = App.games.filter(g => !g.nogame);
    const played = games.filter(g => App.best(g.bestKey || g.id) != null).length;
    const vids = App.videos.all(), seenN = vids.filter(v => App.videos.seen()[v.id]).length;

    const hero = h("section", { class: "hero" });
    hero.innerHTML = heroScene();
    hero.append(h("div", { class: "copy" },
      h("span", { class: "label", text: "Einführung in die VWL · Prof. Fehr · Kap. 1–9" }),
      h("h1", { html: "La VWL, sobre la <span>tabla</span>" }),
      h("p", { class: "lede", text: `${games.length} minijuegos que aplican cada capítulo al negocio del surf, del snowboard y de la tecnología: tiendas, escuelas, fábricas de tablas y estaciones de esquí. Y si un concepto no queda claro, su vídeo explicativo.` }),
      h("div", { class: "stats" },
        h("div", { class: "stat" }, h("span", { class: "label", text: "Conceptos dominados" }), h("b", { text: mastered + " / " + total })),
        h("div", { class: "stat" }, h("span", { class: "label", text: "Juegos probados" }), h("b", { text: played + " / " + games.length })),
        vids.length ? h("a", { class: "stat", href: "#videos", style: { textDecoration: "none", color: "inherit" } }, h("span", { class: "label", text: "Vídeos vistos ▶" }), h("b", { text: seenN + " / " + vids.length })) : null
      )
    ));

    const grid = h("section", { class: "grid", "aria-label": "Minijuegos" });
    App.games.slice().sort((a, b) => a.order - b.order).forEach(g => {
      let best = App.best(g.bestKey || g.id);
      if (g.levelsKey) { const n = App.levels.passed(g.levelsKey); best = n || (App.best(g.id) != null ? 0 : null); }
      const ic = h("div", { class: "ic", html: g.art() });
      grid.append(h("a", { class: "gcard", href: "#" + g.id },
        ic,
        h("div", { class: "stack", style: { gap: "6px" } }, h("h3", { text: g.title }), h("p", { text: g.desc })),
        h("div", { class: "foot" },
          h("div", { class: "pills" },
            g.chapters.map(c => h("span", { class: "pill", text: c })),
            g.sector.map(s => h("span", { class: "pill " + s, text: App.TOPICS[s] || s }))),
          h("span", { class: "best", html: best == null ? "nuevo" : (g.levelsKey ? `niveles <b>${best}/9</b>` : g.bestLabel ? g.bestLabel(best) : "récord <b>" + best + "</b>") })
        )));
    });

    view.replaceChildren(hero,
      h("div", { class: "row between" }, h("h2", { text: "Elige un juego" }), h("span", { class: "label", text: "Empresas y cifras ficticias" })),
      grid);
  }

  function game(g, arg) {
    crumb.textContent = "/ " + g.title;
    document.title = g.title + " · VWL Board Arcade";
    const root = h("div", { class: "stack" });
    const head = h("header", { class: "ghead" },
      h("div", { class: "t" },
        h("div", { class: "pills" }, g.chapters.map(c => h("span", { class: "pill", text: c })), g.sector.map(s => h("span", { class: "pill " + s, text: App.TOPICS[s] || s }))),
        h("h1", { text: g.title, style: { fontSize: "clamp(26px,4vw,38px)" } }),
        h("p", { text: g.intro || g.desc })),
      h("a", { href: "#", class: "btn alt", text: "← Todos los juegos", style: { textDecoration: "none" } }));
    view.replaceChildren(head, root);
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
  window.addEventListener("hashchange", route);
  route();
  App.loadRecentNews(30); // news questions also feed the Wave Quiz levels
})();
