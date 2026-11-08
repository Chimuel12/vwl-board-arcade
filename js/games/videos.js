/* Videoteca: one short explainer reel (German, ~30 s) per concept of the script, all 247.
   Data: js/data/videos.js (manifest) + media/videos/NNN.mp4|jpg, made by studio/publish_web.py.
   Deep links: #videos/k3 (chapter 3), #videos/42 (opens video 42). */
(function () {
  const { h } = App;
  const norm = s => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ß/g, "ss");

  function mount(root, arg) {
    const all = App.videos.all();
    const prefs = App.store.get("videoPrefs", {});
    let ch = prefs.ch || 0, q = "", onlyNew = !!prefs.onlyNew;
    const m = /^k([1-9])$/.exec(arg || "");
    if (m) ch = +m[1];

    const search = h("input", { type: "search", class: "vsearch", placeholder: "Buscar concepto (p. ej. Elastizität)", "aria-label": "Buscar concepto", autocomplete: "off" });
    const chips = h("div", { class: "chips" });
    const newToggle = h("button", { class: "chip", type: "button" });
    const count = h("span", { class: "label", "aria-live": "polite" });
    const list = h("div", { class: "stack", style: { gap: "22px" } });
    const progress = h("div", { class: "progress", role: "progressbar", "aria-label": "Vídeos vistos", "aria-valuemin": 0, "aria-valuemax": all.length }, h("i"));
    const seenLine = h("span", { class: "label" });

    const save = () => App.store.set("videoPrefs", { ch, onlyNew });
    function filtered() {
      const seen = App.videos.seen(), nq = norm(q.trim());
      return all.filter(v => (!ch || v.ch === ch) && (!onlyNew || !seen[v.id]) && (!nq || norm(v.term).includes(nq) || String(v.n) === nq));
    }
    function renderTools() {
      const seen = App.videos.seen();
      chips.replaceChildren(
        h("button", { class: "chip", type: "button", "aria-pressed": ch === 0, text: `Todos · ${all.length}`, onclick: () => { ch = 0; save(); render(); } }),
        ...window.CH.map(c => {
          const vs = all.filter(v => v.ch === c.n), done = vs.filter(v => seen[v.id]).length;
          return h("button", { class: "chip", type: "button", "aria-pressed": ch === c.n, title: c.t, text: `K${c.n} · ${done}/${vs.length}`, onclick: () => { ch = ch === c.n ? 0 : c.n; save(); render(); } });
        }));
      newToggle.setAttribute("aria-pressed", String(onlyNew));
      newToggle.textContent = "Solo sin ver";
      const n = all.filter(v => seen[v.id]).length;
      progress.firstChild.style.width = (all.length ? n / all.length * 100 : 0) + "%";
      progress.setAttribute("aria-valuenow", n);
      seenLine.textContent = `Has visto ${n} de ${all.length} vídeos`;
    }
    function card(v, playlist, seen) {
      return h("button", { class: "vcard", type: "button", "data-n": v.n, "aria-label": `Ver vídeo ${v.n}: ${v.term}` + (seen[v.id] ? " (visto)" : ""), onclick: () => App.videos.open(v, playlist) },
        h("div", { class: "pv" },
          h("img", { src: App.videos.poster(v), alt: "", loading: "lazy", decoding: "async", width: 360, height: 640 }),
          seen[v.id] ? h("span", { class: "ok", text: "✓ visto" }) : null,
          h("span", { class: "dur", text: App.videos.fmtDur(v.dur) })),
        h("div", { class: "cap" },
          h("span", { class: "label", text: `K${v.ch} · ${String(v.n).padStart(3, "0")}` }),
          h("b", { text: v.term })));
    }
    function render() {
      renderTools();
      const vs = filtered(), seen = App.videos.seen();
      count.textContent = vs.length === all.length ? `${all.length} vídeos` : `${vs.length} de ${all.length} vídeos`;
      if (!all.length) { list.replaceChildren(h("div", { class: "empty", text: "Los vídeos todavía no están publicados." })); return; }
      if (!vs.length) { list.replaceChildren(h("div", { class: "empty", text: onlyNew && !q ? "¡Ya has visto todos los vídeos de esta selección!" : "Ningún concepto coincide con la búsqueda." })); return; }
      list.replaceChildren(...window.CH.filter(c => vs.some(v => v.ch === c.n)).map(c => {
        const sec = vs.filter(v => v.ch === c.n);
        return h("section", { class: "vsec", "aria-label": `Kap. ${c.n}` },
          h("h3", {}, h("span", { text: `Kap. ${c.n} · ${c.t}` }), h("span", { class: "label", text: `${sec.length} vídeos` })),
          h("div", { class: "vgrid" }, sec.map(v => card(v, vs, seen))));
      }));
    }

    let t = null;
    search.addEventListener("input", () => { clearTimeout(t); t = setTimeout(() => { q = search.value; render(); }, 120); });
    newToggle.addEventListener("click", () => { onlyNew = !onlyNew; save(); render(); });
    const onChange = () => { // a video was closed: refresh "visto" marks and keep focus on its card
      if (!root.isConnected) return;
      const n = document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.n : null;
      render();
      if (n) list.querySelector(`[data-n="${n}"]`)?.focus({ preventScroll: true });
    };
    window.addEventListener("videos-changed", onChange);

    root.append(
      h("div", { class: "panel stack" },
        h("div", { class: "row between" }, seenLine, h("span", { class: "label", text: "Vídeos en alemán · ~30 s cada uno" })),
        progress,
        h("div", { class: "vtools" }, search, newToggle, count),
        chips),
      list);
    render();
    const direct = /^\d{1,3}$/.test(arg || "") && all.find(v => v.n === +arg);
    if (direct) App.videos.open(direct, all.filter(v => v.ch === direct.ch));
    return () => { clearTimeout(t); window.removeEventListener("videos-changed", onChange); };
  }

  App.register({
    id: "videos", order: 0.5, title: "Videoteca", nogame: true,
    bestKey: "videos", bestLabel: v => `vistos <b>${v}/${App.videos.all().length}</b>`,
    desc: "Un vídeo corto por concepto: los 247 Begriffe del script explicados en alemán con un ejemplo de surf, snow o tech.",
    intro: "¿Un concepto no queda claro? Cada uno de los 247 Begriffe del script tiene su vídeo de unos 30 segundos en alemán: definición, ejemplo de surf, snowboard o tecnología y la idea clave para el examen. También los encuentras en Memory y tras cada pregunta del Wave Quiz y de Actualidad.",
    chapters: ["Kap 1–9"], sector: ["surf", "snow", "tech"],
    art: () => `<svg viewBox="0 0 240 96" aria-hidden="true"><rect width="240" height="96" fill="var(--sky)"/><path d="M0 70c20-10 40-10 60 0s40 10 60 0 40-10 60 0 40 10 60 0v26H0z" fill="var(--sea2)"/><path d="M150 96l40-58 22 26 28-34v66z" fill="var(--rock)"/>${[[52, 14, "var(--surface)"], [98, 8, "var(--snow)"], [144, 14, "var(--surface)"]].map(([x, y, f], i) => `<g transform="translate(${x} ${y})"><rect width="44" height="78" rx="7" fill="${f}" stroke="var(--line)"/><circle cx="22" cy="39" r="12" fill="${i === 1 ? "#fff" : "var(--sun)"}"/><path d="M18 32l10 7-10 7z" fill="${i === 1 ? "var(--snow)" : "#fff"}"/><rect x="8" y="62" width="28" height="4" rx="2" fill="${i === 1 ? "#fff" : "var(--line)"}" opacity=".8"/></g>`).join("")}</svg>`,
    mount
  });
})();
