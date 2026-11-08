#!/usr/bin/env python3
"""
VWL Essentials · reel renderer
One vertical video (1080×1920, 30 fps) per concept: German voice-over (macOS `say`), word-by-word captions with
lime keywords, tilted 3D app windows, animated stat counters, a glowing perspective floor and a 4-step timeline.

  .venv/bin/python render.py scripts/k1.json                 # every concept in the file
  .venv/bin/python render.py scripts/k1.json --only 7        # only concept no. 7 (global number)
  .venv/bin/python render.py scripts/k1.json --stills 1,6,14 --only 7   # PNG stills instead of a video
Options: --jobs N (parallel renders, default: CPU count − 1) · --out DIR (default ../videos)
Env: VWL_VOICE (default Anna) · VWL_RATE (words per minute, default 182)
"""
import argparse
import json
import math
import os
import random
import re
import subprocess
import sys
import tempfile
import unicodedata
import wave
from functools import lru_cache
from multiprocessing import Pool

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H, FPS, SR = 1080, 1920, 30, 24000
TOTAL_CONCEPTS = 247
BG = (6, 8, 9)
LIME = (200, 255, 62)
WHITE = (240, 243, 238)
MUTED = (128, 138, 132)
PANEL = (14, 19, 22)
PANEL2 = (21, 27, 31)
BORDER = (44, 53, 58)
TOPICS = {"surf": ((45, 212, 196), "SURF"), "snow": ((150, 190, 255), "SNOW"),
          "tech": ((255, 128, 72), "TECH"), "vwl": (LIME, "VORLESUNG")}
CHAPTERS = {1: "Einführung", 2: "Wohlstand & Ungleichheit", 3: "Technologie & Anreize", 4: "Knappheit & Arbeitszeit",
            5: "Soziale Interaktion", 6: "Firmen", 7: "Angebot & Nachfrage", 8: "Marktversagen", 9: "Konjunktur & Inflation"}
STEPS = ["FRAGE", "DEFINITION", "BEISPIEL", "MERKE"]

AVENIR = "/System/Library/Fonts/Avenir Next.ttc"
MENLO = "/System/Library/Fonts/Menlo.ttc"
WEIGHT = {"bold": 0, "demi": 2, "med": 5, "reg": 7, "heavy": 8, "light": 10}

VOICE = os.environ.get("VWL_VOICE", "Anna")
RATE = os.environ.get("VWL_RATE", "182")
# English loanwords the German voice would mangle (audio only; captions keep the real spelling)
SAY_FIX = [(r"Trade-offs", "Träid-offs"), (r"Trade-off", "Träid-off"), (r"Free-Rider", "Frie-Raider"),
           (r"Reverse Causation", "Riwörs Kosäischen"), (r"Selection Bias", "Selektschen Baias"),
           (r"Treatmentgruppe", "Trietment-Gruppe"), (r"Treatment", "Trietment"), (r"Beach-Cleanup", "Bietsch-Klinapp"),
           (r"Startup", "Startapp"), (r"Peak", "Piek"), (r"Newsletter", "Njusletter"), (r"Social Media", "Soschel Midia"),
           (r"Little Ice Age", "Littel Eis Eitsch"), (r"Learning by Doing", "Lörning bai Duhing"), (r"Spinning Jenny", "Spinning Dschenni"),
           (r"Grim Trigger", "Grimm Trigger"), (r"Tit-for-Tat", "Tit for Tät"), (r"Equality of Opportunity", "Ikwoliti of Opportjuniti"),
           (r"Deservingness", "Disörwingness"), (r"Beauty Contest", "Bjuti Kontest"), (r"Deadweight Loss", "Dedd-weit Loss"),
           (r"Rent-Seeking", "Rent-Sieking"), (r"Moral Hazard", "Morel Häsard"), (r"Market for Lemons", "Market for Lemmens"),
           (r"Pounds that Kill", "Paunds thät Kill"), (r"Child Penalty", "Tschaild Penälti"), (r"Gender Wage Gap", "Dschender Weidsch Gäp"),
           (r"Markup", "Mark-app"), (r"Responder", "Rispondder"), (r"Proposer", "Propouser"), (r"Wave Pool", "Weiv Pul"),
           (r"Toxic Tide", "Toxik Taid"), (r"Java", "Dschawa"), (r"Contest", "Kontest"), (r"Powder", "Pauder"),
           (r"Willingness to Pay", "Willingness tu Pei"), (r"Kiteboards", "Kaitbords"), (r"Hype", "Haip"),
           (r"Hidden Action", "Hidden Äkschen"), (r"Mark-up", "Mark-app"), (r"Leash", "Liesch"), (r"Webcam", "Webkäm"),
           (r"\b([A-ZÄÖÜ]{2,4})\b", lambda m: " ".join(m.group(1)))]  # acronyms letter by letter: BIP → B I P


# ── helpers ────────────────────────────────────────────────────────────────────
@lru_cache(None)
def F(weight, size):
    return ImageFont.truetype(AVENIR, size, index=WEIGHT[weight])


@lru_cache(None)
def M(size, bold=False):
    return ImageFont.truetype(MENLO, size, index=1 if bold else 0)


def clamp(x, a=0.0, b=1.0):
    return a if x < a else b if x > b else x


def ease(x):
    x = clamp(x)
    return 1 - (1 - x) ** 3


def lerp(a, b, t):
    return a + (b - a) * t


def slug(s):
    s = unicodedata.normalize("NFKD", s.replace("ß", "ss").replace("ä", "ae").replace("ö", "oe").replace("ü", "ue")
                              .replace("Ä", "Ae").replace("Ö", "Oe").replace("Ü", "Ue"))
    s = re.sub(r"[^A-Za-z0-9]+", "-", s.encode("ascii", "ignore").decode()).strip("-")
    return s[:60] or "konzept"


def wrap(text, font, maxw):
    lines, cur = [], ""
    for w in text.split():
        t = (cur + " " + w).strip()
        if font.getlength(t) <= maxw or not cur:
            cur = t
        else:
            lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def norm(w):
    return re.sub(r"[^\w-]", "", w).strip("-").lower()


def mark_keywords(words, kws, limit=2):
    """Highlight at most `limit` keyword phrases per sentence (first occurrence of each), like the reel's single lime word."""
    toks, marks = [norm(w) for w in words], [False] * len(words)
    spans = []
    for kw in kws:
        kt = [norm(x) for x in kw.split()]
        for i in range(len(toks) - len(kt) + 1):
            if all(toks[i + j] == kt[j] or (len(kt[j]) >= 5 and toks[i + j].startswith(kt[j])) for j in range(len(kt))):
                spans.append((i, len(kt), kw))
                break
    used = 0
    for i, n, kw in sorted(spans):
        if used >= limit or any(marks[i:i + n]):
            continue
        for j in range(n):
            marks[i + j] = True
        used += 1
    return marks


def fmt_num(v, decimals):
    s = f"{v:,.{decimals}f}"
    return s.replace(",", "X").replace(".", ",").replace("X", ".")


def rounded(draw, box, r, **kw):
    draw.rounded_rectangle(box, radius=r, **kw)


def with_alpha(img, a):
    if a >= 0.999:
        return img
    im = img.copy()
    alpha = im.getchannel("A").point(lambda v: int(v * a))
    im.putalpha(alpha)
    return im


def glow_text(text, font, color, glow_color, blur=14, glow_alpha=170, pad=40):
    w = int(font.getlength(text)) + 2 * pad
    asc, desc = font.getmetrics()
    h = asc + desc + 2 * pad
    g = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    ImageDraw.Draw(g).text((pad, pad), text, font=font, fill=glow_color + (glow_alpha,))
    g = g.filter(ImageFilter.GaussianBlur(blur))
    ImageDraw.Draw(g).text((pad, pad), text, font=font, fill=color + (255,))
    return g


# ── perspective cards ─────────────────────────────────────────────────────────
def quad_coeffs(dst, src):
    a, b = [], []
    for (x, y), (u, v) in zip(dst, src):
        a.append([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.append(u)
        a.append([0, 0, 0, x, y, 1, -v * x, -v * y]); b.append(v)
    return np.linalg.solve(np.array(a, float), np.array(b, float)).tolist()


def project(img, cx, cy, rx=0.0, ry=0.0, scale=1.0, f=1900.0):
    """Rotate a flat card around X (tilt) and Y (turn), project with perspective; returns (image, top-left)."""
    w, h = img.size
    hw, hh = w * scale / 2, h * scale / 2
    rx, ry = math.radians(rx), math.radians(ry)
    pts = []
    for x, y in [(-hw, -hh), (hw, -hh), (hw, hh), (-hw, hh)]:
        y1, z1 = y * math.cos(rx), y * math.sin(rx)
        x2, z2 = x * math.cos(ry) + z1 * math.sin(ry), -x * math.sin(ry) + z1 * math.cos(ry)
        p = f / (f + z2)
        pts.append((cx + x2 * p, cy + y1 * p))
    x0, y0 = math.floor(min(p[0] for p in pts)), math.floor(min(p[1] for p in pts))
    x1, y1 = math.ceil(max(p[0] for p in pts)), math.ceil(max(p[1] for p in pts))
    coeffs = quad_coeffs([(px - x0, py - y0) for px, py in pts], [(0, 0), (w, 0), (w, h), (0, h)])
    return img.transform((x1 - x0, y1 - y0), Image.PERSPECTIVE, coeffs, Image.BICUBIC), (x0, y0)


def paste_card(frame, card, cx, cy, rx, ry, scale, alpha):
    if alpha <= 0.01:
        return
    out, pos = project(with_alpha(card, alpha), cx, cy, rx, ry, scale)
    frame.paste(out, pos, out)


def panel(w, h, glow=LIME, glow_alpha=55, chrome=None, outline=BORDER, fill=PANEL, pad=46):
    """Rounded panel with optional window chrome (three dots + title) and a soft glow; returns (img, inner origin)."""
    im = Image.new("RGBA", (w + 2 * pad, h + 2 * pad), (0, 0, 0, 0))
    if glow:
        g = Image.new("RGBA", im.size, (0, 0, 0, 0))
        rounded(ImageDraw.Draw(g), (pad, pad, pad + w, pad + h), 30, fill=glow + (glow_alpha,))
        im = Image.alpha_composite(im, g.filter(ImageFilter.GaussianBlur(26)))
    d = ImageDraw.Draw(im)
    rounded(d, (pad, pad, pad + w, pad + h), 28, fill=fill + (250,), outline=outline + (255,), width=2)
    top = pad
    if chrome is not None:
        rounded(d, (pad, pad, pad + w, pad + 66), 28, fill=PANEL2 + (255,))
        d.rectangle((pad + 2, pad + 40, pad + w - 2, pad + 66), fill=PANEL2 + (255,))
        d.line((pad, pad + 66, pad + w, pad + 66), fill=BORDER + (255,), width=2)
        for i, c in enumerate([(255, 95, 86), (255, 189, 46), (39, 201, 63)]):
            d.ellipse((pad + 26 + i * 30, pad + 24, pad + 44 + i * 30, pad + 42), fill=c + (230,))
        d.text((pad + 132, pad + 18), chrome, font=M(26), fill=MUTED + (255,))
        top = pad + 66
    return im, (pad, top)


def icon(kind, color, size=64):
    im = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    c = color + (255,)
    s = size
    if kind == "surf":
        for k in range(2):
            y = s * (0.42 + k * 0.26)
            pts = [(x, y + math.sin(x / s * 2 * math.pi * 1.2) * s * 0.09) for x in range(4, s - 3, 3)]
            d.line(pts, fill=c, width=5)
    elif kind == "snow":
        d.polygon([(s * 0.06, s * 0.88), (s * 0.40, s * 0.22), (s * 0.58, s * 0.52), (s * 0.70, s * 0.36), (s * 0.95, s * 0.88)], outline=c, width=5)
        d.polygon([(s * 0.40, s * 0.22), (s * 0.50, s * 0.42), (s * 0.30, s * 0.42)], fill=c)
    elif kind == "tech":
        rounded(d, (s * 0.22, s * 0.22, s * 0.78, s * 0.78), 6, outline=c, width=5)
        for k in range(3):
            o = s * (0.34 + k * 0.16)
            for a, b in [((o, s * 0.06), (o, s * 0.2)), ((o, s * 0.8), (o, s * 0.94)), ((s * 0.06, o), (s * 0.2, o)), ((s * 0.8, o), (s * 0.94, o))]:
                d.line([a, b], fill=c, width=4)
    else:  # lecture: open book
        d.polygon([(s * 0.06, s * 0.24), (s * 0.48, s * 0.32), (s * 0.48, s * 0.86), (s * 0.06, s * 0.78)], outline=c, width=5)
        d.polygon([(s * 0.94, s * 0.24), (s * 0.52, s * 0.32), (s * 0.52, s * 0.86), (s * 0.94, s * 0.78)], outline=c, width=5)
    return im


# ── shared backgrounds (built once per worker) ────────────────────────────────
_BASE = None
_FLOOR = None
HORIZON = 900


def base_bg():
    global _BASE
    if _BASE is None:
        yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
        r = np.sqrt(((xx - W / 2) / W) ** 2 + ((yy - H * 0.42) / H) ** 2)
        k = np.clip(1.0 - r * 1.5, 0, 1)[..., None]
        top = np.array([16, 21, 23], np.float32)
        img = np.array(BG, np.float32) * (1 - k) + top * k
        _BASE = Image.fromarray(img.astype(np.uint8), "RGB")
    return _BASE


@lru_cache(None)
def lime_sheet():
    return Image.new("RGB", (W, H - HORIZON), LIME)


_GLOW = {}


def glow_cached(text, size):
    if text not in _GLOW:
        if len(_GLOW) > 400:
            _GLOW.clear()
        _GLOW[text] = glow_text(text, F("heavy", size), WHITE, LIME)
    return _GLOW[text]


def floor_frames(n=30):
    """Looping perspective grid (grayscale masks) that scrolls towards the viewer."""
    global _FLOOR
    if _FLOOR is None:
        fh = H - HORIZON
        frames = []
        for i in range(n):
            ph = i / n
            m = Image.new("L", (W, fh), 0)
            d = ImageDraw.Draw(m)
            for k in range(-20, 21):
                d.line([(W / 2 + k * 8, 0), (W / 2 + k * 110, fh)], fill=64, width=2)
            for j in range(0, 32):
                z = 0.3 + (j - ph) * 0.5
                if z < 0.299:
                    continue
                y = 300 / z - 300 / 15.8
                if 0 <= y < fh:
                    shade = int(clamp(y / fh * 2.2) * 150) + 18
                    d.line([(0, y), (W, y)], fill=shade, width=2 if y > 120 else 1)
            fade = Image.linear_gradient("L").resize((W, fh)).point(lambda v: int(clamp(v / 255 * 1.6) * 255))
            m = Image.composite(m, Image.new("L", (W, fh), 0), fade)
            m = Image.blend(m, m.filter(ImageFilter.GaussianBlur(3)), 0.45)
            frames.append(m)
        _FLOOR = frames
    return _FLOOR


# ── text-to-speech and audio ──────────────────────────────────────────────────
def speakable(text):
    t = text
    for a, b in SAY_FIX:
        t = re.sub(a, b, t)
    return t.replace("–", ",").replace("€", " Euro").replace("%", " Prozent").replace("→", ",")


def tts(text, path):
    subprocess.run(["say", "-v", VOICE, "-r", RATE, "--file-format=WAVE", f"--data-format=LEI16@{SR}", "-o", path, speakable(text)],
                   check=True)
    with wave.open(path, "rb") as w:
        return np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16)


def mix_audio(segs, cuts, total, path, seed):
    n = int(total * SR) + SR // 2
    out = np.zeros(n, np.float32)
    for s in segs:
        i = int(s["start"] * SR)
        p = s["pcm"].astype(np.float32) / 32768.0
        out[i:i + len(p)] += p[: max(0, n - i)] * 0.95
    t = np.arange(n) / SR
    pad = (np.sin(2 * np.pi * 55 * t) * 0.5 + np.sin(2 * np.pi * 82.41 * t) * 0.32 + np.sin(2 * np.pi * 110.3 * t) * 0.22)
    pad *= 0.55 + 0.45 * np.sin(2 * np.pi * 0.07 * t)
    env = np.clip(t / 2.0, 0, 1) * np.clip((total - t) / 1.6, 0, 1)
    out += pad * env * 0.02
    rng = np.random.default_rng(seed)
    for c in cuts:  # soft whoosh on every scene change
        L = int(0.55 * SR)
        noise = rng.standard_normal(L).astype(np.float32)
        noise = np.convolve(noise, np.ones(40) / 40, mode="same")
        e = np.sin(np.linspace(0, np.pi, L)) ** 2
        i = max(0, int((c - 0.25) * SR))
        seg = (noise * e * 0.12)[: max(0, n - i)]
        out[i:i + len(seg)] += seg
    out = np.clip(out, -1, 1)
    with wave.open(path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((out * 32767).astype(np.int16).tobytes())


# ── the video ────────────────────────────────────────────────────────────────
class Reel:
    def __init__(self, sc, tmp):
        self.sc = sc
        self.kws = sc.get("kw", [sc["term"]])
        self.rng = random.Random(sc["n"] * 7919)
        blocks = [("hook", [sc["hook"]]), ("def", sc["def"]), ("ex", sc["ex"]["lines"]), ("take", [sc["take"]])]
        self.segs, t, self.scene_start = [], 0.55, {}
        for kind, lines in blocks:
            self.scene_start[kind] = max(0.0, t - 0.25) if kind != "hook" else 0.0
            for line in lines:
                pcm = tts(line, os.path.join(tmp, f"s{len(self.segs)}.wav"))
                d = len(pcm) / SR
                self.segs.append({"kind": kind, "text": line, "start": t, "dur": d, "pcm": pcm, "layout": self.layout(line)})
                t += d + 0.3
            t += 0.3
        self.scene_start["outro"] = t
        self.total = t + 3.0
        self.order = ["hook", "def", "ex", "take", "outro"]
        self.build_assets()
        self.particles = [(self.rng.uniform(0, W), self.rng.uniform(0, H), self.rng.uniform(10, 45), self.rng.uniform(1.5, 4.2),
                           self.rng.uniform(0.15, 0.7), self.rng.random() < 0.7) for _ in range(70)]

    # caption layout: words with positions; keywords bold + lime
    def layout(self, text):
        words = text.split()
        marks = mark_keywords(words, self.kws)
        for size in (72, 64, 58, 52):
            fr, fb = F("reg", size), F("bold", size)
            sp = fr.getlength(" ")
            lines, line, lw = [], [], 0.0
            for wd, mk in zip(words, marks):
                wl = (fb if mk else fr).getlength(wd)
                if line and lw + sp + wl > 940:
                    lines.append((line, lw))
                    line, lw = [], 0.0
                lw += (sp if line else 0) + wl
                line.append((wd, mk, wl))
            if line:
                lines.append((line, lw))
            if len(lines) <= 4:
                break
        lh = int(size * 1.34)
        y0 = 400 - (lh * len(lines)) // 2
        items, chars = [], 0
        for li, (line, lw) in enumerate(lines):
            x = (W - lw) / 2
            for wd, mk, wl in line:
                items.append({"w": wd, "mk": mk, "x": x, "y": y0 + li * lh, "wl": wl, "c0": chars})
                chars += len(wd) + 2
                x += wl + sp
        for it in items:
            it["f0"] = it["c0"] / max(1, chars)
        return {"items": items, "size": size}

    def build_assets(self):
        sc = self.sc
        ch = sc["ch"]
        # hook card
        term = sc["term"]
        size = 128
        longest = max(term.split(), key=lambda w: F("heavy", 128).getlength(w))
        size = min(128, int(128 * 820 / max(1, F("heavy", 128).getlength(longest))))
        tl = wrap(term, F("heavy", size), 840)
        th = int(size * 1.08) * len(tl)
        card, (ox, oy) = panel(920, 210 + th, chrome=None, glow_alpha=60)
        d = ImageDraw.Draw(card)
        d.text((ox + 50, oy + 46), f"KONZEPT {sc['n']:03d}/{TOTAL_CONCEPTS}", font=M(28), fill=MUTED + (255,))
        pill = f"KAP. {ch}"
        pw = M(26, True).getlength(pill) + 36
        rounded(d, (ox + 870 - pw, oy + 38, ox + 870, oy + 86), 24, outline=LIME + (255,), width=2)
        d.text((ox + 870 - pw + 18, oy + 48), pill, font=M(26, True), fill=LIME + (255,))
        for i, ln in enumerate(tl):
            d.text((ox + 50, oy + 110 + i * int(size * 1.08)), ln, font=F("heavy", size), fill=WHITE + (255,))
        uy = oy + 120 + th
        d.rectangle((ox + 52, uy, ox + 52 + min(760, F("heavy", size).getlength(tl[-1])), uy + 8), fill=LIME + (255,))
        self.hook_card = card
        # definition window (typewriter)
        self.def_text = " ".join(sc["def"])
        self.def_font = F("med", 50)
        self.def_lines = wrap(self.def_text, self.def_font, 800)
        dh = 66 + 100 + len(self.def_lines) * 70 + 36  # chrome + prompt line + text + bottom margin
        self.def_card, self.def_origin = panel(900, dh, chrome=f"definition — {slug(term).lower()}", glow_alpha=45)
        ImageDraw.Draw(self.def_card).text((self.def_origin[0] + 44, self.def_origin[1] + 34), "› " + term, font=M(30, True), fill=LIME + (255,))
        # example window (lines revealed one by one)
        ex = sc["ex"]
        topic = ex.get("topic", "vwl")
        self.topic_color, self.topic_label = TOPICS.get(topic, TOPICS["vwl"])
        self.topic_icon = icon(topic, self.topic_color, 60)
        self.ex_font = F("med", 46)
        self.ex_wrapped = [wrap(l, self.ex_font, 790) for l in ex["lines"]]
        eh = 66 + 46 + sum(len(w) * 62 + 34 for w in self.ex_wrapped) + 20
        self.ex_card, self.ex_origin = panel(900, eh, chrome=f"beispiel — {self.topic_label.lower()}", glow=self.topic_color, glow_alpha=45)
        self.stat = ex.get("stat")
        # takeaway card
        take = re.sub(r"^\s*Merke:\s*", "", sc["take"])  # the scene already shows a MERKE label
        words = take.split()
        marks = mark_keywords(words, self.kws)
        tf, tb = F("demi", 56), F("heavy", 56)
        lines, line, lw = [], [], 0.0
        sp = tf.getlength(" ")
        for wd, mk in zip(words, marks):
            wl = (tb if mk else tf).getlength(wd)
            if line and lw + sp + wl > 780:
                lines.append(line)
                line, lw = [], 0.0
            lw += (sp if line else 0) + wl
            line.append((wd, mk, wl))
        if line:
            lines.append(line)
        tch = 110 + len(lines) * 78 + (110 if sc.get("formula") else 0)
        card, (ox, oy) = panel(900, tch, glow_alpha=80, outline=LIME, fill=(12, 17, 15))
        d = ImageDraw.Draw(card)
        y = oy + 52
        if sc.get("formula"):
            fx = sc["formula"]
            ff = M(44, True)
            while ff.getlength(fx) > 800 and ff.size > 26:
                ff = M(ff.size - 2, True)
            rounded(d, (ox + 44, y - 10, ox + 856, y + 74), 16, fill=(24, 32, 24, 255))
            d.text((ox + 450 - ff.getlength(fx) / 2, y + 32 - ff.size * 0.62), fx, font=ff, fill=LIME + (255,))
            y += 110
        for line in lines:
            x = ox + 50
            for wd, mk, wl in line:
                d.text((x, y), wd, font=tb if mk else tf, fill=(LIME if mk else WHITE) + (255,))
                x += wl + sp
            y += 78
        self.take_card = card

    # ── per-frame drawing ──
    def scene_at(self, t):
        cur = "hook"
        for k in self.order:
            if t >= self.scene_start[k]:
                cur = k
        return cur

    def scene_alpha(self, kind, t):
        s = self.scene_start[kind]
        nxt = self.order.index(kind) + 1
        e = self.scene_start[self.order[nxt]] if nxt < len(self.order) else self.total
        return clamp((t - s) / 0.4) * clamp((e - t) / 0.3 + (1 if kind == "outro" else 0))

    def caption(self, frame, t):
        seg = None
        for s in self.segs:
            if s["start"] - 0.05 <= t:
                seg = s
        if seg is None or self.scene_at(t) == "outro":
            return
        lay = seg["layout"]
        size = lay["size"]
        fr, fb = F("reg", size), F("bold", size)
        layer = Image.new("RGBA", (W, 300 + size * 5), (0, 0, 0, 0))
        d = ImageDraw.Draw(layer)
        off = 150
        prog = (t - seg["start"]) / max(0.3, seg["dur"])
        for it in lay["items"]:
            appear = it["f0"] * 0.97
            a = clamp((prog - appear) * seg["dur"] / 0.12)
            if a <= 0:
                continue
            y = it["y"] - off + (1 - ease(a)) * 14
            col = (LIME if it["mk"] else WHITE) + (int(255 * a),)
            d.text((it["x"], y), it["w"], font=fb if it["mk"] else fr, fill=col)
            if it["mk"]:
                ul = it["wl"] * ease(a * 1.2)
                d.rectangle((it["x"], y + size * 1.16, it["x"] + ul, y + size * 1.16 + 5), fill=LIME + (int(220 * a),))
        frame.paste(layer, (0, off), layer)

    def chrome(self, frame, d, t):
        ch = self.sc["ch"]
        d.text((70, 104), "VWL ESSENTIALS", font=M(28, True), fill=LIME)
        right = f"KAP. {ch} · {self.sc['n']:03d}/{TOTAL_CONCEPTS}"
        d.text((1010 - M(26).getlength(right), 106), right, font=M(26), fill=MUTED)
        d.rectangle((0, H - 8, int(W * clamp(t / self.total)), H), fill=LIME)

    def timeline(self, frame, d, t):
        cur = self.scene_at(t)
        idx = self.order.index(cur)
        xs = [190, 423, 657, 890]
        y = 1545
        d.line((xs[0], y, xs[-1], y), fill=BORDER, width=4)
        done_x = xs[0]
        for i, x in enumerate(xs):
            if i < idx or (i == idx and cur != "outro"):
                done_x = x
        if idx >= 4:
            done_x = xs[-1]
        d.line((xs[0], y, done_x, y), fill=LIME, width=4)
        for i, x in enumerate(xs):
            active = i == idx
            if i < idx or idx >= 4:
                d.ellipse((x - 13, y - 13, x + 13, y + 13), fill=LIME)
            elif active:
                pulse = 0.5 + 0.5 * math.sin(t * 6)
                r = 20 + 4 * pulse
                d.ellipse((x - r, y - r, x + r, y + r), outline=LIME, width=4)
                d.ellipse((x - 9, y - 9, x + 9, y + 9), fill=LIME)
            else:
                d.ellipse((x - 13, y - 13, x + 13, y + 13), outline=MUTED, width=3, fill=BG)
            lab = STEPS[i]
            col = LIME if (active or i < idx or idx >= 4) else MUTED
            d.text((x - M(22).getlength(lab) / 2, y + 30), lab, font=M(22, active), fill=col)

    def frame(self, i):
        t = i / FPS
        fr = base_bg().copy()
        cur = self.scene_at(t)
        # floor (stronger in hook and outro)
        fl = floor_frames()[i % 30]
        k = {"hook": 1.0, "def": 0.55, "ex": 0.7, "take": 0.6, "outro": 1.0}[cur]
        fr.paste(lime_sheet(), (0, HORIZON), fl.point(lambda v: int(v * k)))
        d = ImageDraw.Draw(fr)
        for (px, py, sp, r, a, lime) in self.particles:
            y = (py - sp * t) % H
            x = px + math.sin(t * 0.6 + py) * 8
            c = LIME if lime else WHITE
            tw = 0.6 + 0.4 * math.sin(t * 2 + px)
            col = tuple(int(BG[j] + (c[j] - BG[j]) * a * tw) for j in range(3))
            d.ellipse((x - r, y - r, x + r, y + r), fill=col)
        self.chrome(fr, d, t)
        self.caption(fr, t)
        drift = math.sin(t * 0.5)
        if cur == "hook":
            a = self.scene_alpha("hook", t)
            p = ease(t / 0.9)
            paste_card(fr, self.hook_card, W / 2, 1010 + (1 - p) * 120, lerp(24, 9, p) + drift * 1.5, lerp(-18, -7, p) + drift * 2, lerp(0.92, 1.08, p), a)
        elif cur == "def":
            self.draw_def(fr, t)
        elif cur == "ex":
            self.draw_ex(fr, t)
        elif cur == "take":
            a = self.scene_alpha("take", t)
            p = ease((t - self.scene_start["take"]) / 0.6)
            d.text((W / 2 - M(30, True).getlength("MERKE") / 2, 690), "MERKE", font=M(30, True), fill=tuple(int(BG[j] + (LIME[j] - BG[j]) * a) for j in range(3)))
            paste_card(fr, self.take_card, W / 2, 1040, lerp(10, 4, p) + drift, lerp(8, 3, p) + drift, lerp(0.9, 1.0, p), a)
        if cur != "outro":
            self.timeline(fr, d, t)
        else:
            self.draw_outro(fr, t)
        if t > self.total - 0.6:
            fr = Image.blend(fr, Image.new("RGB", (W, H), (0, 0, 0)), clamp((t - (self.total - 0.6)) / 0.6))
        return fr

    def draw_def(self, fr, t):
        s0 = self.scene_start["def"]
        a = self.scene_alpha("def", t)
        p = ease((t - s0) / 0.55)
        segs = [s for s in self.segs if s["kind"] == "def"]
        t0, t1 = segs[0]["start"], segs[-1]["start"] + segs[-1]["dur"]
        n = int(len(self.def_text) * clamp((t - t0) / max(0.5, (t1 - t0) * 0.92)))
        card = self.def_card.copy()
        d = ImageDraw.Draw(card)
        ox, oy = self.def_origin
        y, left = oy + 100, n
        cx, cy = ox + 44, y
        for ln in self.def_lines:
            if left <= 0:
                break
            part = ln[:left]
            d.text((ox + 44, y), part, font=self.def_font, fill=WHITE + (255,))
            cx, cy = ox + 44 + self.def_font.getlength(part), y
            left -= len(ln) + 1
            y += 70
        if int(t * 2.4) % 2 == 0 or n < len(self.def_text):
            d.rectangle((cx + 6, cy + 8, cx + 30, cy + 58), fill=LIME + (255,))
        drift = math.sin(t * 0.5)
        paste_card(fr, card, W / 2 + (1 - p) * 260, 1040, lerp(12, 6, p) + drift, lerp(16, 6, p) + drift * 2, lerp(0.92, 1.0, p), a)

    def draw_ex(self, fr, t):
        s0 = self.scene_start["ex"]
        a = self.scene_alpha("ex", t)
        p = ease((t - s0) / 0.55)
        d = ImageDraw.Draw(fr)
        # topic chip
        lab = "BEISPIEL · " + self.topic_label
        cw = 60 + 24 + M(26, True).getlength(lab) + 40
        chip = Image.new("RGBA", (int(cw), 84), (0, 0, 0, 0))
        cd = ImageDraw.Draw(chip)
        rounded(cd, (1, 1, cw - 1, 83), 42, outline=self.topic_color + (255,), width=3, fill=PANEL + (230,))
        chip.paste(self.topic_icon, (16, 12), self.topic_icon)
        cd.text((92, 26), lab, font=M(26, True), fill=self.topic_color + (255,))
        chip = with_alpha(chip, a)
        y_card = 1130
        if self.stat:
            fr.paste(chip, (int(W / 2 - cw / 2), 640), chip)
            st = self.stat
            q = ease((t - s0 - 0.3) / 1.3)
            dec = st.get("decimals", 0 if float(st["value"]).is_integer() else 2)
            txt = st.get("prefix", "") + fmt_num(st["value"] * q, dec) + st.get("suffix", "")
            g = with_alpha(glow_cached(txt, 150), a)
            fr.paste(g, (int(W / 2 - g.width / 2), 700), g)
            lab2 = st.get("label", "")
            for k, ln in enumerate(wrap(lab2, M(28), 900)):
                d.text((W / 2 - M(28).getlength(ln) / 2, 905 + k * 38), ln, font=M(28), fill=tuple(int(BG[j] + (MUTED[j] - BG[j]) * a) for j in range(3)))
            y_card = 1235
        else:
            fr.paste(chip, (int(W / 2 - cw / 2), 660), chip)
        card = self.ex_card.copy()
        cd = ImageDraw.Draw(card)
        ox, oy = self.ex_origin
        y = oy + 46
        segs = [s for s in self.segs if s["kind"] == "ex"]
        for k, lines in enumerate(self.ex_wrapped):
            la = clamp((t - segs[k]["start"] + 0.15) / 0.35)
            if la > 0:
                cd.ellipse((ox + 44, y + 22, ox + 60, y + 38), fill=self.topic_color + (int(255 * la),))
                for j, ln in enumerate(lines):
                    cd.text((ox + 84, y + j * 62), ln, font=self.ex_font, fill=WHITE + (int(255 * la),))
            y += len(lines) * 62 + 34
        drift = math.sin(t * 0.5)
        sc = 1.0 if not self.stat else 0.9
        paste_card(fr, card, W / 2 - (1 - p) * 260, y_card, lerp(12, 6, p) + drift, lerp(-16, -6, p) - drift * 2, lerp(0.92, 1.0, p) * sc, a)

    def draw_outro(self, fr, t):
        s0 = self.scene_start["outro"]
        p = ease((t - s0) / 0.7)
        a = clamp((t - s0) / 0.5)
        g = glow_text("VWL ESSENTIALS", F("heavy", 96), WHITE, LIME, blur=18, glow_alpha=140)
        g = with_alpha(g, a)
        fr.paste(g, (int(W / 2 - g.width / 2), int(820 + (1 - p) * 60)), g)
        d = ImageDraw.Draw(fr)

        def ctext(y, s, font, col):
            c = tuple(int(BG[j] + (col[j] - BG[j]) * a) for j in range(3))
            d.text((W / 2 - font.getlength(s) / 2, y), s, font=font, fill=c)
        ctext(1000, f"Kap. {self.sc['ch']} · {CHAPTERS[self.sc['ch']]}", F("demi", 52), LIME)
        ctext(1080, f"Teil {self.sc['n']} von {TOTAL_CONCEPTS}", F("reg", 44), WHITE)
        ctext(1230, "Alle Konzepte zum Üben:", M(28), MUTED)
        ctext(1272, "chimuel12.github.io/vwl-board-arcade", M(28, True), MUTED)

    def stills(self, times, out_dir):
        os.makedirs(out_dir, exist_ok=True)
        paths = []
        for tt in times:
            i = min(int(tt * FPS), int(self.total * FPS) - 1)
            p = os.path.join(out_dir, f"{self.sc['n']:03d}_{tt:05.1f}s.png")
            self.frame(i).save(p)
            paths.append(p)
        return paths

    def render(self, out_path, tmp):
        audio = os.path.join(tmp, "voice.wav")
        cuts = [self.scene_start[k] for k in ["def", "ex", "take", "outro"]]
        mix_audio(self.segs, cuts, self.total, audio, self.sc["n"])
        n = int(self.total * FPS)
        cmd = ["ffmpeg", "-loglevel", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS),
               "-i", "-", "-i", audio, "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p",
               "-c:a", "aac", "-b:a", "160k", "-shortest", "-movflags", "+faststart", out_path]
        proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
        cover = None
        for i in range(n):
            f = self.frame(i)
            if i == int(1.6 * FPS):
                cover = f
            proc.stdin.write(f.tobytes())
        proc.stdin.close()
        if proc.wait() != 0:
            raise RuntimeError("ffmpeg failed for " + out_path)
        if cover is not None:
            cover.convert("RGB").save(out_path[:-4] + ".jpg", quality=88)
        return self.total


def job(args):
    sc, out_dir, stills = args
    ch_dir = os.path.join(out_dir, f"kap{sc['ch']}")
    os.makedirs(ch_dir, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        reel = Reel(sc, tmp)
        if stills:
            return sc["n"], reel.stills(stills, os.path.join(out_dir, "_stills")), reel.total
        out = os.path.join(ch_dir, f"{sc['n']:03d}_{slug(sc['term'])}.mp4")
        reel.render(out, tmp)
        return sc["n"], out, reel.total


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("scripts", nargs="+")
    ap.add_argument("--only", default="")
    ap.add_argument("--jobs", type=int, default=max(1, (os.cpu_count() or 2) - 1))
    # full-quality renders stay outside the repo (VWL/videos); publish_web.py makes the small web copies
    ap.add_argument("--out", default=os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "videos"))
    ap.add_argument("--stills", default="")
    a = ap.parse_args()
    scs = []
    for p in a.scripts:
        with open(p, encoding="utf-8") as fh:
            scs += json.load(fh)
    if a.only:
        keep = {int(x) for x in a.only.split(",")}
        scs = [s for s in scs if s["n"] in keep]
    stills = [float(x) for x in a.stills.split(",")] if a.stills else None
    out = os.path.abspath(a.out)
    tasks = [(s, out, stills) for s in scs]
    print(f"{len(tasks)} Konzepte · {a.jobs} parallel · Ausgabe: {out}", flush=True)
    with Pool(min(a.jobs, len(tasks)) or 1) as pool:
        for n, path, total in pool.imap_unordered(job, tasks):
            print(f"✓ {n:03d}  {total:5.1f}s  {path if isinstance(path, str) else ', '.join(path)}", flush=True)


if __name__ == "__main__":
    main()
