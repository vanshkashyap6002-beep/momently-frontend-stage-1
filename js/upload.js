/* ============================================================================
   Momently Stage 1 — upload.js
   Owns the upload zone on create-memory.html: click-to-browse, drag & drop,
   thumbnail previews, and removal. Exposes window.MomentlyUpload so
   create-memory.js can initialize it once it knows the order id and check
   how many files are attached before letting the customer continue.
   ========================================================================== */

(function () {
  "use strict";
  const { apiFetch, escapeHtml } = window.Momently;

  let orderId = null;
  let files = []; // [{ id, filename, mimeType }]

  function renderPreviews(previewsEl) {
    previewsEl.innerHTML = files
      .map((f) => {
        const src = `/api/media/${f.id}/file`;
        const media = (f.mimeType || "").startsWith("video/")
          ? `<video src="${src}" muted playsinline></video>`
          : `<img src="${src}" alt="${escapeHtml(f.filename)}">`;
        return `<div class="upload-thumb" data-media-id="${f.id}">${media}<button type="button" class="remove-thumb" data-remove="${f.id}" aria-label="Remove ${escapeHtml(f.filename)}">✕</button></div>`;
      })
      .join("");
  }

  async function uploadFiles(fileList, previewsEl, statusEl) {
    const formData = new FormData();
    Array.from(fileList).forEach((f) => formData.append("files", f));
    if (statusEl) statusEl.textContent = "Uploading…";
    try {
      const { media } = await apiFetch(`/api/orders/${orderId}/media`, { method: "POST", body: formData });
      files = files.concat(media);
      renderPreviews(previewsEl);
      if (statusEl) statusEl.textContent = "";
    } catch (err) {
      if (statusEl) statusEl.textContent = err.message;
    }
  }

  async function removeFile(mediaId, previewsEl) {
    const previous = files;
    files = files.filter((f) => f.id !== mediaId);
    renderPreviews(previewsEl);
    try {
      await apiFetch(`/api/orders/${orderId}/media/${mediaId}`, { method: "DELETE" });
    } catch {
      files = previous; // put it back if the delete actually failed server-side
      renderPreviews(previewsEl);
    }
  }

  async function loadExisting(previewsEl) {
    try {
      const { media } = await apiFetch(`/api/orders/${orderId}/media`);
      files = media;
      renderPreviews(previewsEl);
    } catch {
      /* fine — starts empty */
    }
  }

  function init(id) {
    orderId = id;
    const zone = document.getElementById("upload-zone");
    const input = document.getElementById("file-input");
    const previewsEl = document.getElementById("upload-previews");
    if (!zone || !input || !previewsEl) return;

    loadExisting(previewsEl);

    zone.addEventListener("click", () => input.click());
    zone.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        input.click();
      }
    });
    input.addEventListener("change", () => {
      if (input.files.length) uploadFiles(input.files, previewsEl);
      input.value = "";
    });

    ["dragover", "dragenter"].forEach((evt) =>
      zone.addEventListener(evt, (e) => {
        e.preventDefault();
        zone.classList.add("dragover");
      })
    );
    ["dragleave", "drop"].forEach((evt) =>
      zone.addEventListener(evt, (e) => {
        e.preventDefault();
        zone.classList.remove("dragover");
      })
    );
    zone.addEventListener("drop", (e) => {
      if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files, previewsEl);
    });

    previewsEl.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-remove]");
      if (btn) removeFile(btn.dataset.remove, previewsEl);
    });
  }

  window.MomentlyUpload = {
    init,
    getCount: () => files.length,
    getFiles: () => files.slice(),
  };
})();
