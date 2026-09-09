/* ============================================================================
   Momently Stage 1 — memory.js
   The "one master template, many customers" piece: reads the slug out of
   the URL, fetches /api/memory/:slug, and fills in the same memory.html
   shell every published memory uses. Nothing here is template-specific —
   accent color is the only thing that changes per occasion.
   ========================================================================== */

(function () {
  "use strict";
  const { apiFetch, escapeHtml } = window.Momently;

  function accentColorFor(accentKey) {
    const varName = `--accent-${accentKey}`;
    const value = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    return value || "#7A1E2B"; // falls back to --color-love if the accent key is unrecognized
  }

  function slugFromPath() {
    const parts = window.location.pathname.split("/").filter(Boolean);
    return decodeURIComponent(parts[parts.length - 1] || "");
  }

  function show(id) {
    document.getElementById(id).style.display = "";
  }
  function hide(id) {
    document.getElementById(id).style.display = "none";
  }

  function formatDate(dateStr) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
  }

  function renderTimeline(entries) {
    const section = document.getElementById("memory-timeline-section");
    const wrap = document.getElementById("memory-timeline");
    if (!entries || entries.length === 0) return;
    wrap.innerHTML = entries
      .map(
        (t) => `
      <div class="timeline-item">
        ${t.date ? `<div class="timeline-date">${escapeHtml(t.date)}</div>` : ""}
        <h3>${escapeHtml(t.title || "")}</h3>
        <p>${escapeHtml(t.description || "")}</p>
      </div>`
      )
      .join("");
    section.style.display = "";
  }

  function renderGallery(mediaItems) {
    const section = document.getElementById("memory-gallery-section");
    const wrap = document.getElementById("memory-gallery");
    if (!mediaItems || mediaItems.length === 0) return;
    wrap.innerHTML = mediaItems
      .map((m) => (m.isVideo ? `<video src="${m.url}" controls></video>` : `<img src="${m.url}" alt="" loading="lazy">`))
      .join("");
    section.style.display = "";
  }

  async function init() {
    const slug = slugFromPath();
    if (!slug) {
      hide("memory-loading");
      show("memory-not-found");
      return;
    }

    try {
      const { memory } = await apiFetch(`/api/memory/${encodeURIComponent(slug)}`);

      document.documentElement.style.setProperty("--memory-accent", accentColorFor(memory.accent));
      document.title = `${memory.title || "A Momently Memory"} — Momently`;

      const heroMedia = memory.media[0];
      const galleryMedia = memory.media.slice(1);

      const heroMediaEl = document.getElementById("memory-hero-media");
      if (heroMedia) {
        heroMediaEl.innerHTML = heroMedia.isVideo
          ? `<video src="${heroMedia.url}" autoplay muted loop playsinline></video>`
          : `<img src="${heroMedia.url}" alt="">`;
      }

      document.getElementById("memory-title").textContent = memory.title || "A Momently Memory";
      document.getElementById("memory-subtitle").textContent = memory.subtitle || "";

      if (memory.importantDate) {
        document.getElementById("memory-date").textContent = formatDate(memory.importantDate);
        document.getElementById("memory-date").style.display = "";
      }

      if (memory.songTitle) {
        document.getElementById("memory-song").textContent = `${memory.songTitle}${memory.songArtist ? " — " + memory.songArtist : ""}`;
        document.getElementById("memory-music").style.display = "";
      }

      renderTimeline(memory.timeline);
      renderGallery(galleryMedia);

      document.getElementById("memory-closing-message").textContent = memory.closingMessage || "With love, from all of us at Momently.";
      document.getElementById("memory-footer-text").textContent = `A ${memory.templateName || "Momently"} memory, made for ${memory.recipientName || "someone special"}`;

      hide("memory-loading");
      show("memory-content");
    } catch {
      hide("memory-loading");
      show("memory-not-found");
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
