const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { validateMemoryLink } = require('../js/memory-link');
test('preserves external URLs including exact query/fragment and casing', () => {
  for (const url of ['https://the-blooming.vercel.app/', 'https://Example.com/path?one=1&two=%2F#letter', 'https://chermo.in/memory/example']) assert.equal(validateMemoryLink(` ${url} `), url);
});
test('real publish click handler preserves input and handles failure without false success', async () => {
  const source = fs.readFileSync(require.resolve('../js/admin.js'), 'utf8');
  const start = source.indexOf('document.getElementById("confirm-publish-btn").onclick = async () => {');
  const end = source.indexOf('\n    };', start) + '\n    };'.length;
  assert.ok(start >= 0 && end > start);
  for (const mode of ['sent', 'email-failed', 'publish-failed', 'mismatched']) {
    const url = "https://the-blooming.vercel.app/it's-us?x=1&y=%2f#letter";
    const input = { value: ` ${url} `, setCustomValidity() {}, reportValidity: () => true };
    const button = { disabled: false };
    const messages = []; let submitted;
    const sandbox = { window: { ChermoMemoryLink: { validateMemoryLink } }, document: { getElementById: id => id === 'memory-link-input' ? input : button }, saveMemory: async () => {}, orderId: 'test', loadOrderDetail: async () => {}, showBanner: (message, type = 'error') => messages.push({ message, type }), apiFetch: async (path, options) => {
      submitted = options.body.memoryLink;
      if (mode === 'publish-failed') throw Error('mock request failure');
      return { memoryUrl: mode === 'mismatched' ? 'https://example.invalid/' : submitted, emailDelivered: mode === 'sent' };
    } };
    vm.runInNewContext(source.slice(start, end), sandbox);
    await button.onclick();
    assert.equal(submitted, url); assert.equal(button.disabled, false);
    assert.equal(messages.at(-1).type, mode === 'sent' ? 'success' : 'error');
  }
});
test('rejects unsafe and malformed destinations', () => {
  for (const value of ['', null, 'javascript:alert(1)', 'http://example.com', '//example.com', 'https://', 'https://user@example.com', 'https://example.com/a b']) assert.equal(validateMemoryLink(value), null);
});
test('admin submits validated value and distinguishes email failure', () => {
  const source = fs.readFileSync(require.resolve('../js/admin.js'), 'utf8');
  assert.match(source, /body: \{ memoryLink \}/);
  assert.match(source, /result\.memoryUrl !== memoryLink/);
  assert.match(source, /result\.emailDelivered \? "success" : "error"/);
  const html = fs.readFileSync(require.resolve('../admin/orders.html'), 'utf8');
  const input = html.match(/<input[^>]*id="memory-link-input"[^>]*>/);
  assert.ok(input); assert.ok(!input[0].includes('pattern='));
});
