/* ============================================================================
   Momently Stage 1 — profile.js
   Customer account page: identity + their own order/memory history.
   ========================================================================== */

(function () {
  "use strict";
  const { apiFetch, escapeHtml, currentUser } = window.Momently;

  const STATUS_LABELS = { PENDING: "Draft", PAID: "Paid — In Queue", IN_PROGRESS: "Being Crafted", READY: "Ready to Publish", PUBLISHED: "Published" };
  const STATUS_TONES = { PENDING: "neutral", PAID: "accent", IN_PROGRESS: "warning", READY: "warning", PUBLISHED: "success" };

  function initials(name) {
    return (name || "").split(" ").filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");
  }

  function renderOrders(orders) {
    const wrap = document.getElementById("profile-orders");
    if (orders.length === 0) {
      wrap.innerHTML = `<div class="empty-state"><p>You haven't started a memory yet.</p><a href="templates.html" class="btn btn-primary mt-24">Browse Templates</a></div>`;
      return;
    }
    wrap.innerHTML = orders
      .map(
        (o) => `
      <div class="profile-order-card">
        <div class="profile-order-media" style="background:var(--accent-${o.accent}, var(--color-love));"></div>
        <div class="profile-order-body">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px;">
            <div>
              <h3>${escapeHtml(o.memoryTitle || o.templateName)}</h3>
              <p class="profile-order-meta">${escapeHtml(o.templateName)}${o.recipientName ? " · For " + escapeHtml(o.recipientName) : ""}</p>
            </div>
            <span class="status-badge tone-${STATUS_TONES[o.status] || "neutral"}">${escapeHtml(STATUS_LABELS[o.status] || o.status)}</span>
          </div>
          <div class="profile-order-actions">
            ${o.status === "PUBLISHED" && o.memorySlug ? `<a href="/memory/${o.memorySlug}" class="btn btn-outline btn-sm" target="_blank" rel="noopener">View Memory</a>` : ""}
            ${o.status === "PENDING" ? `<a href="create-memory.html?template=${encodeURIComponent(o.templateSlug || "")}" class="btn btn-outline btn-sm">Continue Editing</a>` : ""}
          </div>
        </div>
      </div>`
      )
      .join("");
  }

  async function init() {
    const user = await currentUser();
    if (!user) {
      window.location.href = "login.html?next=" + encodeURIComponent("profile.html");
      return;
    }
    document.getElementById("profile-avatar").textContent = initials(user.fullName) || "?";
    document.getElementById("profile-name").textContent = user.fullName;
    document.getElementById("profile-email").textContent = user.email;

    document.getElementById("profile-signout").addEventListener("click", async () => {
      try {
        await apiFetch("/api/auth/logout", { method: "POST" });
      } finally {
        window.location.href = "index.html";
      }
    });

    try {
      const { orders } = await apiFetch("/api/orders");
      renderOrders(orders);
    } catch (err) {
      document.getElementById("profile-orders").innerHTML = `<p class="field-error">Couldn't load your memories (${escapeHtml(err.message)}).</p>`;
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();