# VWL Board Arcade

Minijuegos para aprender **Einführung in die VWL** (Universität Stuttgart, Prof. Dr. Dietmar Fehr, Kap. 1–9) con casos de negocio del surf y del snowboard.

Todas las empresas y cifras son ficticias: Salzwasser Surf Co. (escuela y tienda en Ericeira), Gipfelbrett (fábrica de snowboards en Innsbruck), Swell Academy (escuela rival) y Alpenlift AG (estación de esquí).

## Juegos

| Juego | Capítulo | Qué practicas |
|---|---|---|
| Memory de conceptos | Kap 1–9 | Las 247 parejas Begriff–Erklärung del script, con repetición de lo que fallas |
| Wave Quiz · 9 niveles | Kap 1–9 | 174 preguntas en 9 niveles de dificultad; 7/10 desbloquea el siguiente |
| Board-Markt | Kap 7 | Desplazamientos de oferta y demanda con curvas animadas |
| Preis-Setter | Kap 6 | Precio con Marktmacht: MR = MC, elasticidad, Markup = 1/ε, Deadweight Loss |
| Duelo en la playa | Kap 5 | Nash-Gleichgewicht, Gefangenendilemma, juegos repetidos (Tit-for-Tat, Grim Trigger) |
| Laboratorio Pigou | Kap 8 | Externalidades, MSC = MPC + MEC, impuesto pigouviano |
| Taller doble | Kap 3 | Ventaja absoluta y comparativa, frontera de posibilidades de producción |

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
js/games/*.js          un archivo por juego
```

Para añadir preguntas, edita `js/data/levels.js`: `l` es el nivel, `k` el capítulo; en preguntas tipo test la primera respuesta de `a` es la correcta (el orden se mezcla al jugar); en preguntas numéricas usa `n` (resultado), `tol` (tolerancia) y `u` (unidad).
