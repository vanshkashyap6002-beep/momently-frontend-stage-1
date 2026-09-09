/* ============================================================================
   Momently Stage 1 — auth.js
   Powers login.html and signup.html: form submission, the Google button
   (only shown once the server confirms OAuth is actually configured), the
   post-login "Welcome Back" transition, and safe handling of ?next=.
   ========================================================================== */

(function () {
  "use strict";
  const { apiFetch, escapeHtml } = window.Momently;

  /** Only ever allow a same-site relative path as a redirect target — never
   * an absolute/external URL from the query string (open-redirect guard). */
  function sanitizeNextUrl(raw) {
    if (!raw) return null;
    if (!raw.startsWith("/") && !/^[a-z0-9_-]+\.html/i.test(raw)) return null;
    if (raw.startsWith("//") || raw.includes("://")) return null;
    return raw;
  }

  function getNextUrl(fallback) {
    const params = new URLSearchParams(window.location.search);
    return sanitizeNextUrl(params.get("next")) || fallback;
  }

  function showBanner(message, type = "error") {
    const banner = document.getElementById("form-banner");
    if (!banner) return;
    banner.innerHTML = `<div class="form-banner ${type}">${escapeHtml(message)}</div>`;
  }

  async function initGoogleButton() {
    const btn = document.getElementById("google-btn");
    const divider = document.getElementById("google-divider");
    if (!btn) return;
    try {
      const { available } = await apiFetch("/api/auth/google/available");
      if (!available) return; // stays hidden — never shown as a dead button
      const nextUrl = getNextUrl("templates.html");
      btn.style.display = "";
      if (divider) divider.style.display = "";
      btn.addEventListener("click", () => {
        window.location.href = `/api/auth/google?next=${encodeURIComponent(nextUrl)}`;
      });
    } catch {
      /* leave hidden */
    }
  }

  function showWelcomeTransition(onDone) {
    const overlay = document.getElementById("welcome-transition");
    if (!overlay) return onDone();
    overlay.style.display = "flex";
    setTimeout(() => {
      overlay.classList.add("fade-out");
      setTimeout(onDone, 350);
    }, 800);
  }

  function setSubmitting(button, isSubmitting, idleLabel) {
    button.disabled = isSubmitting;
    button.textContent = isSubmitting ? "Please wait…" : idleLabel;
  }

  function initLoginForm() {
    const form = document.getElementById("login-form");
    if (!form) return;
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const submitBtn = document.getElementById("submit-btn");
      setSubmitting(submitBtn, true, "Log In");
      try {
        await apiFetch("/api/auth/login", {
          method: "POST",
          body: { email: form.email.value.trim(), password: form.password.value },
        });
        showWelcomeTransition(() => (window.location.href = getNextUrl("templates.html")));
      } catch (err) {
        showBanner(err.message);
        setSubmitting(submitBtn, false, "Log In");
      }
    });
  }

  function initSignupForm() {
    const form = document.getElementById("signup-form");
    if (!form) return;
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const submitBtn = document.getElementById("submit-btn");
      setSubmitting(submitBtn, true, "Create Account");
      try {
        await apiFetch("/api/auth/signup", {
          method: "POST",
          body: {
            fullName: form.fullName.value.trim(),
            email: form.email.value.trim(),
            password: form.password.value,
          },
        });
        showWelcomeTransition(() => (window.location.href = getNextUrl("templates.html")));
      } catch (err) {
        showBanner(err.message);
        setSubmitting(submitBtn, false, "Create Account");
      }
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    initGoogleButton();
    initLoginForm();
    initSignupForm();
  });
})();
