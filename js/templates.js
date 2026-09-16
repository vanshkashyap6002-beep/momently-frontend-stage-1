/* ============================================================================
   Momently Stage 1 — templates.js
   Renders the read-only template catalog. Used on TWO pages:
   - index.html:     #featured-templates-grid  (first 6, no filters)
   - templates.html: #marketplace-grid + filters sidebar + search + preview modal

   Template data comes from:
   PostgreSQL → /api/templates → this file
   ========================================================================== */

(function () {
  "use strict";

  const {
    apiFetch,
    escapeHtml,
    formatCurrency,
    currentUser
  } = window.Momently;


  // ------------------------------------------------------------------
  // Template image
  // ------------------------------------------------------------------

  function templateImageUrl(t) {
    return t.previewImageUrl || "";
  }


  // ------------------------------------------------------------------
  // Template card
  // ------------------------------------------------------------------

  function renderTemplateCard(
    t,
    { showPreview = false } = {}
  ) {
    return `
      <article class="template-card">

        <div class="template-card-media">

          <img
            src="${escapeHtml(templateImageUrl(t))}"
            alt="${escapeHtml(t.name)} template preview"
            loading="lazy"
          >

          <span class="template-badge">
            ${escapeHtml(t.occasion || "")}
          </span>

          <span class="template-price">
            ${formatCurrency(t.price || 0)}
          </span>

        </div>

        <div class="template-card-body">

          <h3>
            ${escapeHtml(t.name || "")}
          </h3>

          <p class="template-card-meta">
            ${escapeHtml(t.theme || "")}
            ${
              t.theme && t.style
                ? " · "
                : ""
            }
            ${escapeHtml(t.style || "")}
          </p>

          <p class="template-card-description">
            ${escapeHtml(
              t.shortDescription || ""
            )}
          </p>

          <div class="template-card-actions">

            ${
              showPreview
                ? `
                  <button
                    type="button"
                    class="btn btn-outline btn-sm"
                    data-preview-template="${escapeHtml(
                      t.slug
                    )}"
                  >
                    Preview
                  </button>
                `
                : ""
            }

            <button
              type="button"
              class="btn btn-primary btn-sm"
              data-use-template="${escapeHtml(
                t.slug
              )}"
            >
              Use Template
            </button>

          </div>

        </div>

      </article>
    `;
  }


  // ------------------------------------------------------------------
  // Use Template
  // ------------------------------------------------------------------

  async function handleUseTemplate(slug) {
    const user = await currentUser();

    const nextUrl =
      `create-memory.html?template=${encodeURIComponent(
        slug
      )}`;

    window.location.href = user
      ? nextUrl
      : `login.html?next=${encodeURIComponent(
          nextUrl
        )}`;
  }


  // ------------------------------------------------------------------
  // Card actions
  // ------------------------------------------------------------------

  function wireCardActions(container) {
    container.addEventListener(
      "click",
      (e) => {

        const useBtn =
          e.target.closest(
            "[data-use-template]"
          );

        if (useBtn) {
          return handleUseTemplate(
            useBtn.dataset.useTemplate
          );
        }


        const previewBtn =
          e.target.closest(
            "[data-preview-template]"
          );

        if (previewBtn) {
          return openPreview(
            previewBtn.dataset.previewTemplate
          );
        }

      }
    );
  }


  // ------------------------------------------------------------------
  // Homepage featured templates
  // ------------------------------------------------------------------

  async function initFeaturedGrid() {

    const grid =
      document.getElementById(
        "featured-templates-grid"
      );

    if (!grid) {
      return;
    }

    wireCardActions(grid);

    try {

      const { templates } =
        await apiFetch(
          "/api/templates"
        );

      grid.innerHTML =
        templates
          .slice(0, 6)
          .map((t) =>
            renderTemplateCard(t)
          )
          .join("");

    } catch (err) {

      grid.innerHTML = `
        <p class="field-error">
          Couldn't load templates right now
          (${escapeHtml(
            err.message
          )}).
        </p>
      `;

    }
  }


  // ------------------------------------------------------------------
  // Full marketplace
  // ------------------------------------------------------------------

  let allTemplates = [];

  let activeFilters = {
    occasion: null,
    search: ""
  };


  // ------------------------------------------------------------------
  // Filters
  // ------------------------------------------------------------------

  function applyFilters() {

    return allTemplates.filter(
      (t) => {

        if (
          activeFilters.occasion &&
          t.occasion !==
            activeFilters.occasion
        ) {
          return false;
        }


        if (
          activeFilters.search
        ) {

          const q =
            activeFilters.search.toLowerCase();

          const matchesName =
            (t.name || "")
              .toLowerCase()
              .includes(q);

          const matchesOccasion =
            (t.occasion || "")
              .toLowerCase()
              .includes(q);

          const matchesDescription =
            (
              t.shortDescription ||
              ""
            )
              .toLowerCase()
              .includes(q);


          if (
            !matchesName &&
            !matchesOccasion &&
            !matchesDescription
          ) {
            return false;
          }
        }


        return true;
      }
    );
  }


  // ------------------------------------------------------------------
  // Marketplace grid
  // ------------------------------------------------------------------

  function renderMarketplaceGrid() {

    const grid =
      document.getElementById(
        "marketplace-grid"
      );

    if (!grid) {
      return;
    }


    const empty =
      document.getElementById(
        "marketplace-empty"
      );


    const filtered =
      applyFilters();


    grid.innerHTML =
      filtered
        .map((t) =>
          renderTemplateCard(
            t,
            {
              showPreview: true
            }
          )
        )
        .join("");


    if (empty) {

      empty.style.display =
        filtered.length === 0
          ? "block"
          : "none";
    }
  }


  // ------------------------------------------------------------------
  // Occasion filters
  // ------------------------------------------------------------------

  function renderOccasionFilters() {

    const wrap =
      document.getElementById(
        "occasion-filters"
      );

    if (!wrap) {
      return;
    }


    const occasions = [
      ...new Set(
        allTemplates.map(
          (t) => t.occasion
        )
      )
    ]
      .filter(Boolean)
      .sort();


    wrap.innerHTML =
      `
        <button
          type="button"
          class="filter-chip${
            activeFilters.occasion
              ? ""
              : " active"
          }"
          data-occasion=""
        >
          All
        </button>
      ` +

      occasions
        .map(
          (occasion) => `
            <button
              type="button"
              class="filter-chip${
                activeFilters.occasion ===
                occasion
                  ? " active"
                  : ""
              }"
              data-occasion="${escapeHtml(
                occasion
              )}"
            >
              ${escapeHtml(
                occasion
              )}
            </button>
          `
        )
        .join("");


    wrap
      .querySelectorAll(
        "[data-occasion]"
      )
      .forEach(
        (chip) => {

          chip.addEventListener(
            "click",
            () => {

              activeFilters.occasion =
                chip.dataset.occasion ||
                null;

              renderOccasionFilters();

              renderMarketplaceGrid();

            }
          );

        }
      );
  }


  // ------------------------------------------------------------------
  // Preview modal
  // ------------------------------------------------------------------

  function openPreview(slug) {

    const modal =
      document.getElementById(
        "template-preview-modal"
      );


    const template =
      allTemplates.find(
        (item) =>
          item.slug === slug
      );


    if (
      !modal ||
      !template
    ) {
      return;
    }


    // --------------------------------------------------------------
    // Preview image
    // --------------------------------------------------------------

    const image =
      modal.querySelector(
        "[data-preview-image]"
      );


    if (image) {

      image.src =
        templateImageUrl(
          template
        );

      image.alt =
        `${template.name} template preview`;
    }


    // --------------------------------------------------------------
    // Template name
    // --------------------------------------------------------------

    const name =
      modal.querySelector(
        "[data-preview-name]"
      );


    if (name) {

      name.textContent =
        template.name || "";
    }


    // --------------------------------------------------------------
    // Template metadata
    // --------------------------------------------------------------

    const meta =
      modal.querySelector(
        "[data-preview-meta]"
      );


    if (meta) {

      meta.textContent = [
        template.occasion,
        template.theme,
        template.style,
        template.mood
      ]
        .filter(Boolean)
        .join(" · ");
    }


    // --------------------------------------------------------------
    // Template description
    // --------------------------------------------------------------

    const description =
      modal.querySelector(
        "[data-preview-description]"
      );


    if (description) {

      description.textContent =
        template.description ||
        template.shortDescription ||
        "A special interactive experience made with Momently.";

      description.style.display =
        "block";
    }


    // --------------------------------------------------------------
    // Price
    // --------------------------------------------------------------

    const price =
      modal.querySelector(
        "[data-preview-price]"
      );


    if (price) {

      price.textContent =
        formatCurrency(
          template.price || 0
        );
    }


    // --------------------------------------------------------------
    // Preview Experience button
    // --------------------------------------------------------------

    const previewButton =
      modal.querySelector(
        "[data-preview-experience]"
      );


    if (previewButton) {

      previewButton.dataset.previewExperience =
        template.slug;
    }


    // --------------------------------------------------------------
    // Use Template button
    // --------------------------------------------------------------

    const useButton =
      modal.querySelector(
        "[data-preview-use]"
      );


    if (useButton) {

      useButton.dataset.useTemplate =
        template.slug;
    }


    // --------------------------------------------------------------
    // Open modal
    // --------------------------------------------------------------

    modal.classList.add(
      "open"
    );
  }


  // ------------------------------------------------------------------
  // Open actual template experience
  // ------------------------------------------------------------------

  function openTemplateExperience(
    slug
  ) {

    const template =
      allTemplates.find(
        (item) =>
          item.slug === slug
      );


    if (!template) {
      return;
    }


    const previewUrl =
      String(
        template.previewSeed || ""
      ).trim();


    if (!previewUrl) {

      alert(
        "This template does not have a preview URL yet."
      );

      return;
    }


    try {

      const url =
        new URL(
          previewUrl
        );


      if (
        url.protocol !== "http:" &&
        url.protocol !== "https:"
      ) {
        throw new Error(
          "Invalid preview URL protocol"
        );
      }


      window.open(
        url.href,
        "_blank",
        "noopener,noreferrer"
      );

    } catch (error) {

      console.error(
        "Preview URL error:",
        error
      );


      alert(
        "This template has an invalid preview URL."
      );
    }
  }


  // ------------------------------------------------------------------
  // Preview modal actions
  // ------------------------------------------------------------------

  function initMarketplacePreviewModal() {

    const modal =
      document.getElementById(
        "template-preview-modal"
      );


    if (!modal) {
      return;
    }


    modal.addEventListener(
      "click",
      (e) => {

        // ------------------------------------------------------------
        // Close modal
        // ------------------------------------------------------------

        if (
          e.target === modal ||
          e.target.closest(
            "[data-close-preview]"
          )
        ) {

          modal.classList.remove(
            "open"
          );

          return;
        }


        // ------------------------------------------------------------
        // Preview actual experience
        // ------------------------------------------------------------

        const previewButton =
          e.target.closest(
            "[data-preview-experience]"
          );


        if (previewButton) {

          const slug =
            previewButton.dataset
              .previewExperience;


          openTemplateExperience(
            slug
          );

          return;
        }


        // ------------------------------------------------------------
        // Use Template
        // ------------------------------------------------------------

        const useBtn =
          e.target.closest(
            "[data-use-template]"
          );


        if (useBtn) {

          handleUseTemplate(
            useBtn.dataset.useTemplate
          );

          return;
        }

      }
    );
  }


  // ------------------------------------------------------------------
  // Marketplace initialization
  // ------------------------------------------------------------------

  async function initMarketplaceGrid() {

    const grid =
      document.getElementById(
        "marketplace-grid"
      );


    if (!grid) {
      return;
    }


    wireCardActions(
      grid
    );


    initMarketplacePreviewModal();


    // --------------------------------------------------------------
    // Search
    // --------------------------------------------------------------

    const searchInput =
      document.getElementById(
        "marketplace-search"
      );


    if (searchInput) {

      let debounce;


      searchInput.addEventListener(
        "input",
        () => {

          clearTimeout(
            debounce
          );


          debounce =
            setTimeout(
              () => {

                activeFilters.search =
                  searchInput.value.trim();

                renderMarketplaceGrid();

              },
              200
            );

        }
      );
    }


    // --------------------------------------------------------------
    // Load templates
    // --------------------------------------------------------------

    try {

      const { templates } =
        await apiFetch(
          "/api/templates"
        );


      allTemplates =
        Array.isArray(
          templates
        )
          ? templates
          : [];


      renderOccasionFilters();

      renderMarketplaceGrid();

    } catch (err) {

      console.error(
        "Marketplace templates error:",
        err
      );


      grid.innerHTML = `
        <p class="field-error">
          Couldn't load templates right now
          (${escapeHtml(
            err.message
          )}).
        </p>
      `;
    }
  }


  // ------------------------------------------------------------------
  // Start
  // ------------------------------------------------------------------

  document.addEventListener(
    "DOMContentLoaded",
    () => {

      initFeaturedGrid();

      initMarketplaceGrid();

    }
  );

})();