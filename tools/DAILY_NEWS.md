# Actualidad · instrucciones para la rutina diaria

Cada mañana una rutina en la nube investiga noticias reales de **surf**, **snowboard/esquí** y **tecnología** y las convierte en **20 preguntas** de *Einführung in die VWL* (Kap. 1–9). Este archivo es la especificación completa: la rutina la sigue paso a paso.

## 1. Antes de empezar

1. Fecha de hoy en Europa/Berlín: `TZ=Europe/Berlin date +%F` → la llamamos `FECHA`.
2. Si ya existe `js/data/news/FECHA.js`, **no hagas nada más** y termina.
3. Lee `js/data/news/index.js` y los 3 últimos archivos de días para no repetir noticias ni preguntas.

## 2. Investigar

- Busca noticias **de las últimas 72 horas** (como máximo 7 días). Hasta 3 de las 20 preguntas pueden usar contexto de los últimos 12 meses si sigue siendo relevante.
- Temas:
  - **surf**: industria del surf, marcas de tablas y neoprenos, parques de olas, escuelas, turismo de surf, WSL/competiciones con ángulo de negocio, costas y medio ambiente.
  - **snow**: estaciones (Alpes y Norteamérica), forfaits y pases de temporada, precios, nieve y clima, marcas de snowboard/esquí, aranceles, empleo en temporada.
  - **tech**: IA, chips, grandes tecnológicas (resultados, inversión, regulación), comercio y aranceles tecnológicos, energía de centros de datos, startups.
- Usa medios fiables (agencias, prensa económica, medios especializados como Shop-Eat-Surf-Outdoor, BoardSport Source, Wave Pool Magazine, SnowBrains, Skift, CNBC, Reuters, Handelsblatt, Tagesschau, ORF…). Abre el artículo y comprueba cada dato que uses.
- Necesitas al menos **8 noticias distintas**. Como máximo 3 preguntas por noticia.

## 3. Escribir las 20 preguntas

**Idioma:** las preguntas, respuestas y explicaciones van en **alemán** (como el examen). El título del día en el manifest va en **español**.

**Reparto obligatorio**
- Temas: 7 surf, 7 snow, 6 tech (±1).
- Niveles: al menos 7 niveles distintos, unas 2 preguntas por nivel, al menos una de nivel 8 o 9.
- Capítulos: al menos 7 de los 9 capítulos.
- Al menos 4 preguntas numéricas.

**Niveles (de fácil a difícil)**
1. Reconocer el concepto en la noticia.
2. Definiciones aplicadas (formato «Vervollständigen Sie»).
3. Cálculos de un paso: porcentajes, costes de oportunidad, BIP, elasticidad simple, KR.
4. Analizar: causalidad vs. correlación, tipo de Marktversagen, leer una matriz.
5. Cálculos de varios pasos: renta económica, ventaja comparativa, isocostes.
6. Hogares: Budgetgerade, utilidad, efecto renta y sustitución.
7. Teoría de juegos avanzada: varios NE, juegos secuenciales, repetidos, negociación.
8. Empresas: Markup = 1/ε, MR = MC, monopolio, DWL, Skalenerträge.
9. Nivel examen: varios pasos combinando mercados, externalidades (Pigou), macro (BIP, inflación, Fisher, Phillips, Okun).

**Capítulos y conceptos**
1. Opportunitätskosten, Kosten-Nutzen, Gleichgewicht, Free-Rider, Kausalität vs. Korrelation, Experimente.
2. BIP y sus límites, Hockeyschläger, Malthus, Institutionen, Kapitalismus.
3. Ökonomische Rente, Innovationsrente, Spezialisierung, komparativer Vorteil, Isokosten, relative Preise.
4. Präferenzen, Indifferenzkurven, GRS/GRT, Budgetgerade, Einkommens- und Substitutionseffekt.
5. Spieltheorie: Nash, dominante Strategie, Gefangenendilemma, Pareto, wiederholte und sequentielle Spiele, Ultimatumspiel, Koordination.
6. Firmen: Isoprofit, Kosten (F, AC, MC), Skalenerträge, Elastizität, MR = MC, Markup, Renten, DWL, Marktmacht.
7. Angebot und Nachfrage, Verschiebungen, Wettbewerbsgleichgewicht, Preisnehmer, Höchstpreis, kurze/lange Frist.
8. Externe Effekte, Pigou, Coase, öffentliche Güter, asymmetrische Information.
9. Konjunktur, BIP = C + I + G + X − M, Inflation/VPI, Fisher, Phillips, Okun, Zölle.

**Reglas de contenido**
- Cada pregunta se basa en una noticia concreta y nombra a la empresa, el lugar o el dato real.
- Todos los datos del enunciado salen de la fuente. Si para el cálculo hacen falta números que la noticia no da, escríbelos como supuesto («Angenommen, …»).
- No inventes citas ni cifras. Parafrasea; no copies frases del artículo.
- La explicación `x` dice por qué la respuesta es correcta, nombra el concepto y el capítulo («Kap. 6») y, en los cálculos, muestra la cuenta.
- Preguntas tipo test: 4 respuestas plausibles; la correcta va **siempre la primera** (la app las mezcla).
- Preguntas numéricas: `n` (resultado), `tol` (tolerancia de redondeo, nunca 0), `u` (unidad) y `calc` (la cuenta con números y `+ - * / ( )`, que tiene que dar `n`).

## 4. Formato

Archivo nuevo `js/data/news/FECHA.js`:

```js
/* Actualidad FECHA · 20 preguntas */
NEWS_DAY("FECHA", [
  { t: "snow", l: 3, k: 9,
    q: "Laut einer Erhebung kosten sechs Skitage in 36 Alpen-Skigebieten im Schnitt 388 € – in der Vorsaison 375 €. Um wie viel Prozent sind die Preise gestiegen?",
    n: 3.47, tol: 0.05, u: "%", calc: "(388-375)/375*100",
    x: "(388 − 375) / 375 · 100 ≈ 3,47 %. So berechnet man auch eine Inflationsrate (Kap. 9).",
    src: { t: "Skifahren wird teurer: Das kostet ein Tag auf den Pisten der Alpen", o: "ms-aktuell", u: "https://ms-aktuell.de/?p=169735", d: "2026-11" } },
  { t: "surf", l: 1, k: 6,
    q: "…", a: ["richtige Antwort", "falsch", "falsch", "falsch"],
    x: "…", src: [{ t: "…", o: "…", u: "https://…", d: "2026-11-07" }] }
]);
```

Campos: `t` surf/snow/tech · `l` nivel 1–9 · `k` capítulo 1–9 · `q` pregunta · `a` respuestas (la primera es la correcta) **o** `n`/`tol`/`u`/`calc` · `x` explicación · `src` una fuente o una lista: `t` título, `o` medio, `u` URL https, `d` fecha (YYYY-MM-DD, YYYY-MM o YYYY).

Añade al final de `js/data/news/index.js` una línea:

```js
NEWS_DAYS.push({ d: "FECHA", n: 20, title: "Resumen en español de los temas del día (10–180 caracteres)" });
```

**No cambies ningún otro archivo.**

## 5. Validar y publicar

1. `node tools/validate-news.mjs` tiene que terminar con **0 errores**. Corrige y repite hasta que pase. Revisa también los avisos de reparto.
2. Haz commit con el mensaje `Actualidad FECHA: 20 preguntas`.
3. Haz push de la rama de trabajo de la sesión (`git push -u origin HEAD`). Si estás en `main`, crea antes `claude/news-FECHA`. No hace falta abrir un pull request: la GitHub Action `Merge daily news` vuelve a validar la rama, la fusiona en `main` (solo si únicamente cambian archivos de `js/data/news/`) y publica la web.
4. Termina con un resumen corto: las noticias usadas y el reparto por tema, nivel y capítulo.
