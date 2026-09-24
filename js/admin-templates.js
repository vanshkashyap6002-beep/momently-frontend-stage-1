const {
  apiFetch,
  escapeHtml,
  formatCurrency,
} = window.Momently;

(function () {
  "use strict";

  // --------------------------------------------------
  // State
  // --------------------------------------------------

  const state = {
    templates: [],
    editingId: null,
    saving: false,
  };

  // --------------------------------------------------
  // DOM
  // --------------------------------------------------

  const tableBody = document.getElementById(
    "templates-table-body"
  );

  const templateCount = document.getElementById(
    "template-count"
  );

  const templateBanner = document.getElementById(
    "template-banner"
  );

  const modal = document.getElementById(
    "template-modal"
  );

  const modalTitle = document.getElementById(
    "template-modal-title"
  );

  const form = document.getElementById(
    "template-form"
  );

  const formError = document.getElementById(
    "template-form-error"
  );

  const saveButton = document.getElementById(
    "save-template-btn"
  );

  const addButton = document.getElementById(
    "add-template-btn"
  );

  // --------------------------------------------------
  // Notifications
  // --------------------------------------------------

  function showBanner(message, type = "error") {
    if (!templateBanner) {
      return;
    }

    templateBanner.textContent = message || "";
    templateBanner.hidden = !message;
    templateBanner.dataset.type = type;
  }

  function clearBanner() {
    showBanner("");
  }

  function showFormError(message) {
    if (!formError) {
      return;
    }

    formError.textContent = message || "";
    formError.hidden = !message;
  }

  function clearFormError() {
    showFormError("");
  }

  // --------------------------------------------------
  // Form helpers
  // --------------------------------------------------

  function setSaving(isSaving) {
    state.saving = isSaving;

    if (!saveButton) {
      return;
    }

    saveButton.disabled = isSaving;

    saveButton.textContent = isSaving
      ? "Saving..."
      : state.editingId
        ? "Save changes"
        : "Save template";
  }

  function getValue(id) {
    const element = document.getElementById(id);

    return element
      ? element.value.trim()
      : "";
  }

  function setValue(id, value) {
    const element = document.getElementById(id);

    if (element) {
      element.value = value ?? "";
    }
  }

  function getEnabledValue() {
    const element = document.getElementById(
      "template-enabled"
    );

    return element
      ? element.value === "true"
      : true;
  }

  function setEnabledValue(value) {
    const element = document.getElementById(
      "template-enabled"
    );

    if (element) {
      element.value = value
        ? "true"
        : "false";
    }
  }

  function getTemplateFormData() {
    return {
      slug: getValue(
        "template-slug"
      ),

      name: getValue(
        "template-name"
      ),

      occasion: getValue(
        "template-occasion"
      ),

      theme: getValue(
        "template-theme"
      ),

      style: getValue(
        "template-style"
      ),

      mood: getValue(
        "template-mood"
      ),

      accent: getValue(
        "template-accent"
      ),

      price: Number(
        getValue(
          "template-price"
        )
      ),

      previewSeed: getValue(
        "template-preview-seed"
      ),

      creatorName:
        getValue(
          "template-creator"
        ) || "CHERMO",

      shortDescription:
        getValue(
          "template-short-description"
        ),

      description:
        getValue(
          "template-description"
        ),

      isEnabled:
        getEnabledValue(),
    };
  }

  // --------------------------------------------------
  // Validation
  // --------------------------------------------------

  function validateTemplate(data) {
    if (!data.slug) {
      return "Template slug is required.";
    }

    if (!data.name) {
      return "Template name is required.";
    }

    if (!data.occasion) {
      return "Template occasion is required.";
    }

    if (!data.accent) {
      return "Please select an accent.";
    }

    if (!Number.isFinite(data.price)) {
      return "Price must be a valid number.";
    }

    if (data.price < 0) {
      return "Price cannot be negative.";
    }

    if (!data.previewSeed) {
      return "Preview URL is required.";
    }

    // Validate preview URL
    try {
      const url = new URL(data.previewSeed);

      if (
        url.protocol !== "http:" &&
        url.protocol !== "https:"
      ) {
        return "Preview URL must start with http:// or https://.";
      }
    } catch {
      return "Please enter a valid Preview URL.";
    }

    return "";
  }

  // --------------------------------------------------
  // Modal
  // --------------------------------------------------

  function openModal() {
    if (!modal) {
      return;
    }

    modal.hidden = false;

    document.body.classList.add(
      "modal-open"
    );
  }

  function closeModal() {
    if (!modal) {
      return;
    }

    modal.hidden = true;

    document.body.classList.remove(
      "modal-open"
    );

    state.editingId = null;
    state.saving = false;

    clearFormError();

    if (saveButton) {
      saveButton.disabled = false;
      saveButton.textContent =
        "Save template";
    }
  }

  function resetForm() {
    if (!form) {
      return;
    }

    form.reset();

    // Hidden field used only for edit state,
    // never entered by the admin.
    setValue(
      "template-id",
      ""
    );

    setEnabledValue(true);

    clearFormError();
  }

  function openAddModal() {
    if (state.saving) {
      return;
    }

    state.editingId = null;

    resetForm();

    if (modalTitle) {
      modalTitle.textContent =
        "Add template";
    }

    if (saveButton) {
      saveButton.textContent =
        "Save template";
    }

    openModal();
  }

  function openEditModal(template) {
    if (!template) {
      return;
    }

    state.editingId =
      template.id;

    // ID is stored internally for PUT.
    // It is NOT shown as a form field.
    setValue(
      "template-id",
      template.id
    );

    setValue(
      "template-slug",
      template.slug
    );

    setValue(
      "template-name",
      template.name
    );

    setValue(
      "template-occasion",
      template.occasion
    );

    setValue(
      "template-theme",
      template.theme
    );

    setValue(
      "template-style",
      template.style
    );

    setValue(
      "template-mood",
      template.mood
    );

    setValue(
      "template-accent",
      template.accent
    );

    setValue(
      "template-price",
      template.price
    );

    setValue(
      "template-preview-seed",
      template.previewSeed
    );

    setValue(
      "template-creator",
      template.creatorName
    );

    setValue(
      "template-short-description",
      template.shortDescription
    );

    setValue(
      "template-description",
      template.description
    );

    setEnabledValue(
      template.isEnabled
    );

    clearFormError();

    if (modalTitle) {
      modalTitle.textContent =
        "Edit template";
    }

    if (saveButton) {
      saveButton.textContent =
        "Save changes";
    }

    openModal();
  }

  // --------------------------------------------------
  // Render templates
  // --------------------------------------------------

  function renderTemplates() {
    if (!tableBody) {
      return;
    }

    const templates =
      state.templates;

    if (templateCount) {
      templateCount.textContent =
        `${templates.length} ${
          templates.length === 1
            ? "template"
            : "templates"
        }`;
    }

    if (!templates.length) {
      tableBody.innerHTML = `
        <tr>
          <td
            colspan="5"
            class="admin-table-empty"
          >
            No templates found.
          </td>
        </tr>
      `;

      return;
    }

    tableBody.innerHTML =
      templates
        .map((template) => {
          const status =
            template.isEnabled
              ? "Enabled"
              : "Disabled";

          const action =
            template.isEnabled
              ? "Disable"
              : "Enable";

          const actionClass =
            template.isEnabled
              ? "btn-secondary"
              : "btn-primary";

          return `
            <tr>

              <td>
                <div class="template-admin-name">

                  <strong>
                    ${escapeHtml(
                      template.name
                    )}
                  </strong>

                  ${
                    template.slug
                      ? `
                        <span>
                          ${escapeHtml(
                            template.slug
                          )}
                        </span>
                      `
                      : ""
                  }

                  ${
                    template.shortDescription
                      ? `
                        <small>
                          ${escapeHtml(
                            template.shortDescription
                          )}
                        </small>
                      `
                      : ""
                  }

                </div>
              </td>

              <td>
                ${escapeHtml(
                  template.occasion ||
                    "-"
                )}
              </td>

              <td>
                ${formatCurrency(
                  template.price || 0
                )}
              </td>

              <td>
                <span
                  class="template-status ${
                    template.isEnabled
                      ? "is-enabled"
                      : "is-disabled"
                  }"
                >
                  ${status}
                </span>
              </td>

              <td>
                <div class="template-actions">

                  <button
                    type="button"
                    class="btn btn-secondary"
                    data-action="preview"
                    data-id="${escapeHtml(
                      template.id
                    )}"
                  >
                    Preview
                  </button>

                  <button
                    type="button"
                    class="btn btn-secondary"
                    data-action="edit"
                    data-id="${escapeHtml(
                      template.id
                    )}"
                  >
                    Edit
                  </button>

                  <button
                    type="button"
                    class="btn ${actionClass}"
                    data-action="toggle"
                    data-id="${escapeHtml(
                      template.id
                    )}"
                  >
                    ${action}
                  </button>

                </div>
              </td>

            </tr>
          `;
        })
        .join("");
  }

  // --------------------------------------------------
  // Load templates
  // --------------------------------------------------

  async function loadTemplates() {
    if (!tableBody) {
      return;
    }

    tableBody.innerHTML = `
      <tr>
        <td
          colspan="5"
          class="admin-table-empty"
        >
          Loading templates...
        </td>
      </tr>
    `;

    try {
      const data =
        await apiFetch(
          "/api/templates/admin"
        );

      state.templates =
        Array.isArray(
          data.templates
        )
          ? data.templates
          : [];

      renderTemplates();

    } catch (error) {
      console.error(
        "Load templates error:",
        error
      );

      tableBody.innerHTML = `
        <tr>
          <td
            colspan="5"
            class="admin-table-empty"
          >
            Unable to load templates.
          </td>
        </tr>
      `;

      showBanner(
        error.message ||
          "Unable to load templates."
      );
    }
  }

  // --------------------------------------------------
  // Save template
  // --------------------------------------------------

  async function saveTemplate() {
    if (state.saving) {
      return;
    }

    clearFormError();
    clearBanner();

    const data =
      getTemplateFormData();

    const validationError =
      validateTemplate(data);

    if (validationError) {
      showFormError(
        validationError
      );

      return;
    }

    setSaving(true);

    try {
      let result;

      if (state.editingId) {
        result =
          await apiFetch(
            `/api/templates/admin/${encodeURIComponent(
              state.editingId
            )}`,
            {
              method: "PUT",
              body: data,
            }
          );

      } else {
        result =
          await apiFetch(
            "/api/templates/admin",
            {
              method: "POST",
              body: data,
            }
          );
      }

      if (
        !result ||
        !result.template
      ) {
        throw new Error(
          "The server did not return the saved template."
        );
      }

      const savedTemplate =
        result.template;

      if (state.editingId) {
        state.templates =
          state.templates.map(
            (template) =>
              String(template.id) ===
              String(state.editingId)
                ? savedTemplate
                : template
          );

        showBanner(
          "Template updated successfully.",
          "success"
        );

      } else {
        state.templates = [
          savedTemplate,
          ...state.templates,
        ];

        showBanner(
          "Template added successfully.",
          "success"
        );
      }

      renderTemplates();
      closeModal();

    } catch (error) {
      console.error(
        "Save template error:",
        error
      );

      showFormError(
        error.message ||
          "Unable to save template."
      );

    } finally {
      setSaving(false);
    }
  }

  // --------------------------------------------------
  // Enable / Disable
  // --------------------------------------------------

  async function toggleTemplate(
    template
  ) {
    if (
      !template ||
      !template.id
    ) {
      return;
    }

    const nextState =
      !template.isEnabled;

    try {
      const result =
        await apiFetch(
          `/api/templates/admin/${encodeURIComponent(
            template.id
          )}`,
          {
            method: "PUT",
            body: {
              isEnabled:
                nextState,
            },
          }
        );

      if (
        !result ||
        !result.template
      ) {
        throw new Error(
          "The server did not return the updated template."
        );
      }

      const updatedTemplate =
        result.template;

      state.templates =
        state.templates.map(
          (item) =>
            String(item.id) ===
            String(template.id)
              ? updatedTemplate
              : item
        );

      renderTemplates();

      showBanner(
        nextState
          ? "Template enabled successfully."
          : "Template disabled successfully.",
        "success"
      );

    } catch (error) {
      console.error(
        "Toggle template error:",
        error
      );

      showBanner(
        error.message ||
          "Unable to update template."
      );
    }
  }

  // --------------------------------------------------
  // Preview
  // --------------------------------------------------

  function previewTemplate(template) {
    if (!template) {
      return;
    }

    const previewUrl = String(
      template.previewSeed || ""
    ).trim();

    if (!previewUrl) {
      showBanner(
        "This template does not have a preview URL."
      );

      return;
    }

    try {
      const url = new URL(
        previewUrl
      );

      if (
        url.protocol !== "http:" &&
        url.protocol !== "https:"
      ) {
        throw new Error(
          "Invalid protocol"
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

      showBanner(
        "This template has an invalid preview URL."
      );
    }
  }

  // --------------------------------------------------
  // Table actions
  // --------------------------------------------------

  function handleTableClick(event) {
    const button =
      event.target.closest(
        "[data-action]"
      );

    if (!button) {
      return;
    }

    const id =
      button.dataset.id;

    if (!id) {
      return;
    }

    const template =
      state.templates.find(
        (item) =>
          String(item.id) ===
          String(id)
      );

    if (!template) {
      return;
    }

    const action =
      button.dataset.action;

    if (action === "preview") {
      previewTemplate(
        template
      );

      return;
    }

    if (action === "edit") {
      openEditModal(
        template
      );

      return;
    }

    if (action === "toggle") {
      toggleTemplate(
        template
      );
    }
  }

  // --------------------------------------------------
  // Events
  // --------------------------------------------------

  function initEvents() {
    if (addButton) {
      addButton.addEventListener(
        "click",
        openAddModal
      );
    }

    if (form) {
      form.addEventListener(
        "submit",
        (event) => {
          event.preventDefault();
          saveTemplate();
        }
      );
    }

    if (tableBody) {
      tableBody.addEventListener(
        "click",
        handleTableClick
      );
    }

    document.addEventListener(
      "click",
      (event) => {
        const closeButton =
          event.target.closest(
            "[data-close-modal]"
          );

        if (closeButton) {
          closeModal();
        }
      }
    );

    document.addEventListener(
      "keydown",
      (event) => {
        if (
          event.key === "Escape" &&
          modal &&
          !modal.hidden
        ) {
          closeModal();
        }
      }
    );
  }

  // --------------------------------------------------
  // Admin session
  // --------------------------------------------------

  async function startAdminTemplates() {
    try {
      await apiFetch(
        "/api/admin/me"
      );

      await loadTemplates();

    } catch (error) {
      console.error(
        "Admin session error:",
        error
      );

      window.location.href =
        "index.html";
    }
  }

  // --------------------------------------------------
  // Start
  // --------------------------------------------------

  function init() {
    initEvents();
    startAdminTemplates();
  }

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      init
    );
  } else {
    init();
  }

})();
