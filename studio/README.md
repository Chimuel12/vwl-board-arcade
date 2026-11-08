# VWL Essentials · estudio de vídeo

Genera un reel vertical (1080×1920, 30 fps, ~30 s) por concepto, en alemán. Estilo: fondo oscuro, subtítulos palabra a palabra con las palabras clave en verde lima, ventanas en 3D, cifras animadas, suelo en perspectiva y una línea de tiempo Frage → Definition → Beispiel → Merke.

- Guiones: `scripts/kN.json` (un archivo por capítulo, 247 conceptos).
- Vídeos en calidad completa: `../../videos/kapN/NNN_Konzept.mp4` (fuera del repositorio, ~1,2 GB en total) y una portada `.jpg` con el mismo nombre.
- Copias para la web: `../media/videos/NNN.mp4` + `NNN.jpg` y la lista `../js/data/videos.js` (las crea `publish_web.py`).
- Voz: la voz alemana «Anna» de macOS (`say`).

Requisitos: macOS (por `say`), `ffmpeg` y un entorno de Python con Pillow y NumPy:

```bash
python3 -m venv .venv && .venv/bin/pip install pillow numpy
```

## Uso

```bash
.venv/bin/python render.py scripts/k1.json                      # todo el capítulo
.venv/bin/python render.py scripts/k1.json --only 7             # un concepto (número global)
.venv/bin/python render.py scripts/k1.json --only 7 --stills 2,10,20   # solo imágenes PNG para revisar
```

Opciones: `--jobs N` (vídeos en paralelo) y `--out CARPETA`.

Después, para publicar en la app:

```bash
.venv/bin/python check_scripts.py        # longitudes y glifos de los guiones
.venv/bin/python publish_web.py          # copias 720p + portadas + js/data/videos.js (solo lo que cambió)
```

Las copias web usan H.264 CRF 30 y audio AAC 64 kbit/s mono (~1,3 MB por vídeo), para que la web de GitHub Pages se quede muy por debajo de su límite de 1 GB.

**Otra voz:** instala una voz alemana mejor en Ajustes del Sistema → Accesibilidad → Contenido leído → Voz del sistema → Gestionar voces (por ejemplo «Anna (Premium)»). Después:

```bash
VWL_VOICE="Anna (Premium)" .venv/bin/python render.py scripts/k1.json
```

`VWL_RATE` cambia la velocidad (palabras por minuto, por defecto 182).

## Formato de un guion

```json
{"n": 7, "ch": 1, "term": "Opportunitätskosten",
 "kw": ["Opportunitätskosten", "besten Alternative"],
 "hook": "Was kostet dich eigentlich eine Stunde Surfen?",
 "def": ["Satz 1 der Definition.", "Satz 2."],
 "ex": {"topic": "surf", "lines": ["Beispiel, Satz 1.", "Satz 2."],
        "stat": {"value": 45, "suffix": " €", "label": "Beschriftung unter der Zahl"}},
 "take": "Merke: …",
 "formula": "optional, z. B. Nettonutzen = Nutzen − Kosten"}
```

`topic`: `surf`, `snow`, `tech` o `vwl` (ejemplo de la clase). `kw` define qué palabras se resaltan (como máximo dos por frase). Lo que se dice y lo que se lee es el mismo texto; solo algunas palabras en inglés se pronuncian con una grafía adaptada (`SAY_FIX` en `render.py`).
