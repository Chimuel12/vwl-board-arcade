#!/usr/bin/env python3
"""Checks the reel scripts: numbering, required fields, glyphs the Avenir font can't draw, keyword hits.
   .venv/bin/python check_scripts.py scripts/k*.json"""
import json
import sys

import numpy as np
from PIL import ImageFont

AV = ImageFont.truetype("/System/Library/Fonts/Avenir Next.ttc", 60, index=8)
NOTDEF = np.array(AV.getmask(""))


def drawable(ch):
    if ch.isspace():
        return True
    m = np.array(AV.getmask(ch))
    return m.size > 0 and (m.shape != NOTDEF.shape or not np.array_equal(m, NOTDEF))


errors, seen = [], {}
for path in sys.argv[1:]:
    for s in json.load(open(path, encoding="utf-8")):
        w = f"{path.split('/')[-1]} #{s.get('n')}"
        for k in ("n", "ch", "term", "hook", "def", "ex", "take"):
            if k not in s:
                errors.append(f"{w}: falta {k}")
        if s.get("n") in seen:
            errors.append(f"{w}: número repetido")
        seen[s.get("n")] = s.get("term")
        texts = [s["term"], s["hook"], s["take"], *s["def"], *s["ex"]["lines"], *s.get("kw", [])]
        st = s["ex"].get("stat")
        if st:
            texts += [st.get("label", ""), st.get("suffix", ""), st.get("prefix", "")]
            if not isinstance(st.get("value"), (int, float)):
                errors.append(f"{w}: stat.value debe ser número")
        bad = sorted({c for t in texts for c in t if not drawable(c)})
        if bad:
            errors.append(f"{w}: caracteres sin glifo en Avenir: {''.join(bad)}")
        if s["ex"].get("topic") not in ("surf", "snow", "tech", "vwl"):
            errors.append(f"{w}: topic inválido")
        if not (1 <= len(s["def"]) <= 3 and 1 <= len(s["ex"]["lines"]) <= 3):
            errors.append(f"{w}: def/ex deben tener 1–3 frases")
        spoken = " ".join([s["hook"], *s["def"], *s["ex"]["lines"], s["take"]]).lower()
        if not any(k.lower().split()[0][:5] in spoken for k in s.get("kw", [])):
            errors.append(f"{w}: ninguna palabra clave aparece en el texto hablado")
nums = sorted(n for n in seen if isinstance(n, int))
gaps = [n for n in range(nums[0], nums[-1] + 1) if n not in seen] if nums else []
if gaps:
    errors.append(f"faltan números: {gaps}")
print("\n".join(errors) or "OK")
print(f"{len(seen)} guiones · {nums[0] if nums else '-'}–{nums[-1] if nums else '-'}")
sys.exit(1 if errors else 0)
