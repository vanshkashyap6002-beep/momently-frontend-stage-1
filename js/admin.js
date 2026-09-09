/* ============================================================================
   Momently Stage 1 — admin.js
   Powers admin/index.html (login) and admin/orders.html (list + detail).
   Every request here hits /api/admin/*, guarded by the separate admin
   cookie/middleware in server/middleware/adminAuth.js — a customer session
   is structurally incapable of reaching any of this.
   ========================================================================== */

(function () {
  "use strict";
  const { apiFetch, escapeHtml, formatCurrency } = window.Momently;

  function showBanner(message, type = "error") {
    const banner = document.getElementById("form-banner");
    if (!banner) return;
    banner.innerHTML = `<div class="form-banner ${type}">${escapeHtml(message)}</div>`;
  }

  // ------------------------------------------------------------------
  // Login (admin/index.html)
  // ------------------------------------------------------------------
  function initAdminLoginForm() {
    const form = document.getElementById("admin-login-form");
    if (!form) return;
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = document.getElementById("submit-btn");
      btn.disabled = true;
      btn.textContent = "Signing in…";
      try {
        await apiFetch("/api/admin/login", {
          method: "POST",
          body: { email: form.email.value.trim(), password: form.password.value },
        });
        window.location.href = "orders.html";
      } catch (err) {
        showBanner(err.message);
        btn.disabled = false;
        btn.textContent = "Sign In";
      }
    });
  }

  // ------------------------------------------------------------------
  // Shared: status/payment badges
  // ------------------------------------------------------------------
  const STATUS_TONES = { PENDING: "neutral", PAID: "accent", IN_PROGRESS: "warning", READY: "success", PUBLISHED: "success" };
  const PAYMENT_TONES = { UNPAID: "neutral", PAID: "success", FAILED: "danger" };

  function badge(text, tone) {
    return `<span class="status-badge tone-${tone}">${escapeHtml(text.replace(/_/g, " ").toLowerCase())}</span>`;
  }

  // ------------------------------------------------------------------
  // Orders dashboard (admin/orders.html) — list or detail, based on ?order=
  // ------------------------------------------------------------------
  async function guardAdminSession() {
    try {
      const { admin } = await apiFetch("/api/admin/me");
      const nameEl = document.getElementById("admin-name");
      if (nameEl) nameEl.textContent = admin.fullName;
      return true;
    } catch {
      window.location.href = "index.html";
      return false;
    }
  }

  function initSignOut() {
    const btn = document.getElementById("admin-signout");
    if (!btn) return;
    btn.addEventListener("click", async () => {
      try {
        await apiFetch("/api/admin/logout", { method: "POST" });
      } finally {
        window.location.href = "index.html";
      }
    });
  }

  let currentStatusFilter = "";

  function renderStatusFilters() {
    const wrap = document.getElementById("status-filters");
    if (!wrap) return;
    const statuses = ["", "PENDING", "PAID", "IN_PROGRESS", "READY", "PUBLISHED"];
    wrap.innerHTML = statuses
      .map((s) => `<button type="button" class="filter-chip${currentStatusFilter === s ? " active" : ""}" data-status="${s}">${s ? s.replace("_", " ") : "All"}</button>`)
      .join("");
    wrap.querySelectorAll("[data-status]").forEach((chip) => {
      chip.addEventListener("click", () => {
        currentStatusFilter = chip.dataset.status;
        renderStatusFilters();
        loadOrdersList();
      });
    });
  }

  async function loadOrdersList() {
    const tbody = document.getElementById("orders-table-body");
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="7">Loading orders…</td></tr>`;
    try {
      const qs = currentStatusFilter ? `?status=${encodeURIComponent(currentStatusFilter)}` : "";
      const { orders } = await apiFetch(`/api/admin/orders${qs}`);
      if (orders.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7">No orders here yet.</td></tr>`;
        return;
      }
      tbody.innerHTML = orders
        .map(
          (o) => `
        <tr class="clickable" data-order-id="${o.id}">
          <td>${escapeHtml(o.customerName)}</td>
          <td>${escapeHtml(o.templateName)}</td>
          <td>${escapeHtml(o.memoryTitle || "—")}</td>
          <td>${badge(o.status, STATUS_TONES[o.status] || "neutral")}</td>
          <td>${badge(o.paymentStatus, PAYMENT_TONES[o.paymentStatus] || "neutral")}</td>
          <td>${formatCurrency(o.amount)}</td>
          <td>${escapeHtml(new Date(o.createdAt).toLocaleDateString())}</td>
        </tr>`
        )
        .join("");
      tbody.querySelectorAll("[data-order-id]").forEach((row) => {
        row.addEventListener("click", () => {
          window.location.href = `orders.html?order=${encodeURIComponent(row.dataset.orderId)}`;
        });
      });
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="7">Couldn't load orders (${escapeHtml(err.message)})</td></tr>`;
    }
  }

  // ---------------- Detail view ----------------
  let timelineRows = [];

  function renderTimelineEditor() {
    const wrap = document.getElementById("timeline-editor");
    if (!wrap) return;
    wrap.innerHTML = timelineRows
      .map(
        (row, i) => `
      <div class="timeline-editor-row" data-row="${i}">
        <input type="text" placeholder="Date" value="${escapeHtml(row.date || "")}" data-field="date">
        <input type="text" placeholder="Title" value="${escapeHtml(row.title || "")}" data-field="title">
        <input type="text" placeholder="Description" value="${escapeHtml(row.description || "")}" data-field="description">
        <button type="button" class="btn btn-ghost btn-sm" data-remove-row="${i}" aria-label="Remove entry">✕</button>
      </div>`
      )
      .join("");

    wrap.querySelectorAll("[data-remove-row]").forEach((btn) => {
      btn.addEventListener("click", () => {
        timelineRows.splice(Number(btn.dataset.removeRow), 1);
        renderTimelineEditor();
      });
    });
    wrap.querySelectorAll("input[data-field]").forEach((input) => {
      input.addEventListener("input", () => {
        const rowEl = input.closest("[data-row]");
        timelineRows[Number(rowEl.dataset.row)][input.dataset.field] = input.value;
      });
    });
  }

  function fillDetail(order) {
    document.getElementById("detail-customer-name").textContent = order.customerName;
    document.getElementById("detail-customer-email").textContent = order.customerEmail;
    document.getElementById("detail-status-badge").innerHTML = badge(order.status, STATUS_TONES[order.status] || "neutral");

    document.getElementById("detail-template").textContent = order.templateName;
    document.getElementById("detail-recipient").textContent = order.recipientName || "—";
    document.getElementById("detail-title").textContent = order.memoryTitle || "—";
    document.getElementById("detail-date").textContent = order.importantDate || "—";
    document.getElementById("detail-amount").textContent = `${formatCurrency(order.amount)} · ${order.paymentStatus}`;
    document.getElementById("detail-message").textContent = order.personalMessage || "—";

    const mediaWrap = document.getElementById("detail-media");
    mediaWrap.innerHTML = order.media.length
      ? order.media.map((m) => (m.mimeType && m.mimeType.startsWith("video/") ? `<video src="${m.url}" muted></video>` : `<img src="${m.url}" alt="${escapeHtml(m.filename)}">`)).join("")
      : `<p style="font-size:13px; color:rgba(18,16,15,0.5);">No media uploaded.</p>`;

    document.getElementById("status-select").value = order.status === "PUBLISHED" ? "READY" : order.status;

    document.getElementById("memory-title-input").value = order.memoryTitle || "";
    document.getElementById("memory-subtitle-input").value = order.memorySubtitle || "";
    document.getElementById("memory-closing-input").value = order.memoryClosingMessage || order.personalMessage || "";
    document.getElementById("song-title-input").value = order.memorySongTitle || "";
    document.getElementById("song-artist-input").value = order.memorySongArtist || "";

    timelineRows = (order.timeline || []).map((t) => ({ date: t.date, title: t.title, description: t.description }));
    renderTimelineEditor();

    if (order.status === "PUBLISHED") {
      document.getElementById("publish-result").textContent = `Published. Link: ${window.location.origin}/memory/${order.memorySlug}`;
    }
  }

  async function loadOrderDetail(orderId) {
    document.getElementById("orders-list-view").style.display = "none";
    const detail = document.getElementById("order-detail-view");
    detail.style.display = "";
    try {
      const { order } = await apiFetch(`/api/admin/orders/${orderId}`);
      fillDetail(order);
      wireDetailActions(orderId);
    } catch (err) {
      showBanner(err.message);
    }
  }

  function wireDetailActions(orderId) {
    document.getElementById("save-status-btn").onclick = async () => {
      try {
        await apiFetch(`/api/admin/orders/${orderId}/status`, { method: "PATCH", body: { status: document.getElementById("status-select").value } });
        showBanner("Status updated.", "success");
      } catch (err) {
        showBanner(err.message);
      }
    };

    document.getElementById("add-timeline-row").onclick = () => {
      timelineRows.push({ date: "", title: "", description: "" });
      renderTimelineEditor();
    };

    document.getElementById("save-memory-btn").onclick = async () => {
      try {
        await apiFetch(`/api/admin/orders/${orderId}/memory`, {
          method: "PATCH",
          body: {
            memoryTitle: document.getElementById("memory-title-input").value.trim(),
            memorySubtitle: document.getElementById("memory-subtitle-input").value.trim(),
            closingMessage: document.getElementById("memory-closing-input").value.trim(),
            songTitle: document.getElementById("song-title-input").value.trim(),
            songArtist: document.getElementById("song-artist-input").value.trim(),
            timeline: timelineRows,
          },
        });
        showBanner("Memory draft saved.", "success");
      } catch (err) {
        showBanner(err.message);
      }
    };

    document.getElementById("publish-btn").onclick = async () => {
      const btn = document.getElementById("publish-btn");
      btn.disabled = true;
      btn.textContent = "Publishing…";
      try {
        const result = await apiFetch(`/api/admin/orders/${orderId}/publish`, { method: "POST" });
        document.getElementById("publish-result").innerHTML = `Published! <a href="${result.memoryUrl}" target="_blank" rel="noopener">${escapeHtml(result.memoryUrl)}</a>${result.emailSent ? "" : " (email not sent — check SMTP settings)"}`;
        showBanner("Memory published.", "success");
      } catch (err) {
        showBanner(err.message);
      } finally {
        btn.disabled = false;
        btn.textContent = "Publish Memory";
      }
    };
  }

  async function initOrdersDashboard() {
    const ok = await guardAdminSession();
    if (!ok) return;
    initSignOut();

    const params = new URLSearchParams(window.location.search);
    const orderId = params.get("order");
    if (orderId) {
      await loadOrderDetail(orderId);
    } else {
      renderStatusFilters();
      await loadOrdersList();
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    initAdminLoginForm();
    if (document.getElementById("orders-list-view")) initOrdersDashboard();
  });
})();
