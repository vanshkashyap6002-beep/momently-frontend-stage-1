/* ============================================================================
   Momently Stage 1 — main.js
   Loaded on every page, first. Provides:
   - window.Momently.apiFetch / escapeHtml / formatCurrency / currentUser
   - shared chrome: navbar scroll state, mobile menu, footer year, FAQ accordion
   - the two homepage-style animations: floating hearts + the intro overlay
   Every init function checks for its own DOM hooks first, so this file is
   safe to include unchanged on every page — pages that don't have a
   navbar/FAQ/etc. simply skip that piece.
   ========================================================================== */

(function () {
  "use strict";

  /** Wraps fetch with same-origin cookies and JSON handling. Pass a
   * FormData instance as `body` for file uploads — the browser sets the
   * correct multipart Content-Type header itself, so we deliberately don't
   * override it in that case. */
  async function apiFetch(path, { method = "GET", body, headers = {} } = {}) {
    const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
    const API_BASE_URL = "https://momently-server0-1.onrender.com";

    const res = await fetch(API_BASE_URL + path, {
    method,
    credentials: "include",
    headers: isFormData ? headers : { "Content-Type": "application/json", ...headers },
    body: isFormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
  });

    let data = null;
    try {
      data = await res.json();
    } catch {
      /* No JSON body (e.g. 204/redirect) — that's fine. */
    }

    if (!res.ok) {
      const message = (data && data.error) || `Something went wrong (${res.status}). Please try again.`;
      throw new Error(message);
    }
    return data;
  }

  function escapeHtml(value) {
    const div = document.createElement("div");
    div.textContent = value === null || value === undefined ? "" : String(value);
    return div.innerHTML;
  }

  function formatCurrency(amount) {
    const n = Number(amount) || 0;
    if (n === 0) return "Free";
    return "\u20B9" + n.toLocaleString("en-IN");
  }

  /** Resolves to the logged-in customer, or null — never throws. */
  async function currentUser() {
    try {
      const { user } = await apiFetch("/api/auth/me");
      return user;
    } catch {
      return null;
    }
  }

  // ---------------------------------------------------------------------
  // Navbar
  // ---------------------------------------------------------------------
  function initNavbar() {
    const nav = document.querySelector(".navbar");
    if (!nav) return;
    const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 10);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  function initMobileMenu() {
    const toggle = document.querySelector(".nav-toggle");
    const menu = document.querySelector(".mobile-menu");
    if (!toggle || !menu) return;
    toggle.addEventListener("click", () => menu.classList.toggle("open"));
    menu.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => menu.classList.remove("open")));
  }

  /** Swaps the nav's "Login" link for a name + sign-out once we know the
   * customer is signed in. Needs an element with [data-auth-slot] in the
   * navbar markup; pages without one just skip this. */
   function navInitials(name) {
    return (name || "").split(" ").filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");
  }

  async function initAuthNavState() {
    const desktopSlots = document.querySelectorAll("[data-auth-slot]");
    const mobileSlots = document.querySelectorAll("[data-auth-slot-mobile]");
    if (desktopSlots.length === 0 && mobileSlots.length === 0) return;

    const user = await currentUser();
    if (!user) return; // logged-out markup (e.g. the default "Login" link) stays as-is

    const badge = navInitials(user.fullName) || "?";

    desktopSlots.forEach((slot) => {
      slot.innerHTML = `<a href="profile.html" class="nav-profile-link" title="${escapeHtml(user.fullName)}"><span class="nav-avatar">${escapeHtml(badge)}</span></a>`;
    });

    mobileSlots.forEach((slot) => {
      slot.innerHTML = `
        <a href="profile.html" class="nav-profile-link"><span class="nav-avatar">${escapeHtml(badge)}</span> ${escapeHtml(user.fullName)}</a>
        <button class="btn btn-ghost btn-sm" type="button" data-nav-signout>Sign out</button>`;
      slot.querySelector("[data-nav-signout]").addEventListener("click", async () => {
        try {
          await apiFetch("/api/auth/logout", { method: "POST" });
        } finally {
          window.location.href = "index.html";
        }
      });
    });
  }

  // ---------------------------------------------------------------------
  // Floating hearts — spec: 20-30 hearts, 6-12px, opacity 10-30%, 12-18s,
  // slow upward drift with slight horizontal movement + rotation, soft
  // pink/rose/white/gold, behind all content, pointer-events: none.
  // ---------------------------------------------------------------------
  function initFloatingHearts() {
    const layer = document.querySelector(".hearts-layer");
    if (!layer || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const COLORS = ["#FDA4AF", "#F43F5E", "#FFFFFF", "#FDE047"];
    const COUNT = 24;
    const HEART_PATH = "M12 21s-6.7-4.35-9.5-8.28C0.9 10.6 1 7.7 3.1 5.9 5 4.3 7.6 4.6 9.2 6.4L12 9.6l2.8-3.2c1.6-1.8 4.2-2.1 6.1-0.5 2.1 1.8 2.2 4.7 0.6 6.8C18.7 16.65 12 21 12 21z";

    const fragment = document.createDocumentFragment();
    for (let i = 0; i < COUNT; i++) {
      const size = Math.floor(Math.random() * 7) + 6; // 6-12px
      const left = Math.random() * 100;
      const duration = (Math.random() * 6 + 12).toFixed(1); // 12-18s
      const delay = (Math.random() * 10).toFixed(1); // 0-10s
      const opacity = (Math.random() * 0.2 + 0.1).toFixed(2); // 0.10-0.30
      const drift = (Math.random() * 80 - 40).toFixed(0) + "px";
      const rotate = (Math.random() * 90 - 45).toFixed(0) + "deg";
      const color = COLORS[Math.floor(Math.random() * COLORS.length)];

      const heart = document.createElement("div");
      heart.className = "floating-heart";
      heart.style.left = left + "%";
      heart.style.width = size + "px";
      heart.style.height = size + "px";
      heart.style.animationDuration = duration + "s";
      heart.style.animationDelay = delay + "s";
      heart.style.setProperty("--heart-opacity", opacity);
      heart.style.setProperty("--heart-drift", drift);
      heart.style.setProperty("--heart-rotate", rotate);
      heart.innerHTML = `<svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden="true"><path fill="${color}" d="${HEART_PATH}"/></svg>`;
      fragment.appendChild(heart);
    }
    layer.appendChild(fragment);
  }

  // ---------------------------------------------------------------------
  // Intro overlay — full-bleed "Every Memory / Deserves Its Own Place /
  // On The Internet" reveal, once per 24h (localStorage-gated), matching
  // the reference project's IntroOverlay component's timing.
  // ---------------------------------------------------------------------
  function initIntroOverlay() {
    const overlay = document.querySelector(".intro-overlay");
    if (!overlay) return;

    const STORAGE_KEY = "momently_intro_seen_at";
    const DAY_MS = 24 * 60 * 60 * 1000;
    const lastSeen = Number(localStorage.getItem(STORAGE_KEY) || 0);

    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches && Date.now() - lastSeen < DAY_MS) {
      overlay.remove();
      return;
    }
    // Reduced-motion visitors still see the intro (it's the homepage's
    // welcome message, not a decorative flourish) — it just appears
    // instantly instead of staging in, via the reduced-motion CSS rule.

    const lines = overlay.querySelectorAll(".intro-line");
    const cta = overlay.querySelector(".intro-cta");
    const timers = [];

    lines.forEach((line, i) => {
      timers.push(setTimeout(() => line.classList.add("show"), 600 + i * 600));
    });
    timers.push(setTimeout(() => cta && cta.classList.add("show"), 600 + lines.length * 600));

    function dismiss() {
      timers.forEach(clearTimeout);
      overlay.classList.add("hidden");
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
      setTimeout(() => overlay.remove(), 500);
    }

    timers.push(setTimeout(dismiss, 3400));
    overlay.addEventListener("click", dismiss);
  }

  // ---------------------------------------------------------------------
  // FAQ accordion + footer year
  // ---------------------------------------------------------------------
  function initFaqAccordion() {
    document.querySelectorAll(".faq-item").forEach((item) => {
      const question = item.querySelector(".faq-question");
      if (!question) return;
      question.addEventListener("click", () => item.classList.toggle("open"));
    });
  }

  function setFooterYear() {
    const year = String(new Date().getFullYear());
    document.querySelectorAll("[data-year]").forEach((el) => (el.textContent = year));
  }

  // ---------------------------------------------------------------------
  // Public namespace + boot
  // ---------------------------------------------------------------------
  window.Momently = { apiFetch, escapeHtml, formatCurrency, currentUser };

  document.addEventListener("DOMContentLoaded", () => {
    initNavbar();
    initMobileMenu();
    initAuthNavState();
    initFloatingHearts();
    initIntroOverlay();
    initFaqAccordion();
    setFooterYear();
  });
})();
