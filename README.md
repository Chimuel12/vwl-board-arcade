# VWL Board Arcade

Minijuegos para aprender **Einführung in die VWL** (Universität Stuttgart, Prof. Dr. Dietmar Fehr, Kap. 1–9) con casos de negocio del surf y del snowboard.

Todas las empresas y cifras son ficticias: Salzwasser Surf Co. (escuela y tienda en Ericeira), Gipfelbrett (fábrica de snowboards en Innsbruck), Swell Academy (escuela rival) y Alpenlift AG (estación de esquí).

## Juegos

| Juego | Capítulo | Qué practicas |
|---|---|---|
| Memory de conceptos | Kap 1–9 | 247 parejas Begriff–Erklärung · 9 niveles: de 4 cartas abiertas a 12 tapadas con máx. 2 errores |
| Wave Quiz · 9 niveles | Kap 1–9 | 174 preguntas en 9 niveles de dificultad (más las de actualidad); 7/10 desbloquea el siguiente |
| Actualidad | Kap 1–9 | 20 preguntas nuevas cada día a partir de noticias reales de surf, snowboard y tech, con la fuente enlazada |
| Board-Markt | Kap 7 | 9 niveles: noticias (una o dos a la vez), nuevo P*, precio máximo, rentas, Skiausrüstung (Übung 6) |
| Preis-Setter | Kap 6 | 9 niveles: MR = MC con ayuda, mercados al azar, MC creciente, DWL, Markup, Übungsblatt 5 |
| Duelo en la playa | Kap 5 | 9 niveles: matrices al azar (Nash 2×2 a 3×3, Pareto, secuenciales) y juego repetido |
| Laboratorio Pigou | Kap 8 | 9 niveles: MEC lineal/constante/mixta, subvención por externalidad positiva, Zusatzblatt 4, pago de Coase |
| Taller doble | Kap 3 | 9 niveles: 2 y 3 talleres, ventaja absoluta en todo, coste de oportunidad, maximizar ingresos |

Cada juego tiene una barra de 9 niveles: superar uno desbloquea el siguiente y da de 1 a 3 estrellas. «Desbloquear todos» abre todos los niveles para repasar antes del examen. En la mayoría de niveles altos los números se generan al azar en cada partida.

## Niveles del Wave Quiz

Los niveles 2–9 se basan en los Übungsblätter 1–6, los Zusatzblätter 1–4 y la Altklausur WS 2025/26 (versiones B–E), con los números recalculados y casos del sector cuando encaja.

| Nivel | Nombre | Contenido |
|---|---|---|
| 1 | Orilla | Conceptos del script aplicados al surf y al snowboard |
| 2 | Espuma | Definiciones y frases para completar (formato de examen) |
| 3 | Line-up | Costes de oportunidad, BIP, Grenzertrag, elasticidad, Konsumentenrente |
| 4 | Arrecife | Correlación vs. causalidad, tipos de Marktversagen, leer matrices de pagos |
| 5 | Taller | Rente económica, ventaja comparativa, autarquía vs. especialización, isocostes |
| 6 | Telesilla | Budgetgerade, Cobb-Douglas, complementos perfectos, cuasilineal, efecto renta y sustitución |
| 7 | Pista roja | Varios Nash-Gleichgewichte, Chicken Game, juegos secuenciales y repetidos, Public Good Game |
| 8 | Pista negra | Skalenerträge, elasticidad con funciones, monopolio (Q*, P*, π, DWL), Isoprofit |
| 9 | Cumbre | Equilibrio con desplazamientos, KR, precio máximo, externalidades con C(Q) y EC(Q), Pigou, VPI, BIP |

Desde el nivel 3 hay preguntas de respuesta numérica (se aceptan coma o punto). Las soluciones de la Altklausur para el DWL del monopolio en las versiones D y E usan una altura incorrecta (P_M − P_W en vez de P_M − MC); aquí se usa el cálculo correcto.

## Actualidad: preguntas diarias

Cada día a las 07:00 (Berlín) una rutina de Claude en la nube busca noticias de surf, snowboard/esquí y tecnología y escribe 20 preguntas nuevas en alemán (7 surf, 7 snow, 6 tech, niveles 1–9, capítulos 1–9, al menos 4 numéricas), cada una con su fuente.

- Especificación de la rutina: [`tools/DAILY_NEWS.md`](tools/DAILY_NEWS.md)
- Datos: `js/data/news/index.js` (lista de días) y un archivo por día `js/data/news/AAAA-MM-DD.js`
- Validación: `node tools/validate-news.mjs` comprueba formato, fuentes, reparto y que cada cálculo (`calc`) dé el resultado (`n`).
- Publicación: la rutina hace push a una rama `claude/…`. La Action [`news-merge.yml`](.github/workflows/news-merge.yml) la valida y, si solo cambia `js/data/news/`, la fusiona en `main`; [`pages.yml`](.github/workflows/pages.yml) publica la web.
- Para pausar o borrar la rutina: https://claude.ai/code/routines

Las preguntas de actualidad aparecen en el juego «Actualidad» y, las de los últimos 30 días, también mezcladas en los niveles del Wave Quiz.

## Uso

Es una web estática (HTML, CSS y JavaScript sin dependencias ni build). Abre `index.html` en el navegador o sírvela en local:

```bash
python3 -m http.server 8000
```

y entra en http://localhost:8000.

El progreso (récords y conceptos dominados) se guarda en `localStorage` del navegador.

## Estructura

```
index.html
css/style.css
js/lib.js              helpers: DOM, animaciones, partículas, gráficos SVG
js/main.js             portada y navegación (#memory, #quiz, …)
js/data/concepts.js    247 parejas Begriff–Erklärung
js/data/questions.js   nivel 1: preguntas aplicadas al sector
js/data/levels.js      niveles 2–9 (Übungen + Altklausur)
js/data/news/          actualidad: index.js + un archivo por día
tools/                 validador y especificación de la rutina diaria
.github/workflows/     publicación (Pages) y fusión automática de las preguntas diarias
js/games/*.js          un archivo por juego
```

Para añadir preguntas, edita `js/data/levels.js`: `l` es el nivel, `k` el capítulo; en preguntas tipo test la primera respuesta de `a` es la correcta (el orden se mezcla al jugar); en preguntas numéricas usa `n` (resultado), `tol` (tolerancia) y `u` (unidad).
