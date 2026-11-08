/* Taller doble (Kap 3): allocate workshop hours between surfboards and snowboards.
   9 levels: 2 → 3 workshops, random productivities, an order constraint or revenue maximisation. Optimum by brute force. */
(function () {
  const { h, s } = App;
  const HRS = 40;
  const NAMES = [["Ericeira (PT)", "surf"], ["Innsbruck (AT)", "snow"], ["Hossegor (FR)", "surf"], ["Laax (CH)", "snow"], ["Mundaka (ES)", "surf"]];
  const BASE = [{ name: "Ericeira (PT)", su: 2, sn: 3 }, { name: "Innsbruck (AT)", su: 8, sn: 4 }];

  function randShops(n, mode) {
    for (;;) {
      const names = App.shuffle(NAMES.slice()).slice(0, n);
      const W = names.map(([name]) => ({ name, su: App.rnd(2, 10), sn: App.rnd(2, 10) }));
      const ratios = W.map(w => w.su / w.sn);
      if (new Set(ratios.map(r => r.toFixed(3))).size < n) continue;
      if (n === 2) {
        const [a, b] = W, absBoth = (a.su < b.su && a.sn < b.sn) || (b.su < a.su && b.sn < a.sn);
        if (mode === "split" && absBoth) continue;
        if (mode === "abs" && !absBoth) continue;
      }
      return W;
    }
  }
  const LEVELS = [
    { name: "Con pista", desc: "Dos talleres. Debajo ves los costes de oportunidad. Cumple el pedido y maximiza los Snowboards.", make: () => BASE, goal: "order", hint: true },
    { name: "Sin pista", desc: "Los mismos talleres, sin ayuda.", make: () => BASE, goal: "order" },
    { name: "Cada uno lo suyo", desc: "Talleres al azar; cada uno es más rápido en una tabla distinta.", make: () => randShops(2, "split"), goal: "order" },
    { name: "Uno mejor en todo", desc: "Un taller tiene ventaja absoluta en ambas tablas. La comparativa sigue decidiendo.", make: () => randShops(2, "abs"), goal: "order" },
    { name: "Calcula primero", desc: "Antes de repartir, calcula el coste de oportunidad de un Snowboard en el primer taller.", make: () => randShops(2), goal: "order", ask: true },
    { name: "Tres talleres", desc: "Tres talleres al azar. La frontera conjunta tiene dos codos.", make: () => randShops(3), goal: "order" },
    { name: "Tres talleres, exacto", desc: "Tres talleres. Para pasar necesitas el máximo exacto.", make: () => randShops(3), goal: "order", exact: true },
    { name: "Máximo ingreso", desc: "Sin pedido: con precios dados, maximiza el ingreso total. Compara precios relativos con costes de oportunidad.", make: () => randShops(2), goal: "revenue" },
    { name: "Ingreso con tres", desc: "Tres talleres y precios: maximiza el ingreso.", make: () => randShops(3), goal: "revenue" }
  ];

  function mount(root) {
    const left = h("div", { class: "panel stack" }), side = h("div", { class: "panel stack" });
    const bar = App.levelBar("advantage", LEVELS, () => load());
    let stop = () => {};

    function load() {
      stop();
      const L = LEVELS[bar.cur - 1], W = L.make().map(w => ({ ...w })), n = W.length;
      L._askOk = undefined;
      const out = hs => hs.reduce((a, hh, i) => ({ su: a.su + hh / W[i].su, sn: a.sn + (HRS - hh) / W[i].sn }), { su: 0, sn: 0 });
      const NEED = out(W.map(() => HRS / 2)).su;
      const prices = { su: App.rnd(300, 600, 50), sn: App.rnd(300, 600, 50) };
      const value = o => L.goal === "order" ? (o.su >= NEED - 1e-9 ? o.sn : -1) : prices.su * o.su + prices.sn * o.sn;
      // brute force over integer hours
      let best = -Infinity, bestH = null;
      (function rec(i, acc) { if (i === n) { const v = value(out(acc)); if (v > best + 1e-9) { best = v; bestH = acc.slice(); } return; } for (let x = 0; x <= HRS; x++) { acc.push(x); rec(i + 1, acc); acc.pop(); } })(0, []);
      const hours = W.map(() => HRS / 2);

      // PPF of the joint workshops: switch the cheapest surfboards first
      const order = W.map((w, i) => i).sort((a, b) => (W[a].su / W[a].sn) - (W[b].su / W[b].sn));
      const pts = [[0, W.reduce((a, w) => a + HRS / w.sn, 0)]];
      order.forEach(i => { const [x, y] = pts[pts.length - 1]; pts.push([x + HRS / W[i].su, y - HRS / W[i].sn]); });
      const xmax = pts[pts.length - 1][0] * 1.08, ymax = pts[0][1] * 1.12;
      const nice = v => { const p = Math.pow(10, Math.floor(Math.log10(v))) / 10; return [1, 2, 2.5, 5, 10, 20, 25, 50].map(m => m * p).find(m => v / m <= 6); };
      const xs = nice(xmax), ys = nice(ymax);
      const P = App.plot({ xmax, ymax, xticks: Array.from({ length: Math.floor(xmax / xs) + 1 }, (_, k) => k * xs), yticks: Array.from({ length: Math.floor(ymax / ys) + 1 }, (_, k) => k * ys), xlabel: "Surfboards / Woche", ylabel: "Snowboards / Woche", label: "Produktionsmöglichkeiten", m: { l: 50 }, xfmt: App.n1, yfmt: App.n1 });
      const ppf = s("polyline", { class: "curve ppf" }), cur = s("circle", { class: "dot hi", r: 8 }), aut = s("circle", { class: "dot", r: 6 }), opt = s("circle", { class: "dot ok", r: 7, style: "display:none" });
      const need = s("line", { class: "guide", style: "stroke:var(--sun);stroke-dasharray:6 4;stroke-width:2" }), iso = s("line", { class: "curve ghost", style: "display:none" });
      P.back.append(need, iso); P.mid.append(ppf); P.front.append(aut, opt, cur, s("text", { class: "tag g", x: P.X(xmax * 0.02), y: P.Y(pts[0][1]) - 8, text: "Frontera conjunta" }));
      App.poly(P, ppf, pts);
      const a0 = out(hours);
      App.set(aut, { cx: P.X(a0.su), cy: P.Y(a0.sn) });
      if (L.goal === "order") { App.seg(P, need, NEED, 0, NEED, ymax); P.front.append(s("text", { class: "tag s", x: P.X(NEED) + 6, y: P.Y(ymax * 0.95), text: `mín. ${App.n1(NEED)} Surfboards` })); } else need.style.display = "none";
      let pos = { x: a0.su, y: a0.sn };

      const sliders = W.map((w, i) => {
        const r = h("input", { type: "range", id: "hours" + i, min: 0, max: HRS, step: 1, value: hours[i], "aria-label": "Horas de surf en " + w.name });
        const lab = h("b", { class: "num" });
        r.addEventListener("input", () => { hours[i] = +r.value; update(); });
        return { r, lab, el: h("div", { class: "range" }, h("div", { class: "row between" }, h("span", { class: "label", text: w.name }), lab), r) };
      });
      const barsEl = h("div", { class: "bars" });
      const tot = { su: h("b"), sn: h("b"), v: h("b") };
      const kSu = h("div", { class: "kpi" }, h("span", { class: "label", text: "Surfboards" }), tot.su);
      function update() {
        const o = out(hours);
        sliders.forEach((sl, i) => sl.lab.textContent = `${hours[i]} h surf · ${HRS - hours[i]} h snow`);
        const maxB = Math.max(...W.map(w => Math.max(HRS / w.su, HRS / w.sn)));
        barsEl.replaceChildren(...W.flatMap((w, i) => [["Surf", hours[i] / w.su, "s"], ["Snow", (HRS - hours[i]) / w.sn, "w"]].map(([t, v, c]) =>
          h("div", { class: "bar" }, h("span", { text: `${t} · ${w.name.split(" ")[0]}` }), h("div", { class: "tr" }, h("i", { class: c, style: { width: (v / maxB * 100) + "%" } })), h("span", { class: "num", text: App.n1(v) })))));
        tot.su.textContent = App.n1(o.su); tot.sn.textContent = App.n1(o.sn);
        if (L.goal === "order") kSu.className = "kpi " + (o.su >= NEED - 1e-9 ? "good" : "bad");
        else tot.v.textContent = App.eur(prices.su * o.su + prices.sn * o.sn);
        stop(); const from = { ...pos };
        stop = App.tween(300, t => { pos = { x: App.lerp(from.x, o.su, t), y: App.lerp(from.y, o.sn, t) }; App.set(cur, { cx: P.X(pos.x), cy: P.Y(pos.y) }); });
      }
      left.replaceChildren(P.svg, barsEl);

      const table = h("div", { class: "kpis" }, W.map(w => h("div", { class: "kpi" }, h("span", { class: "label", text: w.name + ": horas por tabla" }), h("b", { text: `Surf ${w.su} · Snow ${w.sn}`, style: { fontSize: "15px", whiteSpace: "normal" } }))));
      const hint = L.hint ? h("p", { class: "hintbox", text: W.map(w => `${w.name}: 1 Snowboard cuesta ${App.n2(w.sn / w.su)} Surfboards`).join(" · ") + ". Quien renuncia a menos tiene la ventaja comparativa." }) : null;
      const goalTxt = L.goal === "order" ? `Pedido: al menos ${App.n1(NEED)} Surfboards por semana (lo que salía repartiendo 50/50). Con eso cumplido, fabrica el máximo de Snowboards.` : `Precios: Surfboard ${App.eur(prices.su)}, Snowboard ${App.eur(prices.sn)}. Maximiza el ingreso semanal.`;
      const fb = h("div", { class: "stack", "aria-live": "polite" });
      const lockBtn = h("button", { class: "btn surf", type: "button", text: "Enviar plan de producción", onclick: lock });
      const controls = h("div", { class: "stack" }, sliders.map(sl => sl.el),
        h("div", { class: "kpis" }, kSu, h("div", { class: "kpi" }, h("span", { class: "label", text: "Snowboards" }), tot.sn), L.goal === "revenue" ? h("div", { class: "kpi" }, h("span", { class: "label", text: "Ingreso" }), tot.v) : null),
        h("div", { class: "row" }, lockBtn));
      side.replaceChildren(...[h("div", { class: "case" }, h("span", { class: "who", text: `Nivel ${bar.cur} · ${n} talleres, ${HRS} h cada uno` }), h("p", { text: goalTxt })), table, hint, fb, controls].filter(Boolean));
      update();
      if (L.ask) {
        controls.hidden = true;
        const oc = W[0].sn / W[0].su;
        fb.append(App.numQuestion(`Coste de oportunidad de 1 Snowboard en ${W[0].name} (en Surfboards)`, oc, 0.02, "Surfboards", ok => {
          L._askOk = ok;
          fb.append(h("p", { class: "hintbox", text: `${W[0].name} necesita ${W[0].sn} h para un Snowboard; en ese tiempo haría ${W[0].sn}/${W[0].su} = ${App.n2(oc)} Surfboards. En ${W[1].name}: ${App.n2(W[1].sn / W[1].su)}.` }));
          controls.hidden = false;
        }));
      }

      function lock() {
        sliders.forEach(sl => sl.r.disabled = true); lockBtn.disabled = true;
        const v = value(out(hours)), r = v < 0 ? 0 : v / best;
        let stars = L.exact ? (r >= 1 - 1e-9 ? 3 : 0) : r >= 1 - 1e-9 ? 3 : r >= 0.985 ? 2 : r >= 0.97 ? 1 : 0;
        if (L.ask && !L._askOk) stars = 0;
        const ob = out(bestH);
        opt.style.display = ""; App.set(opt, { cx: P.X(ob.su), cy: P.Y(ob.sn) });
        if (L.goal === "revenue") { iso.style.display = ""; const R = best; App.seg(P, iso, 0, R / prices.sn, R / prices.su, 0); }
        if (stars) App.burst(cur, "snow");
        const plan = bestH.map((x, i) => `${W[i].name.split(" ")[0]} ${x} h surf`).join(", ");
        const why = L.goal === "order"
          ? `Máximo: ${App.n1(ob.sn)} Snowboards con ${App.n1(ob.su)} Surfboards (${plan}). Los Surfboards los hace primero quien renuncia a menos Snowboards por cada uno.`
          : `Máximo ingreso ${App.eur(best)} (${plan}). Un taller hace Surfboards si su coste de oportunidad (Snowboards perdidos × precio) es menor que el precio del Surfboard. La línea gris es la isoingreso tangente.`;
        App.saveScore("advantage", Math.round(Math.max(0, r) * 100));
        fb.append(h("div", { class: "feedback " + (stars ? "ok" : "no") }, h("b", { text: v < 0 ? "No cumples el pedido de Surfboards" : `Tu resultado: ${Math.round(r * 1000) / 10} % del máximo` }), h("span", { text: why })),
          App.levelResult(bar, stars, `Nivel ${bar.cur}`, L.ask && !L._askOk ? "El coste de oportunidad tenía que estar bien." : L.exact ? "Este nivel exige el máximo exacto." : "Necesitas al menos el 97 % del máximo.", load));
      }
    }
    root.append(bar.el, h("div", { class: "split" }, left, side));
    load();
    return () => stop();
  }

  App.register({
    id: "advantage", order: 7, title: "Taller doble", levelsKey: "advantage",
    desc: "9 niveles de ventaja comparativa: dos y tres talleres, ventaja absoluta en todo, cálculo del coste de oportunidad y maximización de ingresos.",
    intro: "Reparte las horas de los talleres entre Surfboards y Snowboards. El punto naranja se mueve sobre la frontera de producción conjunta. En los niveles altos hay tres talleres y precios de venta.",
    chapters: ["Kap 3"], sector: ["surf", "snow"],
    art: () => `<svg viewBox="0 0 240 96" aria-hidden="true"><rect width="240" height="96" fill="var(--sky)"/><path d="M0 96L50 40l25 22 30-34 40 68z" fill="var(--rock)"/><path d="M50 40l9 10-7-2-6 5z" fill="var(--peak)"/><path d="M120 70c20-10 40-10 60 0s40 10 60 0v26H120z" fill="var(--sea2)"/><g transform="rotate(-30 150 40)"><rect x="132" y="34" width="44" height="10" rx="5" fill="var(--sun)"/></g><g transform="rotate(20 70 30)"><rect x="52" y="24" width="40" height="9" rx="4" fill="var(--snow)"/></g></svg>`,
    mount
  });
})();
