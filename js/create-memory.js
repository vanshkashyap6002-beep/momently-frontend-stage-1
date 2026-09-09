/* ============================================================================
   Momently Stage 1 — create-memory.js
   Orchestrates the 3-step flow on create-memory.html. Step 1 (customer
   info) and step 3 (summary) live here; step 2's actual upload mechanics
   live in upload.js — this file just decides when to initialize it and
   whether enough has been uploaded to continue.
   ========================================================================== */

(function () {
  "use strict";
  const { apiFetch, escapeHtml, formatCurrency, currentUser } = window.Momently;

  let template = null;
  let order = null;
  let uploadInitialized = false;

  function showBanner(message, type = "error") {
    const banner = document.getElementById("form-banner");
    if (!banner) return;
    banner.innerHTML = `<div class="form-banner ${type}">${escapeHtml(message)}</div>`;
  }
  function clearBanner() {
    const banner = document.getElementById("form-banner");
    if (banner) banner.innerHTML = "";
  }

  function goToStep(n) {
    document.querySelectorAll(".step-panel").forEach((panel) => {
      panel.classList.toggle("active", Number(panel.dataset.step) === n);
    });
    document.querySelectorAll("[data-step-dot]").forEach((dot) => {
      const step = Number(dot.dataset.stepDot);
      dot.classList.toggle("done", step < n);
      dot.classList.toggle("active", step === n);
    });
    clearBanner();
    if (n === 2 && !uploadInitialized) {
      window.MomentlyUpload.init(order.id);
      uploadInitialized = true;
    }
    if (n === 3) renderSummary();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function renderSummary() {
    const el = document.getElementById("summary-content");
    const mediaCount = window.MomentlyUpload.getCount();
    el.innerHTML = `
      <div class="summary-row"><span class="label">Template</span><span>${escapeHtml(template.name)}</span></div>
      <div class="summary-row"><span class="label">For</span><span>${escapeHtml(order.recipientName || "—")}</span></div>
      <div class="summary-row"><span class="label">Title</span><span>${escapeHtml(order.memoryTitle || "—")}</span></div>
      <div class="summary-row"><span class="label">Important date</span><span>${escapeHtml(order.importantDate || "—")}</span></div>
      <div class="summary-row"><span class="label">Photos & media</span><span>${mediaCount} file${mediaCount === 1 ? "" : "s"}</span></div>
      <div class="summary-total"><span>Total</span><span>${formatCurrency(template.price)}</span></div>
    `;
  }

  async function init() {
    const user = await currentUser();
    const params = new URLSearchParams(window.location.search);
    const slug = params.get("template");

    if (!user) {
      const next = `create-memory.html${slug ? `?template=${encodeURIComponent(slug)}` : ""}`;
      window.location.href = `login.html?next=${encodeURIComponent(next)}`;
      return;
    }
    if (!slug) {
      window.location.href = "templates.html";
      return;
    }

    try {
      const templateRes = await apiFetch(`/api/templates/${encodeURIComponent(slug)}`);
      template = templateRes.template;
      document.getElementById("template-context").textContent = `${template.name} · ${formatCurrency(template.price)}`;

      const orderRes = await apiFetch("/api/orders", { method: "POST", body: { templateSlug: slug } });
      order = orderRes.order;

      // Resume a draft that already has info filled in.
      if (order.recipientName) document.getElementById("recipientName").value = order.recipientName;
      if (order.memoryTitle) document.getElementById("memoryTitle").value = order.memoryTitle;
      if (order.importantDate) document.getElementById("importantDate").value = order.importantDate;
      if (order.personalMessage) document.getElementById("personalMessage").value = order.personalMessage;
    } catch (err) {
      showBanner(err.message);
    }
  }

  function initStep1() {
    const form = document.getElementById("info-form");
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = document.getElementById("step1-next");
      btn.disabled = true;
      try {
        const body = {
          recipientName: form.recipientName.value.trim(),
          memoryTitle: form.memoryTitle.value.trim(),
          importantDate: form.importantDate.value || null,
          personalMessage: form.personalMessage.value.trim(),
        };
        const { order: updated } = await apiFetch(`/api/orders/${order.id}`, { method: "PATCH", body });
        order = updated;
        goToStep(2);
      } catch (err) {
        showBanner(err.message);
      } finally {
        btn.disabled = false;
      }
    });
  }

  function initStep2() {
    document.getElementById("step2-next").addEventListener("click", () => {
      if (window.MomentlyUpload.getCount() === 0) {
        showBanner("Add at least one photo before continuing.");
        return;
      }
      goToStep(3);
    });
  }

  function initStep3() {
    document.getElementById("proceed-payment").addEventListener("click", () => {
      window.location.href = `payment.html?order=${encodeURIComponent(order.id)}`;
    });
  }

  function initBackButtons() {
    document.querySelectorAll("[data-step-prev]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const current = Number(document.querySelector(".step-panel.active").dataset.step);
        goToStep(current - 1);
      });
    });
  }

  document.addEventListener("DOMContentLoaded", async () => {
    initStep1();
    initStep2();
    initStep3();
    initBackButtons();
    await init();
  });
})();
