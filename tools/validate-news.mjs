#!/usr/bin/env node
/* Validates the "Actualidad" data before it is published.
   - js/data/news/index.js   manifest: NEWS_DAYS.push({ d, n, title })
   - js/data/news/<d>.js     NEWS_DAY("<d>", [ ...questions ])
   Usage: node tools/validate-news.mjs        → exit code 1 on any error
   Rules are described in tools/DAILY_NEWS.md. */
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIR = path.join(ROOT, "js/data/news");
const TOPICS = ["surf", "snow", "tech"];
const PER_DAY = 20, STRICT_FROM = "2026-11-08";
const errors = [], warnings = [];
const err = (where, msg) => errors.push(`✗ ${where}: ${msg}`);
const warn = (where, msg) => warnings.push(`! ${where}: ${msg}`);

function run(file, extra) {
  const ctx = Object.assign({ console }, extra);
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(file, "utf8"), ctx, { filename: path.relative(ROOT, file), timeout: 2000 });
  return ctx;
}
function evalCalc(expr) {
  if (!/^[0-9+\-*/().\s]+$/.test(expr)) throw new Error("calc solo admite números, espacios y + - * / ( )");
  const v = Function(`"use strict"; return (${expr});`)();
  if (typeof v !== "number" || !isFinite(v)) throw new Error("calc no da un número finito");
  return v;
}
// does a text contain the value v (0–2 decimals, German or English notation)?
function mentions(text, v) {
  const t = String(text).replace(/\s/g, "");
  for (let dp = 0; dp <= 2; dp++) {
    const plain = v.toFixed(dp);
    const de = new Intl.NumberFormat("de-DE", { minimumFractionDigits: dp, maximumFractionDigits: dp }).format(v);
    if ([plain, plain.replace(".", ","), de].some(s => t.includes(s))) return true;
  }
  return false;
}
const isStr = (s, min = 1) => typeof s === "string" && s.trim().length >= min;
const isInt = (v, a, b) => Number.isInteger(v) && v >= a && v <= b;

// ── manifest
const manifestFile = path.join(DIR, "index.js");
let days = [];
try { days = run(manifestFile).NEWS_DAYS || []; }
catch (e) { err("index.js", "no se puede ejecutar: " + e.message); }
if (!Array.isArray(days)) { err("index.js", "NEWS_DAYS no es un array"); days = []; }

const seen = new Set();
days.forEach((m, i) => {
  const w = `index.js[${i}]`;
  if (!m || !/^\d{4}-\d{2}-\d{2}$/.test(m.d)) return err(w, "d debe ser YYYY-MM-DD");
  if (seen.has(m.d)) err(w, `fecha duplicada ${m.d}`);
  seen.add(m.d);
  if (!isStr(m.title, 10) || m.title.length > 180) err(w, "title debe tener 10–180 caracteres");
  if (!Number.isInteger(m.n)) err(w, "n debe ser un entero");
  if (!fs.existsSync(path.join(DIR, m.d + ".js"))) err(w, `falta el archivo js/data/news/${m.d}.js`);
});
for (const f of fs.readdirSync(DIR)) {
  if (f === "index.js") continue;
  const d = f.replace(/\.js$/, "");
  if (!/^\d{4}-\d{2}-\d{2}\.js$/.test(f)) err(f, "nombre de archivo inesperado (usa YYYY-MM-DD.js)");
  else if (!seen.has(d)) err(f, "el día no está en el manifest index.js");
}

// ── day files
const allQ = new Map();
for (const m of days) {
  const file = path.join(DIR, m.d + ".js");
  if (!fs.existsSync(file)) continue;
  const got = {};
  try { run(file, { NEWS_DAY: (d, items) => { got[d] = items; } }); }
  catch (e) { err(m.d, "no se puede ejecutar: " + e.message); continue; }
  const keys = Object.keys(got);
  if (keys.length !== 1 || keys[0] !== m.d) { err(m.d, `debe llamar exactamente una vez a NEWS_DAY("${m.d}", [...])`); continue; }
  const items = got[m.d];
  if (!Array.isArray(items)) { err(m.d, "el segundo argumento debe ser un array"); continue; }
  if (m.n !== items.length) err(m.d, `el manifest dice n = ${m.n}, pero hay ${items.length} preguntas`);
  if (m.d >= STRICT_FROM && items.length !== PER_DAY) err(m.d, `debe tener exactamente ${PER_DAY} preguntas (tiene ${items.length})`);

  const topicCount = { surf: 0, snow: 0, tech: 0 }, levels = new Set(), chapters = new Set();
  let numeric = 0;
  items.forEach((q, i) => {
    const w = `${m.d} #${i + 1}`;
    if (!q || typeof q !== "object") return err(w, "no es un objeto");
    if (!TOPICS.includes(q.t)) err(w, `t debe ser ${TOPICS.join("/")}`); else topicCount[q.t]++;
    if (!isInt(q.l, 1, 9)) err(w, "l (nivel) debe ser un entero 1–9"); else levels.add(q.l);
    if (!isInt(q.k, 1, 9)) err(w, "k (capítulo) debe ser un entero 1–9"); else chapters.add(q.k);
    if (!isStr(q.q, 30)) err(w, "q (pregunta) demasiado corta");
    if (!isStr(q.x, 30)) err(w, "x (explicación) demasiado corta");
    const key = String(q.q).trim().toLowerCase();
    if (allQ.has(key)) (allQ.get(key) === m.d ? err : warn)(w, `pregunta repetida (también en ${allQ.get(key)})`);
    allQ.set(key, m.d);

    const hasA = q.a !== undefined, hasN = q.n !== undefined;
    if (hasA === hasN) err(w, "usa o bien a (test) o bien n (numérica)");
    if (hasA) {
      if (!Array.isArray(q.a) || q.a.length < 3 || q.a.length > 5) err(w, "a debe tener 3–5 respuestas");
      else {
        if (q.a.some(x => !isStr(x) || x.length > 240)) err(w, "cada respuesta debe ser texto de 1–240 caracteres");
        if (new Set(q.a.map(x => String(x).trim().toLowerCase())).size !== q.a.length) err(w, "respuestas repetidas");
      }
      if (q.calc !== undefined) {
        try { const v = evalCalc(q.calc); if (!mentions(q.a[0], v)) err(w, `calc = ${v}, pero la respuesta correcta (a[0]) no contiene ese número`); }
        catch (e) { err(w, e.message); }
      }
    }
    if (hasN) {
      numeric++;
      if (typeof q.n !== "number" || !isFinite(q.n)) err(w, "n debe ser un número");
      if (typeof q.tol !== "number" || q.tol < 0) err(w, "tol debe ser un número ≥ 0");
      else if (q.tol === 0) warn(w, "tol = 0: conviene aceptar un pequeño redondeo");
      if (q.u !== undefined && typeof q.u !== "string") err(w, "u (unidad) debe ser texto");
      if (!isStr(q.calc)) err(w, "las preguntas numéricas necesitan calc (la cuenta que da n)");
      else {
        try { const v = evalCalc(q.calc); if (Math.abs(v - q.n) > (q.tol || 0) + 1e-9) err(w, `calc = ${v} no coincide con n = ${q.n} (tol ${q.tol})`); }
        catch (e) { err(w, e.message); }
      }
    }
    const src = q.src === undefined ? [] : [].concat(q.src);
    if (!src.length) err(w, "falta src (fuente de la noticia)");
    src.forEach((s, j) => {
      const ws = `${w} src[${j}]`;
      if (!s || !isStr(s.t, 5)) err(ws, "t (título) falta");
      if (!s || !isStr(s.o, 2)) err(ws, "o (medio) falta");
      if (!s || typeof s.u !== "string" || !/^https:\/\/[^\s"']+$/.test(s.u)) err(ws, "u debe ser una URL https://");
      if (s && s.d !== undefined && !/^\d{4}(-\d{2}(-\d{2})?)?$/.test(s.d)) err(ws, "d debe ser YYYY, YYYY-MM o YYYY-MM-DD");
    });
  });
  if (m.d >= STRICT_FROM) {
    TOPICS.forEach(t => { if (topicCount[t] < 5) warn(m.d, `solo ${topicCount[t]} preguntas de ${t} (objetivo: 6–7)`); });
    if (levels.size < 7) warn(m.d, `solo ${levels.size} niveles distintos (objetivo: al menos 7)`);
    if (chapters.size < 7) warn(m.d, `solo ${chapters.size} capítulos distintos (objetivo: al menos 7)`);
    if (numeric < 4) warn(m.d, `solo ${numeric} preguntas numéricas (objetivo: al menos 4)`);
  }
}

warnings.forEach(w => console.log(w));
errors.forEach(e => console.log(e));
console.log(`\n${days.length} días · ${allQ.size} preguntas · ${errors.length} errores · ${warnings.length} avisos`);
process.exit(errors.length ? 1 : 0);
