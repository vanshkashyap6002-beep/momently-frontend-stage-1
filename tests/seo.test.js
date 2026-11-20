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
  const landingPages = ['updates', 'memory-studio'];
  const guides = ["about.html", "contact.html", "anniversary-memory-page", "proposal-page", "birthday-memory-page", "best-friend-memory-page"];
  for (const route of guides) {
    const url = "https://www.chermo.in/" + route;
    assert.ok(urls.includes(url));
    assert.ok(read(route.endsWith(".html") ? route : route + ".html").includes('rel="canonical" href="' + url + '"'));
  }
  assert.equal(urls.length, publicPages.length + landingPages.length + guides.length);
  assert.equal(new Set(urls).size, urls.length);
  for (const slug of landingPages) {
    const url = `https://www.chermo.in/${slug}/`;
    const html = read(`${slug}/index.html`);
    assert.ok(urls.includes(url));
    assert.ok(html.includes(`rel="canonical" href="${url}"`));
    assert.ok(!html.includes('noindex'));
  }
  for (const page of publicPages) {
    const html = read(page);
    const url = 'https://www.chermo.in/' + (page === 'index.html' ? '' : page.slice(0, -5));
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
    assert.match(read(page), /<meta name="robots" content="[^"]*noindex, nofollow/);
    assert.ok(!read('sitemap.xml').includes('/' + page));
    assert.ok(!read(page).includes('/js/analytics.js'));
  }
});
test('canonical redirect only matches apex and preserves memory rewrite', () => {
  const config = JSON.parse(read('vercel.json'));
  assert.equal(config.redirects[0].has[0].value, 'chermo.in');
  for (const rule of config.redirects.slice(1)) {
    assert.ok(fs.existsSync(path.join(root, rule.source)));
    assert.ok(!rule.destination.includes('.html'));
    if (!rule.destination.endsWith('/')) {
      assert.ok(config.rewrites.some(r => r.source === rule.destination && r.destination === rule.source));
    }
  }
  assert.deepEqual(config.rewrites.at(-1), { source: '/memory/:slug', destination: '/memory/memory.html' });
});
test('legal-page analytics requires consent and sanitizes URL without duplicate pageviews', () => {
  for (const page of publicPages.slice(2)) {
    const appended = [], handlers = {};
    const window = { CHERMO_GA4_MEASUREMENT_ID: 'G-TEST123' };
    const context = {
      window, location: { hostname: 'www.chermo.in', pathname: '/' + page.slice(0, -5), search: '?email=private', hash: '#private' },
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
    assert.equal(views[0][2].page_location, 'https://www.chermo.in/' + page.slice(0, -5));
    assert.equal(views[0][2].page_referrer, '');
    choose('denied'); assert.equal(window['ga-disable-G-TEST123'], true);
  }
});

function deploymentSources(dir = '') {
  const internal = new Set(['server', 'docs', 'tests', 'node_modules']);
  return fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap(entry => {
    if (entry.name.startsWith('.') || internal.has(entry.name)) return [];
    const name = path.join(dir, entry.name);
    if (entry.isDirectory()) return deploymentSources(name);
    return /\.(html|js|txt)$/i.test(name) ? [name] : [];
  });
}

test('public sources contain no editorial placeholders and every inline JSON-LD block parses', () => {
  for (const name of deploymentSources()) {
    const source = read(name);
    // GA measurement-ID validation uses an alphanumeric regex character class.
    const text = name.endsWith('.js') ? source.replaceAll('[A-Z0-9]', '') : source;
    assert.doesNotMatch(text, /\[[A-Z][A-Z0-9 _-]*\]/, name);
    if (name.endsWith('.html')) {
      for (const block of source.matchAll(/<script\b[^>]*\btype=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
        assert.doesNotThrow(() => JSON.parse(block[1]), name);
      }
    }
  }
});

test('six visible FAQ answers match structured data in reading order', () => {
  const home = read('index.html');
  const graph = JSON.parse(home.match(/<script id="homepage-schema"[^>]*>([\s\S]*?)<\/script>/)[1])['@graph'];
  const faq = graph.find(node => node['@type'] === 'FAQPage');
  const visible = [...home.matchAll(/<details class="faq-item"><summary>(.*?)<\/summary><p[^>]*>(.*?)<\/p><\/details>/gs)];
  assert.equal(visible.length, 6);
  assert.deepEqual(visible.map(m => [m[1], m[2]]), faq.mainEntity.map(q => [q.name, q.acceptedAnswer.text]));
});

test('all sitemap entries have the production origin and a modification date', () => {
  const entries = [...read('sitemap.xml').matchAll(/<url>([\s\S]*?)<\/url>/g)];
  assert.equal(entries.length, 14);
  for (const [, entry] of entries) {
    assert.equal(new URL(entry.match(/<loc>(.*?)<\/loc>/)[1]).origin, 'https://www.chermo.in');
    assert.match(entry, /<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/);
  }
});
