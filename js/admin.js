/* ============================================================================
   Momently Stage 1 — admin.js
   Powers admin/index.html (login) and admin/orders.html (list + detail).
   Every request here hits /api/admin/*, guarded by the separate admin
   cookie/middleware in server/middleware/adminAuth.js — a customer session
   is structurally incapable of reaching any of this.
   ========================================================================== */

(function () {
  "use strict";
  const { apiFetch, apiUrl, escapeHtml, formatCurrency } = window.Momently;

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
  const PUBLIC_MEMORY_ORIGIN = "https://chermo.in";

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
    const statuses = ["", "PENDING", "IN_PROGRESS", "READY", "PUBLISHED"];
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
  let currentOrder = null;

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
    currentOrder = order;
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
      ? order.media.map((m) => {
          const url = escapeHtml(apiUrl(m.url));
          return m.mimeType && m.mimeType.startsWith("video/")
            ? `<video src="${url}" muted></video>`
            : `<img src="${url}" alt="${escapeHtml(m.filename)}">`;
        }).join("")
      : `<p style="font-size:13px; color:rgba(18,16,15,0.5);">No media uploaded.</p>`;

    const isPublished = order.status === "PUBLISHED";
    const canPublish = order.status === "READY"
      && order.paymentStatus === "PAID"
      && Boolean(order.razorpayOrderId && order.razorpayPaymentId);
    const statusSelect = document.getElementById("status-select");
    statusSelect.value = order.status;
    statusSelect.disabled = isPublished;
    document.getElementById("save-status-btn").disabled = isPublished;

    document.getElementById("memory-title-input").value = order.memoryTitle || "";
    document.getElementById("memory-subtitle-input").value = order.memorySubtitle || "";
    document.getElementById("memory-closing-input").value = order.memoryClosingMessage || order.personalMessage || "";
    document.getElementById("song-title-input").value = order.memorySongTitle || "";
    document.getElementById("song-artist-input").value = order.memorySongArtist || "";

    timelineRows = (order.timeline || []).map((t) => ({ date: t.date, title: t.title, description: t.description }));
    renderTimelineEditor();

    const publishButton = document.getElementById("publish-btn");
    const publishConfirmation = document.getElementById("publish-confirmation");
    const publishedActions = document.getElementById("published-actions");
    const publishResult = document.getElementById("publish-result");
    publishConfirmation.style.display = "none";
    publishButton.style.display = canPublish ? "" : "none";
    publishedActions.style.display = isPublished ? "flex" : "none";
    document.getElementById("save-memory-btn").textContent = isPublished
      ? "Update Published Memory"
      : "Save Draft";
    document.getElementById("save-memory-btn").disabled = !(isPublished || order.status === "READY");
    document.getElementById("preview-memory-btn").disabled = !(isPublished || order.status === "READY");

    const guidance = document.getElementById("publish-guidance");
    if (isPublished) {
      const memoryUrl = window.ChermoMemoryLink.validateMemoryLink(order.memoryUrl) ||
        (!order.memoryUrl && order.memorySlug ? `${PUBLIC_MEMORY_ORIGIN}/memory/${encodeURIComponent(order.memorySlug)}` : null);
      const publishedLink = document.getElementById("view-published-memory-link");
      if (memoryUrl) publishedLink.href = memoryUrl;
      else publishedLink.removeAttribute("href");
      publishResult.textContent = memoryUrl ? `Published. Link: ${memoryUrl}` : "Published, but no valid destination was returned. Contact support.";
      guidance.textContent = order.memorySlug
        ? "This memory is already published. Edit and update it without changing its link or sending another publication email."
        : "This memory links to a separately hosted experience. Saving order details here does not update that external website. Its published link stays unchanged.";
    } else {
      publishResult.textContent = "";
      guidance.textContent = canPublish
        ? "Preview your work, then provide the final memory link before the initial publication."
        : "Initial publishing is available only when the order is READY and its payment is verified.";
    }
  }

  function openMemoryPreview() {
    const preview = window.open("/memory/memory.html?preview=1", "_blank");
    if (!preview) {
      showBanner("Allow pop-ups to open the memory preview.");
      return;
    }

    const memory = {
      title: document.getElementById("memory-title-input").value.trim(),
      subtitle: document.getElementById("memory-subtitle-input").value.trim(),
      recipientName: currentOrder?.recipientName,
      importantDate: currentOrder?.importantDate,
      closingMessage: document.getElementById("memory-closing-input").value.trim(),
      accent: currentOrder?.accent,
      templateName: currentOrder?.templateName,
      songTitle: document.getElementById("song-title-input").value.trim(),
      songArtist: document.getElementById("song-artist-input").value.trim(),
      media: (currentOrder?.media || []).map((item) => ({
        url: apiUrl(item.url),
        isVideo: (item.mimeType || "").startsWith("video/"),
      })),
      timeline: timelineRows.map((item) => ({
        date: item.date,
        title: item.title,
        description: item.description,
      })),
    };
    preview.addEventListener("load", () => {
      preview.postMessage({ type: "chermo-memory-preview", memory }, window.location.origin);
    }, { once: true });
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
        await loadOrderDetail(orderId);
        showBanner("Status updated.", "success");
      } catch (err) {
        showBanner(err.message);
      }
    };

    document.getElementById("preview-memory-btn").onclick = openMemoryPreview;

    document.getElementById("edit-published-memory-btn").onclick = () => {
      document.getElementById("memory-editor").scrollIntoView({ behavior: "smooth", block: "start" });
      document.getElementById("memory-title-input").focus({ preventScroll: true });
    };

    document.getElementById("add-timeline-row").onclick = () => {
      timelineRows.push({ date: "", title: "", description: "" });
      renderTimelineEditor();
    };

    async function saveMemory() {
      await apiFetch(`/api/admin/orders/${orderId}/memory`, {
        method: "PUT",
        body: {
          memoryTitle: document.getElementById("memory-title-input").value.trim(),
          memorySubtitle: document.getElementById("memory-subtitle-input").value.trim(),
          memoryClosingMessage: document.getElementById("memory-closing-input").value.trim(),
          memorySongTitle: document.getElementById("song-title-input").value.trim(),
          memorySongArtist: document.getElementById("song-artist-input").value.trim(),
          timeline: timelineRows,
        },
      });
    }

    document.getElementById("save-memory-btn").onclick = async () => {
      try {
        await saveMemory();
        showBanner(currentOrder.status === "PUBLISHED"
          ? (currentOrder.memorySlug ? "Published memory updated. Its link is unchanged." : "Order memory details saved. Update the separately hosted experience separately; its link is unchanged.")
          : "Memory draft saved.", "success");
      } catch (err) {
        showBanner(err.message);
      }
    };

    document.getElementById("publish-btn").onclick = async () => {
      document.getElementById("publish-customer-name").textContent = currentOrder.customerName || "—";
      document.getElementById("publish-customer-email").textContent = currentOrder.customerEmail || "—";
      document.getElementById("publish-confirmation").style.display = "";
      document.getElementById("memory-link-input").focus();
    };

    document.getElementById("cancel-publish-btn").onclick = () => {
      document.getElementById("publish-confirmation").style.display = "none";
    };

    document.getElementById("confirm-publish-btn").onclick = async () => {
      const input = document.getElementById("memory-link-input");
      const memoryLink = window.ChermoMemoryLink.validateMemoryLink(input.value);
      input.setCustomValidity(memoryLink ? "" : "Paste a complete, valid HTTPS URL without spaces or embedded credentials.");
      input.oninput = () => input.setCustomValidity("");
      if (!input.reportValidity()) return;
      const btn = document.getElementById("confirm-publish-btn");
      if (btn.disabled) return;
      btn.disabled = true;
      btn.textContent = "Publishing…";
      try {
        await saveMemory();
        const result = await apiFetch(`/api/admin/orders/${orderId}/publish`, {
          method: "POST",
          body: { memoryLink },
        });
        if (result.memoryUrl !== memoryLink) {
          throw new Error("Publication returned a different destination. Verify the stored link before retrying; no email success is confirmed here.");
        }
        await loadOrderDetail(orderId);
        showBanner(result.emailDelivered ? "Memory published and customer email sent." : "Memory published, but the customer email was not sent. Check the existing SMTP configuration.", result.emailDelivered ? "success" : "error");
      } catch (err) {
        showBanner(err.message);
      } finally {
        btn.disabled = false;
        btn.textContent = "Publish & Send Email";
      }
    };
  }

  async function initOrdersDashboard() {
    const ok = await guardAdminSession();
    if (!ok) return;

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
  initSignOut();

  if (document.getElementById("orders-list-view")) {
    initOrdersDashboard();
  }
});
})();
