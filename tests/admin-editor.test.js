const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('../js/admin.js'), 'utf8');
const html = fs.readFileSync(require.resolve('../admin/orders.html'), 'utf8');
const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]));
const start = source.indexOf('  function assertMemoryEditorReady()');
const end = source.indexOf('  async function fillDetail', start);
function check(available, lifecycle = {}) {
  const context = {document:{getElementById:id=>available.has(id)?{}:null},window:{ChermoAdminLifecycle:lifecycle}};
  vm.runInNewContext(source.slice(start, end) + '\nassertMemoryEditorReady();', context);
}
test('current admin HTML supplies every editor field and loads lifecycle before admin script', () => {
  assert.doesNotThrow(() => check(ids));
  assert.ok(html.indexOf('src="../js/admin-lifecycle.js') < html.indexOf('src="../js/admin.js'));
  const fill = source.slice(end, source.indexOf('  function openMemoryPreview', end));
  for (const match of fill.matchAll(/getElementById\("([^"]+)"\)/g)) assert.ok(ids.has(match[1]), `Missing field: ${match[1]}`);
});
test('stale markup fails clearly before attempting to fill missing inputs', () => {
  for (const id of ['recipient-input','date-input','occasion-input','personal-input','template-input','memory-lifecycle-panel']) {
    const stale = new Set(ids); stale.delete(id);
    assert.throws(() => check(stale), /different versions/);
  }
  assert.throws(() => check(ids, null), /different versions/);
  assert.match(source, /async function fillDetail\(order\)\s*\{\s*assertMemoryEditorReady\(\);/);
});
