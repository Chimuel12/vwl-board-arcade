# VWL Board Arcade

Minijuegos para aprender **Einführung in die VWL** (Universität Stuttgart, Prof. Dr. Dietmar Fehr, Kap. 1–9) con casos de negocio del surf y del snowboard.

Todas las empresas y cifras son ficticias: Salzwasser Surf Co. (escuela y tienda en Ericeira), Gipfelbrett (fábrica de snowboards en Innsbruck), Swell Academy (escuela rival) y Alpenlift AG (estación de esquí).

## Juegos

| Juego | Capítulo | Qué practicas |
|---|---|---|
| Memory de conceptos | Kap 1–9 | Las 247 parejas Begriff–Erklärung del script, con repetición de lo que fallas |
| Wave Quiz | Kap 1–9 | Preguntas aplicadas a tiendas, escuelas y fábricas de tablas, con explicación |
| Board-Markt | Kap 7 | Desplazamientos de oferta y demanda con curvas animadas |
| Preis-Setter | Kap 6 | Precio con Marktmacht: MR = MC, elasticidad, Markup = 1/ε, Deadweight Loss |
| Duelo en la playa | Kap 5 | Nash-Gleichgewicht, Gefangenendilemma, juegos repetidos (Tit-for-Tat, Grim Trigger) |
| Laboratorio Pigou | Kap 8 | Externalidades, MSC = MPC + MEC, impuesto pigouviano |
| Taller doble | Kap 3 | Ventaja absoluta y comparativa, frontera de posibilidades de producción |

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
js/data/questions.js   banco de preguntas aplicadas al sector
js/games/*.js          un archivo por juego
```

Para añadir preguntas, edita `js/data/questions.js` (la primera respuesta de `a` es la correcta; el orden se mezcla al jugar).
