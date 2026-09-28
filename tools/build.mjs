#!/usr/bin/env node
/**
 * Static site builder for the Opel Uzbekistan brand site.
 *
 *   node tools/build.mjs
 *
 * Input:  data/models.json  + src/layout.html + src/partials/* + src/pages/* + src/templates/model.html
 * Output: *.html in the repository root, models/<slug>.html, sitemap.xml, robots.txt
 *
 * Content lives in src/ — never edit the generated HTML in the repository root,
 * it is overwritten on every build.
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const SITE_URL = process.env.SITE_URL || "https://opel-uz.example";
const PHONE = "+998 (71) 200-00-00";
const PHONE_HREF = "+998712000000";
const EMAIL = "info@opel-uz.example";
const BRAND = "Opel Узбекистан";

const read = (p) => readFileSync(resolve(ROOT, p), "utf8");
const data = JSON.parse(read("data/models.json"));
const models = [...data.models].sort((a, b) => a.order - b.order);
const byBody = { suv: "suv", crossover: "suv", hatch: "hatch", van: "van" };

/* ---------- helpers ---------- */
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const fmtRu = (n) => new Intl.NumberFormat("ru-RU").format(n).replace(/ /g, " ");
const priceEl = (n) => `<span data-price="${n}">${fmtRu(n)} ${data.currency.ru}</span>`;
const bi = (obj) => `data-i18n-ru="${esc(obj.ru)}" data-i18n-uz="${esc(obj.uz)}"`;
const biSpan = (obj, tag = "span", cls = "") =>
  `<${tag}${cls ? ` class="${cls}"` : ""} ${bi(obj)}>${esc(obj.ru)}</${tag}>`;

/** Annuity payment, rounded to the nearest 10 000 so it reads as an estimate. */
function monthly(price, downShare = 0.3, months = 36, annualRate = 0.22) {
  const loan = price * (1 - downShare);
  const r = annualRate / 12;
  const pay = r === 0 ? loan / months : (loan * r) / (1 - Math.pow(1 + r, -months));
  return Math.round(pay / 10000) * 10000;
}

const CHECK_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>`;
const PIN_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11Z"/><circle cx="12" cy="10" r="2.6"/></svg>`;
const PHONE_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.5 2.8.6a2 2 0 0 1 1.7 2Z"/></svg>`;
const CLOCK_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l4 2"/></svg>`;


/** Russian labels for spec keys — the Uzbek ones live in assets/js/i18n.js (spec.*). */
const SPEC_LABELS = {
  engine: "Двигатель",
  power: "Мощность",
  torque: "Крутящий момент",
  transmission: "Коробка передач",
  drive: "Привод",
  acceleration: "Разгон 0–100 км/ч",
  consumption: "Расход топлива",
  fuel: "Топливо",
  trunk: "Багажник",
  clearance: "Клиренс",
  seats: "Мест",
  dimensions: "Длина × ширина × высота",
};

/* ---------- reusable HTML chunks ---------- */
function modelCard(m, base) {
  const chips = [m.specs.power, m.specs.transmission, m.specs.consumption]
    .map((s) => `<li ${bi(s)}>${esc(s.ru)}</li>`)
    .join("");
  return `<article class="model-card reveal" data-body="${byBody[m.body]}">
  <div class="model-card__media">
    ${m.featured ? `<span class="model-card__tag" data-i18n="card.instock">В наличии</span>` : ""}
    <img src="${base}assets/img/models/${m.slug}.svg" alt="Opel ${m.name}" width="640" height="300" loading="lazy">
  </div>
  <div class="model-card__body">
    <span class="model-card__segment" ${bi(m.segment)}>${esc(m.segment.ru)}</span>
    <h3 class="model-card__name">Opel ${m.name}</h3>
    <ul class="model-card__specs">${chips}</ul>
    <div class="model-card__price">
      <div class="model-card__price-label" data-i18n="price.from">от</div>
      <div class="model-card__price-value">${priceEl(m.priceFrom)}</div>
    </div>
    <div class="model-card__actions">
      <a class="btn btn--sm" href="${base}models/${m.slug}.html" data-i18n="cta.more">Подробнее</a>
      <a class="btn btn--ghost btn--sm" href="${base}test-drive.html?model=${m.slug}" data-i18n="cta.testdrive">Тест-драйв</a>
    </div>
  </div>
</article>`;
}

function dealerCard(d) {
  const tags = d.services
    .map((s) => `<span data-i18n="dealer.${s}">${{ showroom: "Салон", service: "Сервис", parts: "Запчасти" }[s]}</span>`)
    .join("");
  return `<article class="dealer reveal">
  <span class="dealer__city" ${bi(d.city)}>${esc(d.city.ru)}</span>
  <h3 class="dealer__name" ${bi(d.name)}>${esc(d.name.ru)}</h3>
  <div class="dealer__meta">
    <div>${PIN_ICON}<span ${bi(d.address)}>${esc(d.address.ru)}</span></div>
    <div>${PHONE_ICON}<a href="tel:${d.phone.replace(/[^+\d]/g, "")}">${d.phone}</a></div>
    <div>${CLOCK_ICON}<span ${bi(d.hours)}>${esc(d.hours.ru)}</span></div>
  </div>
  <div class="dealer__tags">${tags}</div>
</article>`;
}

function compareTable() {
  const keys = ["engine", "power", "transmission", "consumption", "trunk", "seats"];
  const head = `<tr><th data-i18n="compare.model">Модель</th>${keys
    .map((k) => `<th data-i18n="spec.${k}">${SPEC_LABELS[k]}</th>`)
    .join("")}<th data-i18n="compare.price">Цена от</th></tr>`;
  const rows = models
    .map(
      (m) => `<tr><th scope="row"><a href="models/${m.slug}.html">Opel ${m.name}</a></th>${keys
        .map((k) => `<td ${bi(m.specs[k])}>${esc(m.specs[k].ru)}</td>`)
        .join("")}<td>${priceEl(m.priceFrom)}</td></tr>`
    )
    .join("");
  return `<table class="table"><thead>${head}</thead><tbody>${rows}</tbody></table>`;
}

function megamenu(base) {
  return models
    .map(
      (m) => `<a class="megamenu__item" href="${base}models/${m.slug}.html">
        <img src="${base}assets/img/models/${m.slug}.svg" alt="" width="78" height="37" loading="lazy">
        <span><span class="megamenu__name">${m.name}</span><br><span class="megamenu__price"><span data-i18n="price.from">от</span> ${priceEl(m.priceFrom)}</span></span>
      </a>`
    )
    .join("\n");
}

const drawerModels = (base) =>
  models.map((m) => `<a href="${base}models/${m.slug}.html">Opel ${m.name}</a>`).join("\n");

const footerModels = (base) =>
  models.map((m) => `<li><a href="${base}models/${m.slug}.html">Opel ${m.name}</a></li>`).join("\n");

const modelOptions = (selected = "") =>
  `<option value="" data-i18n="form.modelAny">Не выбрана</option>` +
  models.map((m) => `<option value="${m.slug}"${m.slug === selected ? " selected" : ""}>Opel ${m.name}</option>`).join("");

const modelOptionsPriced = (defaultSlug) =>
  models
    .map(
      (m) =>
        `<option value="${m.slug}" data-price="${m.priceFrom}"${m.slug === defaultSlug ? " selected" : ""}>Opel ${m.name}</option>`
    )
    .join("");

const dealerOptions = () =>
  `<option value="" data-i18n="form.dealerAny">Ближайший ко мне</option>` +
  data.dealers.map((d, i) => `<option value="${i}">${esc(d.name.ru)} — ${esc(d.city.ru)}</option>`).join("");

/* ---------- model page ---------- */
const SPEC_ORDER = [
  "engine", "power", "torque", "transmission", "drive",
  "acceleration", "consumption", "fuel", "trunk", "clearance", "seats", "dimensions",
];

function modelPage(m, tpl) {
  const kvKeys = ["power", "acceleration", "consumption", "trunk"];
  const kv = kvKeys
    .map(
      (k) => `<div><dt data-i18n="spec.${k}">${SPEC_LABELS[k]}</dt><dd ${bi(m.specs[k])}>${esc(m.specs[k].ru)}</dd></div>`
    )
    .join("");

  const highlights = m.highlights
    .map((h) => `<div class="strip__item">${CHECK_ICON}<span ${bi(h)}>${esc(h.ru)}</span></div>`)
    .join("");

  const colors = m.colors
    .map(
      (c) => `<div class="swatch"><span class="swatch__dot" style="background:${c.hex}"></span><span class="swatch__name" ${bi(c.name)}>${esc(c.name.ru)}</span></div>`
    )
    .join("");

  const tabs = m.trims
    .map(
      (t, i) =>
        `<button class="tabs__btn" type="button" role="tab" id="tab-${i}" aria-controls="panel-${i}" aria-selected="${i === 0}">${esc(t.name)}</button>`
    )
    .join("");

  const panels = m.trims
    .map((t, i) => {
      const features = t.features
        .map((f) => `<li>${CHECK_ICON}<span ${bi(f)}>${esc(f.ru)}</span></li>`)
        .join("");
      return `<div class="tabs__panel" id="panel-${i}" role="tabpanel" aria-labelledby="tab-${i}"${i === 0 ? "" : " hidden"}>
        <div class="trim">
          <ul class="trim__features">${features}</ul>
          <div class="trim__aside">
            <div class="trim__price">${priceEl(t.price)}</div>
            <div class="trim__monthly"><span data-i18n="trim.monthly">в кредит от</span> ${priceEl(monthly(t.price))} / <span data-i18n="trim.month">мес</span></div>
            <a class="btn btn--sm btn--dark" href="../test-drive.html?model=${m.slug}" data-i18n="cta.testdrive">Тест-драйв</a>
          </div>
        </div>
      </div>`;
    })
    .join("\n");

  const specs = SPEC_ORDER.filter((k) => m.specs[k])
    .map(
      (k) => `<div class="specs__row"><span class="specs__key" data-i18n="spec.${k}">${SPEC_LABELS[k]}</span><span class="specs__val" ${bi(m.specs[k])}>${esc(m.specs[k].ru)}</span></div>`
    )
    .join("");

  const others = models
    .filter((x) => x.slug !== m.slug)
    .slice(0, 3)
    .map((x) => modelCard(x, "../"))
    .join("\n");

  return tpl
    .replaceAll("{{NAME}}", m.name)
    .replaceAll("{{SLUG}}", m.slug)
    .replaceAll("{{SEGMENT_RU}}", esc(m.segment.ru))
    .replaceAll("{{SEGMENT_UZ}}", esc(m.segment.uz))
    .replaceAll("{{TAGLINE_RU}}", esc(m.tagline.ru))
    .replaceAll("{{TAGLINE_UZ}}", esc(m.tagline.uz))
    .replaceAll("{{DESC_RU}}", esc(m.description.ru))
    .replaceAll("{{DESC_UZ}}", esc(m.description.uz))
    .replaceAll("{{PRICE_EL}}", priceEl(m.priceFrom))
    .replaceAll("{{KV}}", kv)
    .replaceAll("{{HIGHLIGHTS}}", highlights)
    .replaceAll("{{COLORS}}", colors)
    .replaceAll("{{TRIM_TABS}}", tabs)
    .replaceAll("{{TRIM_PANELS}}", panels)
    .replaceAll("{{SPECS}}", specs)
    .replaceAll("{{OTHER_MODELS}}", others);
}

/* ---------- structured data ---------- */
const dealerLd = {
  "@context": "https://schema.org",
  "@type": "AutoDealer",
  name: BRAND,
  url: SITE_URL,
  telephone: PHONE,
  email: EMAIL,
  image: `${SITE_URL}/assets/img/logo-mark.svg`,
  address: {
    "@type": "PostalAddress",
    streetAddress: "ул. Амира Темура, 000",
    addressLocality: "Ташкент",
    addressCountry: "UZ",
  },
  areaServed: "UZ",
  openingHours: "Mo-Sa 09:00-19:00",
  brand: { "@type": "Brand", name: "Opel" },
};

const modelLd = (m) => ({
  "@context": "https://schema.org",
  "@type": "Car",
  name: `Opel ${m.name}`,
  brand: { "@type": "Brand", name: "Opel" },
  bodyType: m.segment.ru,
  vehicleTransmission: m.specs.transmission.ru,
  fuelType: m.specs.fuel.ru,
  numberOfDoors: m.body === "van" ? 5 : 5,
  vehicleSeatingCapacity: m.specs.seats.ru,
  image: `${SITE_URL}/assets/img/models/${m.slug}.svg`,
  offers: {
    "@type": "Offer",
    price: m.priceFrom,
    priceCurrency: "UZS",
    availability: "https://schema.org/InStock",
    seller: { "@type": "AutoDealer", name: BRAND, telephone: PHONE },
  },
});

/* ---------- assembly ---------- */
const layout = read("src/layout.html");
const headerTpl = read("src/partials/header.html");
const footerTpl = read("src/partials/footer.html");
const actionbarTpl = read("src/partials/actionbar.html");
const leadFormTpl = read("src/partials/lead-form.html");
const calcTpl = read("src/partials/calculator.html");
const modelTpl = read("src/templates/model.html");

function renderLeadForm(kind, base, preselect = "") {
  return leadFormTpl
    .replaceAll("{{FORM_KIND}}", kind)
    .replaceAll("{{FORM_ID}}", `f-${kind}`)
    .replaceAll("{{MODEL_OPTIONS}}", modelOptions(preselect))
    .replaceAll("{{DEALER_OPTIONS}}", dealerOptions())
    .replaceAll("{{BASE}}", base);
}

function renderCalculator(base, defaultSlug = "grandland") {
  const m = models.find((x) => x.slug === defaultSlug) || models[0];
  return calcTpl
    .replaceAll("{{MODEL_OPTIONS_PRICED}}", modelOptionsPriced(m.slug))
    .replaceAll("{{DEFAULT_PRICE}}", String(m.priceFrom))
    .replaceAll("{{BASE}}", base);
}

function compose({ body, meta, base, jsonld, path, calcModel, formPreselect }) {
  const header = headerTpl
    .replaceAll("{{MEGAMENU}}", megamenu(base))
    .replaceAll("{{DRAWER_MODELS}}", drawerModels(base))
    .replaceAll("{{BASE}}", base);
  const footer = footerTpl.replaceAll("{{FOOTER_MODELS}}", footerModels(base)).replaceAll("{{BASE}}", base);
  const actionbar = meta.actionbar === false ? "" : actionbarTpl.replaceAll("{{BASE}}", base);

  let out = layout
    .replace("{{HEADER}}", header)
    .replace("{{FOOTER}}", footer)
    .replace("{{ACTIONBAR}}", actionbar)
    .replace("{{BODY}}", body)
    .replaceAll("{{TITLE}}", esc(meta.title))
    .replaceAll("{{DESC}}", esc(meta.desc))
    .replaceAll("{{OG_IMAGE}}", meta.ogImage || "hero-grandland.svg")
    .replaceAll("{{JSONLD}}", JSON.stringify(jsonld))
    .replaceAll("{{HEAD_EXTRA}}", meta.noindex ? `<meta name="robots" content="noindex,follow">` : "")
    .replaceAll("{{PATH}}", path);

  // Body-level tokens (may appear inside the page fragment itself).
  out = out.replace(/\{\{LEAD_FORM:([a-z0-9-]+)\}\}/g, (_, kind) => renderLeadForm(kind, base, formPreselect || ""));
  out = out.replaceAll("{{CALCULATOR}}", renderCalculator(base, calcModel || "grandland"));
  out = out.replaceAll("{{MODEL_CARDS_ALL}}", models.map((m) => modelCard(m, base)).join("\n"));
  out = out.replaceAll("{{MODEL_CARDS}}", models.slice(0, 3).map((m) => modelCard(m, base)).join("\n"));
  out = out.replaceAll("{{DEALER_CARDS_ALL}}", data.dealers.map(dealerCard).join("\n"));
  out = out.replaceAll("{{DEALER_CARDS_TOP}}", data.dealers.slice(0, 3).map(dealerCard).join("\n"));
  out = out.replaceAll("{{COMPARE_TABLE}}", compareTable());
  out = out.replace(/\{\{PRICE:([a-z0-9-]+)\}\}/g, (_, slug) => {
    const m = models.find((x) => x.slug === slug);
    if (!m) throw new Error(`Unknown model in {{PRICE:${slug}}}`);
    return priceEl(m.priceFrom);
  });
  out = out.replaceAll("{{SITE_URL}}", SITE_URL);
  out = out.replaceAll("{{BASE}}", base);

  if (meta.nav && meta.nav !== "none") {
    out = out.replace(`data-nav="${meta.nav}"`, `data-nav="${meta.nav}" aria-current="page"`);
  }

  const leftover = out.match(/\{\{[A-Z_:a-z0-9-]+\}\}/g);
  if (leftover) throw new Error(`Unresolved tokens in ${path}: ${[...new Set(leftover)].join(", ")}`);
  return out;
}

/* ---------- run ---------- */
const written = [];

for (const file of readdirSync(resolve(ROOT, "src/pages")).sort()) {
  if (!file.endsWith(".html")) continue;
  const raw = read(join("src/pages", file));
  const m = raw.match(/^<!--meta\s*([\s\S]*?)-->/);
  if (!m) throw new Error(`Missing <!--meta {...}--> header in src/pages/${file}`);
  const meta = JSON.parse(m[1]);
  const body = raw.slice(m[0].length).trim();
  const html = compose({
    body,
    meta,
    base: "",
    jsonld: dealerLd,
    path: meta.path,
    calcModel: "grandland",
  });
  writeFileSync(resolve(ROOT, meta.path), html, "utf8");
  written.push(meta.path);
}

mkdirSync(resolve(ROOT, "models"), { recursive: true });
for (const model of models) {
  const meta = {
    path: `models/${model.slug}.html`,
    nav: "models",
    title: `Opel ${model.name} — цена, комплектации и характеристики в Узбекистане`,
    desc: `Opel ${model.name}: ${model.tagline.ru} Комплектации, цены от ${fmtRu(model.priceFrom)} ${data.currency.ru}, технические характеристики, кредит и тест-драйв у официального дилера в Узбекистане.`,
    ogImage: `models/${model.slug}.svg`,
    actionbar: true,
  };
  const html = compose({
    body: modelPage(model, modelTpl),
    meta,
    base: "../",
    jsonld: modelLd(model),
    path: meta.path,
    calcModel: model.slug,
    formPreselect: model.slug,
  });
  writeFileSync(resolve(ROOT, meta.path), html, "utf8");
  written.push(meta.path);
}

/* sitemap + robots */
const urls = written.filter((p) => !p.startsWith("404"));
const today = new Date().toISOString().slice(0, 10);
writeFileSync(
  resolve(ROOT, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (p) => `  <url><loc>${SITE_URL}/${p === "index.html" ? "" : p}</loc><lastmod>${today}</lastmod><changefreq>monthly</changefreq><priority>${p === "index.html" ? "1.0" : "0.7"}</priority></url>`
  )
  .join("\n")}
</urlset>
`,
  "utf8"
);
writeFileSync(
  resolve(ROOT, "robots.txt"),
  `User-agent: *\nAllow: /\nDisallow: /_legacy/\n\nSitemap: ${SITE_URL}/sitemap.xml\n`,
  "utf8"
);

console.log(`Built ${written.length} pages:`);
for (const p of written) console.log("  ", p);
