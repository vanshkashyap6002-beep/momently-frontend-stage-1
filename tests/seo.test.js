const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const publicPages = ['index.html', 'templates.html', 'privacy-policy.html', 'terms.html', 'refund-policy.html', 'cookie-policy.html'];
test('public metadata and sitemap agree on www host and existing pages', () => {
  const urls = [...read('sitemap.xml').matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1]);
  assert.equal(new Set(urls).size, publicPages.length);
  for (const page of publicPages) {
    const html = read(page);
    const url = 'https://www.chermo.in/' + (page === 'index.html' ? '' : page);
    assert.ok(urls.includes(url));
    assert.ok(html.includes(`rel="canonical" href="${url}"`));
    assert.ok(html.includes(`property="og:url" content="${url}"`));
    assert.ok(!html.includes('noindex'));
    assert.equal((html.match(/src="\/js\/analytics-config.js"/g) || []).length, 1);
    assert.equal((html.match(/src="\/js\/analytics.js"/g) || []).length, 1);
    assert.ok(!html.includes('googletagmanager.com'));
    assert.equal((html.match(/<script\b/g) || []).length, (html.match(/<\/script>/g) || []).length);
    for (const match of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
      JSON.parse(match[1]);
      assert.ok(!match[1].includes('https://chermo.in/'));
    }
  }
  assert.ok(read('robots.txt').includes('Sitemap: https://www.chermo.in/sitemap.xml'));
});
test('private and admin pages remain noindex and outside sitemap and analytics', () => {
  const pages = ['login.html', 'signup.html', 'profile.html', 'create-memory.html', 'payment.html', 'success.html', 'memory/memory.html', ...fs.readdirSync(path.join(root, 'admin')).filter(n => n.endsWith('.html')).map(n => 'admin/' + n)];
  for (const page of pages) {
    assert.match(read(page), /<meta name="robots" content="[^"]*noindex/);
    assert.ok(!read('sitemap.xml').includes('/' + page));
    assert.ok(!read(page).includes('/js/analytics.js'));
  }
});
test('canonical redirect only matches apex and preserves memory rewrite', () => {
  const config = JSON.parse(read('vercel.json'));
  assert.deepEqual(config.redirects, [{ source: '/:path*', has: [{ type: 'host', value: 'chermo.in' }], destination: 'https://www.chermo.in/:path*', permanent: true }]);
  assert.deepEqual(config.rewrites, [{ source: '/memory/:slug', destination: '/memory/memory.html' }]);
});
test('legal-page analytics requires consent and sanitizes URL without duplicate pageviews', () => {
  for (const page of publicPages.slice(2)) {
    const appended = [], handlers = {};
    const window = { CHERMO_GA4_MEASUREMENT_ID: 'G-TEST123' };
    const context = {
      window, location: { hostname: 'www.chermo.in', pathname: '/' + page, search: '?email=private', hash: '#private' },
      localStorage: { getItem: () => null, setItem: () => {} },
      document: { title: 'Policy', head: { appendChild: s => appended.push(s) },
        body: { appendChild: () => {} }, addEventListener: () => {},
        createElement: () => ({ setAttribute: () => {}, addEventListener: (name, fn) => { handlers[name] = fn; } }) }
    };
    vm.runInNewContext(read('js/analytics.js'), context);
    assert.equal(appended.length, 0);
    const choose = value => handlers.click({ target: { closest: () => ({ dataset: { choice: value } }) } });
    choose('denied'); assert.equal(appended.length, 0);
    choose('granted'); choose('granted');
    assert.equal(appended.length, 1);
    const views = window.dataLayer.filter(args => args[0] === 'event' && args[1] === 'page_view');
    assert.equal(views.length, 1);
    assert.equal(views[0][2].page_location, 'https://www.chermo.in/' + page);
    assert.equal(views[0][2].page_referrer, '');
    choose('denied'); assert.equal(window['ga-disable-G-TEST123'], true);
  }
});
