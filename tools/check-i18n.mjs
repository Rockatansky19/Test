#!/usr/bin/env node
/**
 * Verifies that every data-i18n key used in the generated HTML has an Uzbek
 * translation, and reports translations that are no longer used.
 *
 *   node tools/check-i18n.mjs
 */
import { readFileSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");

const files = [
  ...readdirSync(ROOT).filter((f) => f.endsWith(".html")),
  ...readdirSync(join(ROOT, "models")).map((f) => join("models", f)),
];

const used = new Set();
for (const file of files) {
  const html = readFileSync(resolve(ROOT, file), "utf8");
  for (const m of html.matchAll(/data-i18n(?:-placeholder)?="([^"]+)"/g)) used.add(m[1]);
}

const sandbox = { window: {} };
const src = readFileSync(resolve(ROOT, "assets/js/i18n.js"), "utf8");
new Function("window", src)(sandbox.window);
const dict = sandbox.window.I18N.uz;

// Keys referenced from main.js rather than from markup.
const RUNTIME_KEYS = ["form.errRequired", "form.errName", "form.errPhone", "form.errConsent", "form.success"];

const missing = [...used].filter((k) => !(k in dict)).sort();
const unused = Object.keys(dict).filter((k) => !used.has(k) && !RUNTIME_KEYS.includes(k)).sort();

console.log(`HTML files: ${files.length}`);
console.log(`keys used in markup: ${used.size}`);
console.log(`uz translations: ${Object.keys(dict).length}`);

if (unused.length) console.log(`\nUnused translations (${unused.length}):\n  ` + unused.join("\n  "));
if (missing.length) {
  console.error(`\nMissing uz translations (${missing.length}):\n  ` + missing.join("\n  "));
  process.exit(1);
}
console.log("\nOK — every key used in the markup is translated.");
