#!/usr/bin/env node
/**
 * Generates placeholder car illustrations (side view) as SVG.
 * Replace the produced files with official Opel photography before launch —
 * the markup expects the same file names and 640×300 / 1600×900 aspect ratios.
 *
 * Usage: node tools/make-cars.mjs
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");

/** Side-view geometry per body type (canvas 640 × 300, ground line at y = 250). */
const BODIES = {
  suv:       { x0: 66, x1: 574, bottom: 212, hood: 152, belt: 142, roof: 74,  wsX: 212, roofA: 256, roofB: 456, rearGlass: 524, fx: 162, rx: 466, r: 46 },
  crossover: { x0: 76, x1: 566, bottom: 212, hood: 158, belt: 148, roof: 86,  wsX: 214, roofA: 258, roofB: 442, rearGlass: 508, fx: 164, rx: 458, r: 44 },
  hatch:     { x0: 74, x1: 562, bottom: 214, hood: 164, belt: 156, roof: 98,  wsX: 218, roofA: 262, roofB: 422, rearGlass: 494, fx: 166, rx: 454, r: 42 },
  van:       { x0: 66, x1: 578, bottom: 212, hood: 148, belt: 134, roof: 58,  wsX: 192, roofA: 230, roofB: 524, rearGlass: 556, fx: 160, rx: 474, r: 44 },
};

const bodyPath = (b) => {
  const arch = b.r + 8;
  return [
    `M${b.x0 + 8},${b.bottom}`,
    `L${b.fx - arch},${b.bottom}`,
    `A${arch},${arch} 0 0 1 ${b.fx + arch},${b.bottom}`,
    `L${b.rx - arch},${b.bottom}`,
    `A${arch},${arch} 0 0 1 ${b.rx + arch},${b.bottom}`,
    `L${b.x1 - 10},${b.bottom}`,
    `Q${b.x1},${b.bottom} ${b.x1},${b.bottom - 16}`,
    `L${b.x1},${b.belt + 12}`,
    `Q${b.x1},${b.belt} ${b.x1 - 12},${b.belt}`,
    `L${b.rearGlass},${b.belt}`,
    `L${b.roofB},${b.roof}`,
    `L${b.roofA},${b.roof}`,
    `L${b.wsX},${b.hood}`,
    `L${b.x0 + 26},${b.hood + 4}`,
    `Q${b.x0},${b.hood + 10} ${b.x0},${b.hood + 26}`,
    `L${b.x0},${b.bottom - 14}`,
    `Q${b.x0},${b.bottom} ${b.x0 + 8},${b.bottom}`,
    "Z",
  ].join(" ");
};

const glassPath = (b) => [
  `M${b.wsX + 14},${b.hood - 4}`,
  `L${b.roofA + 10},${b.roof + 10}`,
  `L${b.roofB - 10},${b.roof + 10}`,
  `L${b.rearGlass - 12},${b.belt - 6}`,
  "Z",
].join(" ");

const wheel = (cx, cy, r, tone = "#111110") => `
    <g>
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="${tone}"/>
      <circle cx="${cx}" cy="${cy}" r="${r * 0.55}" fill="#9a9a93"/>
      <circle cx="${cx}" cy="${cy}" r="${r * 0.44}" fill="#c8c8c2"/>
      <circle cx="${cx}" cy="${cy}" r="${r * 0.17}" fill="#43433e"/>
    </g>`;

function carBody(b, paint, accent, glass = "url(#glass)") {
  const cy = 250 - b.r; // wheels rest on the ground line
  const pillarX = Math.round((b.roofA + b.roofB) / 2);
  return `
  <path d="${bodyPath(b)}" fill="${paint}"/>
  <path d="${glassPath(b)}" fill="${glass}"/>
  <rect x="${pillarX}" y="${b.roof + 10}" width="6" height="${b.hood - b.roof - 16}" fill="${typeof paint === "string" && paint.startsWith("url") ? "#24242a" : paint}" opacity=".9"/>
  <path d="M${b.x0 + 2},${b.hood + 22} h24 a10,10 0 0 1 10,10 v8 a8,8 0 0 1 -10,8 h-24 z" fill="${accent}"/>
  <path d="M${b.x1 - 26},${b.belt + 14} h20 a7,7 0 0 1 6,11 v9 h-26 z" fill="#c0392b" opacity=".92"/>
  <path d="M${b.wsX - 4},${b.hood + 26} L${b.rearGlass + 10},${b.hood + 26}" stroke="#000" stroke-opacity=".18" stroke-width="3"/>
  <path d="M${pillarX + 3},${b.hood + 4} v${b.bottom - b.hood - 30}" stroke="#000" stroke-opacity=".22" stroke-width="2.5"/>
${wheel(b.fx, cy, b.r)}
${wheel(b.rx, cy, b.r)}`;
}

function carSvg(bodyKey, paint = "#26262e", accent = "#f2e800") {
  const b = BODIES[bodyKey];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 300" role="img" aria-label="Opel ${bodyKey} placeholder illustration">
  <defs>
    <linearGradient id="paint" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${paint}"/>
      <stop offset=".55" stop-color="${paint}"/>
      <stop offset="1" stop-color="#101010"/>
    </linearGradient>
    <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#d8dee2"/>
      <stop offset="1" stop-color="#7f888e"/>
    </linearGradient>
  </defs>
  <ellipse cx="320" cy="252" rx="262" ry="12" fill="#000" opacity=".13"/>
${carBody(b, "url(#paint)", accent)}
</svg>
`;
}

function heroSvg(bodyKey, paint) {
  const b = BODIES[bodyKey];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Opel hero background placeholder">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0c0c0a"/>
      <stop offset=".55" stop-color="#1c1c18"/>
      <stop offset="1" stop-color="#2a2a23"/>
    </linearGradient>
    <linearGradient id="streak" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#f2e800" stop-opacity="0"/>
      <stop offset="1" stop-color="#f2e800" stop-opacity=".5"/>
    </linearGradient>
    <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#4a5257"/>
      <stop offset="1" stop-color="#2b3134"/>
    </linearGradient>
  </defs>
  <rect width="1600" height="900" fill="url(#bg)"/>
  <g opacity=".2">
    <path d="M900 900 L1320 0 h120 L1020 900 Z" fill="url(#streak)"/>
    <path d="M1180 900 L1600 0 h90 L1300 900 Z" fill="url(#streak)" opacity=".5"/>
  </g>
  <circle cx="1270" cy="250" r="220" fill="#f2e800" opacity=".07"/>
  <g transform="translate(690 330) scale(1.3)">
    <ellipse cx="320" cy="252" rx="272" ry="14" fill="#000" opacity=".45"/>
${carBody(b, paint, "#f2e800", "url(#glass)")}
  </g>
</svg>
`;
}

const files = {
  "assets/img/models/grandland.svg": carSvg("suv", "#26262e"),
  "assets/img/models/crossland.svg": carSvg("crossover", "#8f959a"),
  "assets/img/models/astra.svg": carSvg("hatch", "#e6e6e1"),
  "assets/img/models/mokka.svg": carSvg("crossover", "#f2e800"),
  "assets/img/models/combo-life.svg": carSvg("van", "#41506b"),
  "assets/img/models/zafira-life.svg": carSvg("van", "#cbcec9"),
  "assets/img/hero-grandland.svg": heroSvg("suv", "#2c2c34"),
  "assets/img/hero-crossland.svg": heroSvg("crossover", "#80868c"),
  "assets/img/hero-astra.svg": heroSvg("hatch", "#dcdcd7"),
};

for (const [file, svg] of Object.entries(files)) {
  const out = resolve(ROOT, file);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, svg, "utf8");
  console.log("wrote", file);
}
