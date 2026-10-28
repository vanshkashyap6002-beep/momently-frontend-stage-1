const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const pages = ['', 'admin', 'memory'].flatMap(dir => fs.readdirSync(path.join(root, dir)).filter(f => f.endsWith('.html')).map(f => path.join(dir, f)));
test('all frontend scripts and inline scripts parse', () => {
  for (const name of fs.readdirSync(path.join(root, 'js')).filter(f => f.endsWith('.js'))) new vm.Script(fs.readFileSync(path.join(root, 'js', name), 'utf8'), { filename: name });
  for (const page of pages) {
    const html = fs.readFileSync(path.join(root, page), 'utf8');
    for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) if (!/type=["']application\/ld\+json/.test(match[1])) new vm.Script(match[2], { filename: page });
  }
});
test('static local HTML resources and navigation targets exist', () => {
  const missing = [];
  for (const page of pages) {
    const html = fs.readFileSync(path.join(root, page), 'utf8');
    for (const match of html.matchAll(/(?:href|src)=["']([^"']+)["']/g)) {
      const target = match[1].split(/[?#]/)[0];
      if (!target || /^(?:[a-z]+:|\/\/)/i.test(target) || target.includes('${')) continue;
      const local = target.startsWith('/') ? path.join(root, target) : path.resolve(root, path.dirname(page), target);
      if (!fs.existsSync(local)) missing.push(`${page}: ${target}`);
    }
  }
  assert.deepEqual(missing, []);
});
