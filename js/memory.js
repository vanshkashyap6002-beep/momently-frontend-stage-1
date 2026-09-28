/* ============================================================================
   Momently Stage 1 — memory.js
   The "one master template, many customers" piece: reads the slug out of
   the URL, fetches /api/memory/:slug, and fills in the same memory.html
   shell every published memory uses. Nothing here is template-specific —
   accent color is the only thing that changes per occasion.
   ========================================================================== */

(function () {
  "use strict";
  const { apiFetch, apiUrl, escapeHtml } = window.Momently;

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
      .map((m, index) => {
        const url = escapeHtml(apiUrl(m.url));
        return m.isVideo
          ? `<video src="${url}" controls aria-label="Video ${index + 1} from this memory"></video>`
          : `<img src="${url}" alt="Photo ${index + 1} from this memory" loading="lazy">`;
      })
      .join("");
    section.style.display = "";
  }

  function renderMemory(memory) {
    document.documentElement.style.setProperty("--memory-accent", accentColorFor(memory.accent));
    document.title = `${memory.title || "A CHERMO Memory"} — CHERMO`;

    const heroMedia = memory.media[0];
    const galleryMedia = memory.media.slice(1);

    const heroMediaEl = document.getElementById("memory-hero-media");
    if (heroMedia) {
      heroMediaEl.innerHTML = heroMedia.isVideo
        ? `<video src="${escapeHtml(apiUrl(heroMedia.url))}" autoplay muted loop playsinline aria-hidden="true" tabindex="-1"></video>`
        : `<img src="${escapeHtml(apiUrl(heroMedia.url))}" alt="Cover photo for ${escapeHtml(memory.title || "this memory")}">`;
    }

    document.getElementById("memory-title").textContent = memory.title || "A CHERMO Memory";
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

    document.getElementById("memory-closing-message").textContent = memory.closingMessage || "With love, from all of us at CHERMO.";
    document.getElementById("memory-footer-text").textContent = `A ${memory.templateName || "CHERMO"} memory, made for ${memory.recipientName || "someone special"}`;

    hide("memory-loading");
    show("memory-content");
  }

  async function init() {
    const isPreview = new URLSearchParams(window.location.search).get("preview") === "1";
    if (isPreview) {
      const onPreview = (event) => {
        if (
          event.origin !== window.location.origin ||
          event.source !== window.opener ||
          event.data?.type !== "chermo-memory-preview" ||
          !event.data.memory
        ) return;

        window.removeEventListener("message", onPreview);
        renderMemory(event.data.memory);
      };
      window.addEventListener("message", onPreview);
      return;
    }

    const slug = slugFromPath();
    if (!slug) {
      hide("memory-loading");
      show("memory-not-found");
      return;
    }

    try {
      const { memory } = await apiFetch(`/api/memory/${encodeURIComponent(slug)}`);
      renderMemory(memory);
    } catch {
      hide("memory-loading");
      show("memory-not-found");
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
