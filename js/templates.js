/* ============================================================================
   Momently Stage 1 — templates.js
   Renders the read-only template catalog. Used on TWO pages:
   - index.html:     #featured-templates-grid  (first 6, no filters)
   - templates.html: #marketplace-grid + filters sidebar + search + preview modal
   Both share the same card markup and the same "Use Template" click
   handling, so a template only ever needs to be styled once.
   ========================================================================== */

(function () {
  "use strict";
  const { apiFetch, escapeHtml, formatCurrency, currentUser } = window.Momently;

  function templateImageUrl(t) {
    return t.previewImageUrl;
  }

  function renderTemplateCard(t, { showPreview = false } = {}) {
    return `
      <article class="template-card">
        <div class="template-card-media">
          <img src="${templateImageUrl(t)}" alt="${escapeHtml(t.name)} template preview" loading="lazy">
          <span class="template-badge">${escapeHtml(t.occasion)}</span>
          <span class="template-price">${formatCurrency(t.price)}</span>
        </div>
        <div class="template-card-body">
          <h3>${escapeHtml(t.name)}</h3>
          <p class="template-card-meta">${escapeHtml(t.theme || "")}${t.theme && t.style ? " · " : ""}${escapeHtml(t.style || "")}</p>
          <div class="template-card-actions">
            ${showPreview ? `<button type="button" class="btn btn-outline btn-sm" data-preview-template="${t.slug}">Preview</button>` : ""}
            <button type="button" class="btn btn-primary btn-sm" data-use-template="${t.slug}">Use Template</button>
          </div>
        </div>
      </article>`;
  }

  async function handleUseTemplate(slug) {
    const user = await currentUser();
    const nextUrl = `create-memory.html?template=${encodeURIComponent(slug)}`;
    window.location.href = user ? nextUrl : `login.html?next=${encodeURIComponent(nextUrl)}`;
  }

  function wireCardActions(container) {
    container.addEventListener("click", (e) => {
      const useBtn = e.target.closest("[data-use-template]");
      if (useBtn) return handleUseTemplate(useBtn.dataset.useTemplate);

      const previewBtn = e.target.closest("[data-preview-template]");
      if (previewBtn) return openPreview(previewBtn.dataset.previewTemplate);
    });
  }

  // ------------------------------------------------------------------
  // Homepage teaser
  // ------------------------------------------------------------------
  async function initFeaturedGrid() {
    const grid = document.getElementById("featured-templates-grid");
    if (!grid) return;
    wireCardActions(grid);
    try {
      const { templates } = await apiFetch("/api/templates");
      grid.innerHTML = templates.slice(0, 6).map((t) => renderTemplateCard(t)).join("");
    } catch (err) {
      grid.innerHTML = `<p class="field-error">Couldn't load templates right now (${escapeHtml(err.message)}).</p>`;
    }
  }

  // ------------------------------------------------------------------
  // Full marketplace (templates.html)
  // ------------------------------------------------------------------
  let allTemplates = [];
  let activeFilters = { occasion: null, search: "" };

  function applyFilters() {
    return allTemplates.filter((t) => {
      if (activeFilters.occasion && t.occasion !== activeFilters.occasion) return false;
      if (activeFilters.search) {
        const q = activeFilters.search.toLowerCase();
        if (!t.name.toLowerCase().includes(q) && !t.occasion.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }

  function renderMarketplaceGrid() {
    const grid = document.getElementById("marketplace-grid");
    if (!grid) return;
    const empty = document.getElementById("marketplace-empty");
    const filtered = applyFilters();
    grid.innerHTML = filtered.map((t) => renderTemplateCard(t, { showPreview: true })).join("");
    if (empty) empty.style.display = filtered.length === 0 ? "block" : "none";
  }

  function renderOccasionFilters() {
    const wrap = document.getElementById("occasion-filters");
    if (!wrap) return;
    const occasions = [...new Set(allTemplates.map((t) => t.occasion))].sort();
    wrap.innerHTML =
      `<button type="button" class="filter-chip${activeFilters.occasion ? "" : " active"}" data-occasion="">All</button>` +
      occasions
        .map((o) => `<button type="button" class="filter-chip${activeFilters.occasion === o ? " active" : ""}" data-occasion="${escapeHtml(o)}">${escapeHtml(o)}</button>`)
        .join("");

    wrap.querySelectorAll("[data-occasion]").forEach((chip) => {
      chip.addEventListener("click", () => {
        activeFilters.occasion = chip.dataset.occasion || null;
        renderOccasionFilters();
        renderMarketplaceGrid();
      });
    });
  }

  function openPreview(slug) {
    const modal = document.getElementById("template-preview-modal");
    const t = allTemplates.find((x) => x.slug === slug);
    if (!modal || !t) return;

    modal.querySelector("[data-preview-image]").src = templateImageUrl(t);
    modal.querySelector("[data-preview-image]").alt = t.name;
    modal.querySelector("[data-preview-name]").textContent = t.name;
    modal.querySelector("[data-preview-meta]").textContent = [t.occasion, t.theme, t.style, t.mood].filter(Boolean).join(" · ");
    modal.querySelector("[data-preview-price]").textContent = formatCurrency(t.price);
    modal.querySelector("[data-preview-use]").dataset.useTemplate = t.slug;
    modal.classList.add("open");
  }

  function initMarketplacePreviewModal() {
    const modal = document.getElementById("template-preview-modal");
    if (!modal) return;
    modal.addEventListener("click", (e) => {
      if (e.target === modal || e.target.closest("[data-close-preview]")) modal.classList.remove("open");
      const useBtn = e.target.closest("[data-use-template]");
      if (useBtn) handleUseTemplate(useBtn.dataset.useTemplate);
    });
  }

  async function initMarketplaceGrid() {
    const grid = document.getElementById("marketplace-grid");
    if (!grid) return;
    wireCardActions(grid);
    initMarketplacePreviewModal();

    const searchInput = document.getElementById("marketplace-search");
    if (searchInput) {
      let debounce;
      searchInput.addEventListener("input", () => {
        clearTimeout(debounce);
        debounce = setTimeout(() => {
          activeFilters.search = searchInput.value.trim();
          renderMarketplaceGrid();
        }, 200);
      });
    }

    try {
      const { templates } = await apiFetch("/api/templates");
      allTemplates = templates;
      renderOccasionFilters();
      renderMarketplaceGrid();
    } catch (err) {
      grid.innerHTML = `<p class="field-error">Couldn't load templates right now (${escapeHtml(err.message)}).</p>`;
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    initFeaturedGrid();
    initMarketplaceGrid();
  });
})();
