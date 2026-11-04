(() => {
  'use strict';
  let busy = false, emailRequest, objectUrls = [];
  const api = (...args) => window.Momently.apiFetch(...args);
  const esc = value => window.Momently.escapeHtml(value || '');
  window.ChermoAdminLifecycle = {
    previewMedia(order) {
      objectUrls.forEach(url => URL.revokeObjectURL(url)); objectUrls = [];
      const existing = order.media.map(m => ({...m, caption:document.getElementById('caption-'+m.id)?.value || ''}));
      const added = [...(document.getElementById('admin-media-files')?.files || [])].map(f => {
        const url=URL.createObjectURL(f); objectUrls.push(url);
        return {url, mimeType:f.type,caption:''};
      });
      return existing.concat(added);
    },
    async fill(order, reload) {
      const panel = document.getElementById('memory-lifecycle-panel');
      panel.textContent = 'Loading publication controls…';
      try {
        const [state, catalog] = await Promise.all([api(`/api/admin/orders/${order.id}/lifecycle`), api('/api/templates')]);
        const select = document.getElementById('template-input');
        select.innerHTML = `<option value="${esc(order.templateId)}" data-accent="${esc(order.accent)}">${esc(order.templateName)}</option>` + catalog.templates.filter(t => t.id !== order.templateId).map(t => `<option value="${esc(t.id)}" data-accent="${esc(t.accent)}">${esc(t.name)}</option>`).join('');
        document.getElementById('occasion-input').value = state.memory_occasion || '';
        panel.innerHTML = `<h3>Publication &amp; access</h3><p>${state.memory_archived_at ? 'Archived — restore before publishing.' : esc(order.status)}</p>
          <p>Current URL: <span>${esc(order.memoryUrl || order.memorySlug && 'https://www.chermo.in/memory/' + order.memorySlug || 'Not assigned')}</span></p>
          <p>Saving changes sends no email. CHERMO links show saved content when refreshed. Separately hosted websites must be managed separately until migrated.</p>
          <div class="field"><label for="admin-slug">CHERMO public slug</label><input id="admin-slug" maxlength="80" pattern="[a-z0-9]+(-[a-z0-9]+)*" value="${esc(order.memorySlug)}"><small>Old CHERMO slugs remain aliases. Migration uses stored CHERMO content; it does not copy or disable an external website.</small></div>
          <div class="field"><label for="admin-external-url">External HTTPS destination (optional; overrides slug)</label><input id="admin-external-url" type="url" placeholder="https://your-experience.example/"><small>Changing an external site's original URL cannot redirect or disable that site. Old CHERMO links will open the new destination.</small></div>
          <div style="display:flex;flex-wrap:wrap;gap:10px">
          <button class="btn btn-outline" data-action="link">${order.memoryUrl && !order.memorySlug ? 'Migrate to CHERMO link' : 'Save public link'}</button>
          <button class="btn btn-primary" data-action="publish">Publish / Republish without email</button>
          <button class="btn btn-outline" data-action="unpublish">Unpublish</button>
          <button class="btn btn-outline" data-action="update-email">Save and notify customer</button>
          <button class="btn btn-outline" data-action="email">Send / Resend publication email</button>
          <button class="btn btn-outline" data-action="archive">Archive memory</button>
          <button class="btn btn-outline" data-action="restore">Restore archive</button></div>
          <p>SMTP acceptance does not confirm inbox delivery. Unknown or pending attempts need investigation before a new resend.</p>
          <ul>${state.emails.map(e => `<li>${esc(e.created_at)} — ${esc(e.status)}</li>`).join('') || '<li>No recorded email attempts.</li>'}</ul>
          <details><summary>Admin activity</summary><ul>${state.events.map(e => `<li>${esc(e.created_at)} — ${esc(e.action)} — admin ${esc(e.admin_id)}</li>`).join('')}</ul></details>
          <h3>Photos &amp; captions</h3><p>Add replacements, preview the memory, then remove the old photo. Removal does not erase the file from storage.</p>
          <input type="file" id="admin-media-files" accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm" multiple aria-label="Photos and videos to add"><button class="btn btn-outline" data-action="upload">Upload selected files</button>
          ${order.media.map(m => `<div class="field"><label for="caption-${esc(m.id)}">${esc(m.filename)}</label><input id="caption-${esc(m.id)}" maxlength="1000" value="${esc(m.caption)}"><button class="btn btn-ghost" data-caption="${esc(m.id)}">Save caption</button><button class="btn btn-ghost" data-remove="${esc(m.id)}">Remove media</button></div>`).join('')}
          <p id="lifecycle-feedback" role="status"></p>`;
        panel.onclick = async e => {
          const button = e.target.closest('button'); if (!button || busy) return;
          const action = button.dataset.action, mediaId = button.dataset.caption || button.dataset.remove;
          if (!action && !mediaId) return;
          const feedback = document.getElementById('lifecycle-feedback');
          busy = true; button.disabled = true;
          try {
            const base = `/api/admin/orders/${encodeURIComponent(order.id)}`;
            if (mediaId) {
              const remove = Boolean(button.dataset.remove);
              if (remove && !confirm('Remove this media from the memory? Its stored file will be retained.')) return;
              await api(`${base}/media/${encodeURIComponent(mediaId)}`, {method:'PATCH', body:{caption:document.getElementById('caption-'+mediaId).value,remove,confirm:remove?'REMOVE '+mediaId:undefined}});
            } else if (action === 'upload') {
              const form = new FormData(); for (const file of document.getElementById('admin-media-files').files) form.append('files',file);
              await api(base+'/media',{method:'POST',body:form});
            } else if (['email','update-email'].includes(action)) {
              if (!confirm(`Send one publication email to ${order.customerEmail}?`)) return;
              if (action==='update-email') await window.ChermoAdminLifecycle.save();
              emailRequest ||= crypto.randomUUID();
              const result = await api(base+'/email',{method:'POST',body:{requestId:emailRequest}});
              emailRequest = undefined;
              await reload(); document.getElementById('lifecycle-feedback').textContent = `Email status: ${result.status}.`; return;
            } else {
              let confirmation;
              if (['archive','unpublish'].includes(action)) {
                confirmation=prompt(`Type ${action.toUpperCase()} ${order.id} to confirm. External websites remain accessible independently.`);
                if (!confirmation) return;
              }
              const external = document.getElementById('admin-external-url').value.trim();
              if (action==='link' && external && !confirm('Change the destination to this external URL? The external site remains independently managed.')) return;
              if (action==='link' && !external && order.memoryUrl && !order.memorySlug) {
                if(!confirm('Migrate the stored CHERMO content to its shared memory layout? This will not copy or disable the external website. Preview the CHERMO content first.')) return;
                confirmation='MIGRATE '+order.id;
              }
              await api(base+'/lifecycle',{method:'POST',body:{action,newSlug:document.getElementById('admin-slug').value,memoryLink:action==='link'?external:undefined,confirm:confirmation}});
            }
            await reload(); document.getElementById('lifecycle-feedback').textContent = 'Saved successfully. No email was sent.';
          } catch(err) { feedback.textContent = err.message; }
          finally { busy=false; button.disabled=false; }
        };
      } catch(err) { panel.textContent=err.message; }
    }
  };
})();
