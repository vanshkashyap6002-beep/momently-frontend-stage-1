/* Customer account page: editable profile and the signed-in customer's orders. */

(function () {
  "use strict";

  const { apiFetch, escapeHtml, currentUser } = window.Momently;
  const RELATIONSHIP_STATUSES = new Set([
    "Prefer not to say",
    "Single",
    "In a relationship",
    "Engaged",
    "Married",
  ]);
  const STATUS_LABELS = {
    PENDING: "Draft",
    PAID: "Paid — In Queue",
    IN_PROGRESS: "Being Crafted",
    READY: "Ready to Publish",
    PUBLISHED: "Published",
  };
  const STATUS_TONES = {
    PENDING: "neutral",
    PAID: "accent",
    IN_PROGRESS: "warning",
    READY: "warning",
    PUBLISHED: "success",
  };
  const PAYMENT_STATUS_LABELS = {
    UNPAID: "Not paid",
    PAID: "Paid",
    FAILED: "Failed",
  };

  function initials(name) {
    return (name || "")
      .trim()
      .split(/\s+/u)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => Array.from(part)[0].toLocaleUpperCase())
      .join("");
  }

  function localToday() {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${now.getFullYear()}-${month}-${day}`;
  }

  function setBanner(message = "", type = "") {
    const banner = document.getElementById("profile-banner");
    banner.textContent = message;
    banner.className = `profile-banner${type ? ` ${type}` : ""}`;
  }

  function validateProfile(form) {
    const fullName = form.elements.fullName.value.trim().replace(/\s+/gu, " ");
    if (fullName.length < 2 || fullName.length > 100) {
      return { field: form.elements.fullName, message: "Name must be between 2 and 100 characters." };
    }
    if (!/^[\p{L}\p{M}][\p{L}\p{M} .’'\-]*$/u.test(fullName) || !/\p{L}/u.test(fullName)) {
      return { field: form.elements.fullName, message: "Enter a valid name using letters, spaces, apostrophes, periods, or hyphens." };
    }

    const phone = form.elements.phone.value.trim();
    if (phone) {
      const digits = phone.replace(/\D/gu, "");
      if (!/^\+?[0-9][0-9\s().-]*$/u.test(phone) || digits.length < 7 || digits.length > 15) {
        return { field: form.elements.phone, message: "Enter a valid phone number with 7 to 15 digits, or leave it blank." };
      }
    }

    const dateOfBirth = form.elements.dateOfBirth.value;
    if (dateOfBirth) {
      const parsedDate = new Date(`${dateOfBirth}T00:00:00`);
      if (Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== dateOfBirth || dateOfBirth > localToday()) {
        return { field: form.elements.dateOfBirth, message: "Enter a valid date of birth that is not in the future." };
      }
    }

    const relationshipStatus = form.elements.relationshipStatus.value;
    if (relationshipStatus && !RELATIONSHIP_STATUSES.has(relationshipStatus)) {
      return { field: form.elements.relationshipStatus, message: "Choose a relationship status from the available options." };
    }

    if (form.elements.aboutMe.value.trim().length > 500) {
      return { field: form.elements.aboutMe, message: "About Me must be 500 characters or fewer." };
    }

    form.elements.fullName.value = fullName;
    return null;
  }

  function formatOrderDate(value) {
    if (!value) return "Date unavailable";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Date unavailable";
    return new Intl.DateTimeFormat("en", { year: "numeric", month: "short", day: "numeric" }).format(date);
  }

  function renderOrders(orders) {
    const wrap = document.getElementById("profile-orders");
    if (!Array.isArray(orders) || orders.length === 0) {
      wrap.innerHTML = `<div class="empty-state"><p>No orders yet.</p><a href="templates.html" class="btn btn-primary mt-24">Browse Templates</a></div>`;
      return;
    }

    wrap.innerHTML = orders.map((order) => {
      const orderId = escapeHtml(order.id || "");
      const templateName = escapeHtml(order.templateName || "Memory order");
      const title = escapeHtml(order.memoryTitle || order.templateName || "Memory order");
      const recipient = order.recipientName ? ` · For ${escapeHtml(order.recipientName)}` : "";
      const orderStatus = STATUS_LABELS[order.status] || order.status || "Unknown";
      const paymentStatus = PAYMENT_STATUS_LABELS[order.paymentStatus] || order.paymentStatus || "Unknown";
      const destination = window.ChermoMemoryLink.validateMemoryLink(order.memoryUrl) ||
        (!order.memoryUrl && order.memorySlug ? `/memory/${encodeURIComponent(order.memorySlug)}` : null);
      const viewLink = order.status === "PUBLISHED" && destination
        ? `<a href="${escapeHtml(destination)}" class="btn btn-outline btn-sm" target="_blank" rel="noopener">View Memory</a>`
        : "";
      const continueLink = order.status === "PENDING"
        ? `<a href="create-memory.html?template=${encodeURIComponent(order.templateSlug || "")}" class="btn btn-outline btn-sm">Continue Editing</a>`
        : "";

      return `
        <article class="profile-order-card">
          <div class="profile-order-body">
            <div class="profile-order-heading">
              <div>
                <h3>${title}</h3>
                <p class="profile-order-meta">${templateName}${recipient}</p>
              </div>
              <span class="status-badge tone-${STATUS_TONES[order.status] || "neutral"}">${escapeHtml(orderStatus)}</span>
            </div>
            <dl class="profile-order-details">
              <div><dt>Order ID</dt><dd>${orderId}</dd></div>
              <div><dt>Order date</dt><dd>${escapeHtml(formatOrderDate(order.createdAt))}</dd></div>
              <div><dt>Payment</dt><dd>${escapeHtml(paymentStatus)}</dd></div>
            </dl>
            <div class="profile-order-actions">${viewLink}${continueLink}</div>
          </div>
        </article>`;
    }).join("");
  }

  function populateProfile(user) {
    const form = document.getElementById("profile-form");
    form.elements.fullName.value = user.fullName || "";
    form.elements.email.value = user.email || "";
    form.elements.phone.value = user.phone || "";
    form.elements.dateOfBirth.value = user.dateOfBirth || "";
    form.elements.relationshipStatus.value = user.relationshipStatus || "";
    form.elements.aboutMe.value = user.aboutMe || "";
    document.getElementById("profile-avatar").textContent = initials(user.fullName);
    document.getElementById("about-me-count").textContent = `${form.elements.aboutMe.value.length} / 500 characters`;
    document.getElementById("profile-loading").hidden = true;
    form.hidden = false;
  }

  function isAuthenticationError(error) {
    return /\b401\b|please sign in|session has expired/iu.test(error.message || "");
  }

  function redirectToLogin() {
    window.location.href = "login.html?next=" + encodeURIComponent("profile.html");
  }

  async function init() {
    const user = await currentUser();
    if (!user) {
      redirectToLogin();
      return;
    }

    document.getElementById("profile-signout").addEventListener("click", async () => {
      try {
        await apiFetch("/api/auth/logout", { method: "POST" });
      } finally {
        window.location.href = "index.html";
      }
    });

    const form = document.getElementById("profile-form");
    const dateField = form.elements.dateOfBirth;
    dateField.max = localToday();
    form.elements.aboutMe.addEventListener("input", () => {
      document.getElementById("about-me-count").textContent = `${form.elements.aboutMe.value.length} / 500 characters`;
    });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      setBanner();

      if (!form.reportValidity()) return;
      const invalidField = validateProfile(form);
      if (invalidField) {
        setBanner(invalidField.message, "error");
        invalidField.field.focus();
        return;
      }

      const saveButton = document.getElementById("profile-save");
      saveButton.disabled = true;
      saveButton.textContent = "Saving…";
      form.setAttribute("aria-busy", "true");

      try {
        const { user: updated } = await apiFetch("/api/profile", {
          method: "PUT",
          body: {
            fullName: form.elements.fullName.value,
            phone: form.elements.phone.value.trim() || null,
            dateOfBirth: form.elements.dateOfBirth.value || null,
            relationshipStatus: form.elements.relationshipStatus.value || null,
            aboutMe: form.elements.aboutMe.value.trim() || null,
          },
        });
        populateProfile(updated);
        setBanner("Your profile has been saved.", "success");
      } catch (error) {
        if (isAuthenticationError(error)) {
          redirectToLogin();
          return;
        }
        setBanner(error.message || "Unable to save your profile. Please try again.", "error");
      } finally {
        saveButton.disabled = false;
        saveButton.textContent = "Save Changes";
        form.removeAttribute("aria-busy");
      }
    });

    try {
      const { user: profile } = await apiFetch("/api/profile");
      populateProfile(profile);
    } catch (error) {
      if (isAuthenticationError(error)) {
        redirectToLogin();
        return;
      }
      document.getElementById("profile-loading").textContent = "Your profile could not be loaded. Please refresh and try again.";
      setBanner(error.message || "Unable to load your profile.", "error");
    }

    try {
      const { orders } = await apiFetch("/api/orders");
      renderOrders(orders);
    } catch (error) {
      if (isAuthenticationError(error)) {
        redirectToLogin();
        return;
      }
      document.getElementById("profile-orders").textContent = error.message || "Your orders could not be loaded. Please refresh and try again.";
      document.getElementById("profile-orders").classList.add("field-error");
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
