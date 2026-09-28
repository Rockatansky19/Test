/**
 * Opel Uzbekistan — site behaviour.
 *
 * Contents: language switch · prices · header & menus · hero slider ·
 *           reveal & counters · accordion · tabs · model filter ·
 *           credit calculator · phone mask · lead forms
 *
 * Lead forms post nowhere by default: set window.OPEL_LEAD_ENDPOINT (see README)
 * to send submissions to your backend, CRM or Telegram bot.
 */
(function () {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Scroll-reveal only applies when scripting is available, so content stays
  // visible for crawlers and if this file fails to load.
  document.documentElement.classList.add("js");

  /* =====================================================================
     Language
     ===================================================================== */
  const DICT = (window.I18N && window.I18N.uz) || {};
  const DICT_RU = (window.I18N && window.I18N.ru) || {};
  const CURRENCY = { ru: "сум", uz: "so'm" };
  const STORAGE_KEY = "opel-uz-lang";
  const originals = new Map();
  let lang = "ru";

  const t = (key) =>
    lang === "ru"
      ? originals.get(key) || DICT_RU[key]
      : DICT[key] || originals.get(key) || DICT_RU[key];

  function cacheOriginals() {
    $$("[data-i18n]").forEach((el) => {
      if (!originals.has(el.dataset.i18n)) originals.set(el.dataset.i18n, el.textContent.trim());
    });
    $$("[data-i18n-placeholder]").forEach((el) => {
      const key = el.dataset.i18nPlaceholder;
      if (!originals.has(key)) originals.set(key, el.getAttribute("placeholder") || "");
    });
  }

  function formatPrice(value) {
    const num = Number(value);
    if (!Number.isFinite(num)) return "";
    return num.toLocaleString("ru-RU").replace(/ /g, " ") + " " + CURRENCY[lang];
  }

  function renderPrices(root = document) {
    $$("[data-price]", root).forEach((el) => {
      if (el.tagName === "OPTION") return;
      el.textContent = formatPrice(el.dataset.price);
    });
  }

  function applyLang(next) {
    lang = next === "uz" ? "uz" : "ru";
    document.documentElement.lang = lang === "uz" ? "uz" : "ru";

    $$("[data-i18n]").forEach((el) => {
      const value = t(el.dataset.i18n);
      if (value) el.textContent = value;
    });
    $$("[data-i18n-placeholder]").forEach((el) => {
      const value = t(el.dataset.i18nPlaceholder);
      if (value) el.setAttribute("placeholder", value);
    });
    $$("[data-i18n-uz]").forEach((el) => {
      const value = lang === "uz" ? el.dataset.i18nUz : el.dataset.i18nRu;
      if (value) el.textContent = value;
    });

    $$("[data-lang]").forEach((btn) => btn.setAttribute("aria-pressed", String(btn.dataset.lang === lang)));
    renderPrices();
    document.dispatchEvent(new CustomEvent("langchange", { detail: { lang } }));
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch (e) {
      /* private mode — language simply resets next visit */
    }
  }

  function initLang() {
    cacheOriginals();
    let stored = null;
    try {
      stored = localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      /* ignore */
    }
    $$("[data-lang]").forEach((btn) =>
      btn.addEventListener("click", () => applyLang(btn.dataset.lang))
    );
    applyLang(stored || "ru");
  }

  /* =====================================================================
     Header, mega menu, drawer
     ===================================================================== */
  function initHeader() {
    const header = $("#site-header");
    if (header) {
      const onScroll = () => header.classList.toggle("is-stuck", window.scrollY > 8);
      onScroll();
      window.addEventListener("scroll", onScroll, { passive: true });
    }

    $$("[data-menu]").forEach((item) => {
      const trigger = $(".nav__link", item);
      const open = (state) => {
        item.classList.toggle("is-open", state);
        if (trigger) trigger.setAttribute("aria-expanded", String(state));
      };
      item.addEventListener("mouseenter", () => open(true));
      item.addEventListener("mouseleave", () => open(false));
      item.addEventListener("focusin", () => open(true));
      item.addEventListener("focusout", (e) => {
        if (!item.contains(e.relatedTarget)) open(false);
      });
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") open(false);
      });
    });

    const burger = $(".burger");
    const drawer = $("#drawer");
    const overlay = $("[data-overlay]");
    if (!burger || !drawer || !overlay) return;

    const setDrawer = (state) => {
      drawer.classList.toggle("is-open", state);
      overlay.classList.toggle("is-open", state);
      overlay.hidden = !state;
      burger.setAttribute("aria-expanded", String(state));
      document.body.classList.toggle("is-locked", state);
    };

    burger.addEventListener("click", () => setDrawer(!drawer.classList.contains("is-open")));
    overlay.addEventListener("click", () => setDrawer(false));
    $(".drawer__close", drawer).addEventListener("click", () => setDrawer(false));
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") setDrawer(false);
    });

    $$("[data-drawer-toggle]", drawer).forEach((btn) => {
      btn.addEventListener("click", () => {
        const panel = btn.nextElementSibling;
        const open = panel.classList.toggle("is-open");
        btn.setAttribute("aria-expanded", String(open));
      });
    });
  }

  /* =====================================================================
     Hero slider
     ===================================================================== */
  function initHero() {
    const hero = $("[data-hero]");
    if (!hero) return;
    const slides = $$("[data-hero-slide]", hero);
    const dots = $$("[data-hero-dot]", hero);
    if (slides.length < 2) return;

    let index = 0;
    let timer = null;

    const show = (next) => {
      index = (next + slides.length) % slides.length;
      slides.forEach((s, i) => s.classList.toggle("is-active", i === index));
      dots.forEach((d, i) => d.setAttribute("aria-selected", String(i === index)));
    };

    const start = () => {
      if (reduceMotion) return;
      stop();
      timer = window.setInterval(() => show(index + 1), 7000);
    };
    const stop = () => {
      if (timer) window.clearInterval(timer);
      timer = null;
    };

    dots.forEach((dot, i) =>
      dot.addEventListener("click", () => {
        show(i);
        start();
      })
    );
    hero.addEventListener("mouseenter", stop);
    hero.addEventListener("mouseleave", start);
    document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));

    let touchX = null;
    hero.addEventListener("touchstart", (e) => (touchX = e.touches[0].clientX), { passive: true });
    hero.addEventListener(
      "touchend",
      (e) => {
        if (touchX === null) return;
        const dx = e.changedTouches[0].clientX - touchX;
        if (Math.abs(dx) > 50) show(index + (dx < 0 ? 1 : -1));
        touchX = null;
      },
      { passive: true }
    );

    show(0);
    start();
  }

  /* =====================================================================
     Reveal on scroll + counters
     ===================================================================== */
  function initReveal() {
    const items = $$(".reveal");
    if (!("IntersectionObserver" in window) || reduceMotion) {
      items.forEach((el) => el.classList.add("is-visible"));
    } else {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-visible");
              io.unobserve(entry.target);
            }
          });
        },
        { rootMargin: "0px 0px -60px 0px", threshold: 0.08 }
      );
      items.forEach((el) => io.observe(el));
    }

    const counters = $$("[data-count]");
    if (!counters.length || !("IntersectionObserver" in window) || reduceMotion) return;
    const io2 = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target;
          const target = Number(el.dataset.count);
          const suffix = el.dataset.countSuffix || "";
          const startedAt = performance.now();
          const step = (now) => {
            const p = Math.min((now - startedAt) / 900, 1);
            el.textContent = Math.round(target * (0.2 + 0.8 * p)) + suffix;
            if (p < 1) requestAnimationFrame(step);
            else el.textContent = target + suffix;
          };
          requestAnimationFrame(step);
          io2.unobserve(el);
        });
      },
      { threshold: 0.4 }
    );
    counters.forEach((el) => io2.observe(el));
  }

  /* =====================================================================
     Accordion + tabs + model filter
     ===================================================================== */
  function initAccordion() {
    $$("[data-accordion] .accordion__btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const panel = btn.nextElementSibling;
        const open = btn.getAttribute("aria-expanded") === "true";
        btn.setAttribute("aria-expanded", String(!open));
        panel.hidden = open;
      });
    });
  }

  function initTabs() {
    $$("[data-tabs]").forEach((wrap) => {
      const buttons = $$(".tabs__btn", wrap);
      const panels = $$(".tabs__panel", wrap);
      buttons.forEach((btn, i) => {
        btn.addEventListener("click", () => {
          buttons.forEach((b, bi) => b.setAttribute("aria-selected", String(bi === i)));
          panels.forEach((p, pi) => (p.hidden = pi !== i));
        });
      });
    });
  }

  function initFilter() {
    const bar = $("[data-filter]");
    const grid = $("[data-filter-grid]");
    if (!bar || !grid) return;
    $$("[data-filter-btn]", bar).forEach((btn) => {
      btn.addEventListener("click", () => {
        const value = btn.dataset.filterBtn;
        $$("[data-filter-btn]", bar).forEach((b) => b.setAttribute("aria-selected", String(b === btn)));
        $$("[data-body]", grid).forEach((card) => {
          card.hidden = value !== "all" && card.dataset.body !== value;
        });
      });
    });
  }

  /* =====================================================================
     Credit calculator
     ===================================================================== */
  function initCalculator() {
    const calc = $("[data-calc]");
    if (!calc) return;

    const modelSel = $("[data-calc-model]", calc);
    const price = $("[data-calc-price]", calc);
    const down = $("[data-calc-down]", calc);
    const term = $("[data-calc-term]", calc);
    const rate = $("[data-calc-rate]", calc);

    const out = {
      price: $("[data-calc-price-label]", calc),
      downPct: $("[data-calc-down-label]", calc),
      downSum: $("[data-calc-down-sum]", calc),
      term: $("[data-calc-term-label]", calc),
      rate: $("[data-calc-rate-label]", calc),
      monthly: $("[data-calc-monthly]", calc),
      totalPrice: $("[data-calc-total-price]", calc),
      totalDown: $("[data-calc-total-down]", calc),
      loan: $("[data-calc-loan]", calc),
      interest: $("[data-calc-interest]", calc),
    };

    const monthsWord = (n) => {
      if (lang === "uz") return n + " oy";
      const mod10 = n % 10;
      const mod100 = n % 100;
      if (mod10 === 1 && mod100 !== 11) return n + " месяц";
      if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return n + " месяца";
      return n + " месяцев";
    };

    function update() {
      const p = Number(price.value);
      const downPct = Number(down.value);
      const months = Number(term.value);
      const annual = Number(rate.value);
      const downSum = Math.round((p * downPct) / 100);
      const loan = p - downSum;
      const r = annual / 100 / 12;
      const payment = r === 0 ? loan / months : (loan * r) / (1 - Math.pow(1 + r, -months));
      const total = payment * months;

      out.price.textContent = formatPrice(p);
      out.downPct.textContent = downPct + "%";
      out.downSum.textContent = formatPrice(downSum);
      out.term.textContent = monthsWord(months);
      out.rate.textContent = annual + "%";
      out.monthly.textContent = formatPrice(Math.round(payment / 1000) * 1000);
      out.totalPrice.textContent = formatPrice(p);
      out.totalDown.textContent = formatPrice(downSum);
      out.loan.textContent = formatPrice(loan);
      out.interest.textContent = formatPrice(Math.max(0, Math.round(total - loan)));
    }

    [price, down, term, rate].forEach((input) => input.addEventListener("input", update));
    if (modelSel) {
      modelSel.addEventListener("change", () => {
        const opt = modelSel.selectedOptions[0];
        if (opt && opt.dataset.price) {
          price.value = opt.dataset.price;
          update();
        }
      });
    }
    document.addEventListener("langchange", update);
    update();
  }

  /* =====================================================================
     Phone mask + lead forms
     ===================================================================== */
  function maskPhone(value) {
    let digits = value.replace(/\D/g, "");
    if (digits.startsWith("998")) digits = digits.slice(3);
    digits = digits.slice(0, 9);
    let out = "+998";
    if (digits.length) out += " (" + digits.slice(0, 2);
    if (digits.length >= 2) out += ")";
    if (digits.length > 2) out += " " + digits.slice(2, 5);
    if (digits.length > 5) out += "-" + digits.slice(5, 7);
    if (digits.length > 7) out += "-" + digits.slice(7, 9);
    return out;
  }

  function initForms() {
    $$("[data-phone]").forEach((input) => {
      input.addEventListener("focus", () => {
        if (!input.value) input.value = "+998 ";
      });
      input.addEventListener("input", () => {
        input.value = maskPhone(input.value);
      });
    });

    const params = new URLSearchParams(location.search);
    const preset = params.get("model");
    if (preset) {
      $$("[data-model-select]").forEach((sel) => {
        const option = $$("option", sel).find((o) => o.value === preset);
        if (!option) return;
        sel.value = preset;
        option.defaultSelected = true; // survives form.reset()
      });
    }

    $$("[data-lead-form]").forEach((form) => {
      const status = $("[data-form-status]", form);

      const setError = (field, key) => {
        const wrap = field.closest(".field");
        const slot = wrap ? $("[data-error]", wrap) : $("[data-consent-error]", form);
        if (wrap) wrap.classList.toggle("field--invalid", Boolean(key));
        if (slot) slot.textContent = key ? t(key) || "" : "";
      };

      const validate = () => {
        let ok = true;
        const name = form.elements.name;
        const phone = form.elements.phone;
        const consent = form.elements.consent;

        if (!name.value.trim()) {
          setError(name, "form.errRequired");
          ok = false;
        } else if (name.value.trim().length < 2) {
          setError(name, "form.errName");
          ok = false;
        } else setError(name, null);

        const digits = phone.value.replace(/\D/g, "");
        if (digits.length !== 12) {
          setError(phone, "form.errPhone");
          ok = false;
        } else setError(phone, null);

        const consentSlot = $("[data-consent-error]", form);
        if (consent && !consent.checked) {
          if (consentSlot) consentSlot.textContent = t("form.errConsent") || "";
          ok = false;
        } else if (consentSlot) consentSlot.textContent = "";

        return ok;
      };

      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (!validate()) return;

        const payload = Object.fromEntries(new FormData(form).entries());
        payload.page = location.pathname;
        payload.lang = lang;

        const endpoint = window.OPEL_LEAD_ENDPOINT || form.dataset.endpoint;
        const button = $("button[type=submit]", form);
        if (button) button.disabled = true;

        try {
          if (endpoint) {
            const res = await fetch(endpoint, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });
            if (!res.ok) throw new Error("Request failed: " + res.status);
          } else {
            // No backend configured yet — the payload is logged for integration work.
            console.info("[lead] no endpoint configured, payload:", payload);
          }
          if (status) {
            status.hidden = false;
            status.textContent = t("form.success") || "Заявка отправлена.";
          }
          form.reset();
        } catch (error) {
          if (status) {
            status.hidden = false;
            status.textContent =
              lang === "uz"
                ? "Yuborishda xatolik. Iltimos, telefon orqali bog'laning."
                : "Не удалось отправить заявку. Пожалуйста, свяжитесь с нами по телефону.";
          }
          console.error(error);
        } finally {
          if (button) button.disabled = false;
        }
      });
    });
  }

  /* =====================================================================
     Boot
     ===================================================================== */
  document.addEventListener("DOMContentLoaded", () => {
    $$("[data-year]").forEach((el) => (el.textContent = String(new Date().getFullYear())));
    initLang();
    initHeader();
    initHero();
    initReveal();
    initAccordion();
    initTabs();
    initFilter();
    initCalculator();
    initForms();
  });
})();
