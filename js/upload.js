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

  function previewMarkup(editable = false) {
    return files.map(f => {
      const src = window.Momently.apiUrl("/api/media/" + encodeURIComponent(f.id) + "/file");
      const name = escapeHtml(f.filename).replace(/"/g, "&quot;");
      const media = (f.mimeType || "").startsWith("video/")
        ? '<video crossorigin="use-credentials" muted playsinline preload="metadata" aria-label="' + name + '" src="' + src + '"></video>'
        : '<img crossorigin="use-credentials" alt="' + name + '" src="' + src + '">';
      const remove = editable ? '<button type="button" class="remove-thumb" data-remove="' + encodeURIComponent(f.id) + '" aria-label="Remove ' + name + '">×</button>' : "";
      return '<div class="upload-thumb">' + media + remove + '</div>';
    }).join("");
  }

  function init(id) {
    orderId = id;
    const zone = document.getElementById("upload-zone");
    const input = document.getElementById("file-input");
    const previews = document.getElementById("upload-previews");
    const status = document.getElementById("upload-status");
    const retry = document.getElementById("retry-media");
    const next = document.getElementById("step2-next");
    let busy = false;

    async function run(message, action, failureContext = "") {
      if (busy) return;
      busy = true;
      zone.disabled = next.disabled = true;
      previews.inert = true;
      retry.hidden = true;
      status.textContent = message;
      try {
        await action();
        previews.innerHTML = previewMarkup(true);
        status.textContent = files.length + (files.length === 1 ? " file ready." : " files ready.");
      } catch (error) {
        status.textContent = failureContext + error.message + " Reload the attached files before trying again.";
        retry.hidden = false;
      } finally {
        busy = false;
        previews.inert = !retry.hidden;
        zone.disabled = !retry.hidden;
        next.disabled = !retry.hidden || !files.length;
      }
    }

    function reload() {
      return run("Loading attached files…", async () => {
        const result = await apiFetch("/api/orders/" + orderId + "/media");
        files = result.media;
      });
    }
    function upload(selection) {
      if (!selection.length || zone.disabled) return;
      const data = new FormData();
      for (const file of selection) data.append("files", file);
      const names = Array.from(selection, f => f.name).join(", ");
      run("Uploading " + names + "…", async () => {
        const result = await apiFetch("/api/orders/" + orderId + "/media", { method: "POST", body: data });
        files = files.concat(result.media);
      }, "Upload of " + names + ": ");
    }
    retry.addEventListener("click", reload);
    zone.addEventListener("click", () => input.click());
    input.addEventListener("change", () => { upload(input.files); input.value = ""; });
    for (const type of ["dragenter", "dragover", "dragleave", "drop"]) {
      zone.addEventListener(type, event => {
        event.preventDefault();
        zone.classList.toggle("dragover", type === "dragenter" || type === "dragover");
        if (type === "drop") upload(event.dataTransfer.files);
      });
    }
    previews.addEventListener("click", event => {
      const button = event.target.closest("[data-remove]");
      if (!button) return;
      run("Removing file…", async () => {
        await apiFetch("/api/orders/" + orderId + "/media/" + button.dataset.remove, { method: "DELETE" });
        files = files.filter(f => String(f.id) !== button.dataset.remove);
      });
    });
    reload();
  }

  window.MomentlyUpload = { init, previewMarkup, getCount: () => files.length, getFiles: () => files.slice() };
})();
