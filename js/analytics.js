/* Public-page analytics only. No customer content or URL parameters are collected. */
(() => {
  'use strict';
  const pages = ['/', '/index.html', '/templates.html', '/privacy-policy.html', '/terms.html', '/refund-policy.html', '/cookie-policy.html'];
  const id = window.CHERMO_GA4_MEASUREMENT_ID;
  if (!['chermo.in', 'www.chermo.in'].includes(location.hostname) || !pages.includes(location.pathname) || !/^G-[A-Z0-9]+$/.test(id || '')) return;
  const key = 'chermo-analytics-consent';
  let active = false;
  let started = false;
  const read = () => { try { return localStorage.getItem(key); } catch { return null; } };
  function start() {
    active = true;
    window['ga-disable-' + id] = false;
    if (started) return;
    started = true;
    window.dataLayer = window.dataLayer || [];
    const gtag = function () { window.dataLayer.push(arguments); };
    window.gtag = gtag;
    const safeUrl = 'https://www.chermo.in' + (location.pathname === '/index.html' ? '/' : location.pathname);
    gtag('js', new Date());
    gtag('config', id, { send_page_view: false, page_location: safeUrl, page_referrer: '', allow_google_signals: false, allow_ad_personalization_signals: false });
    gtag('event', 'page_view', { page_location: safeUrl, page_referrer: '', page_title: document.title });
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(id);
    document.head.appendChild(script);
  }
  const panel = document.createElement('aside');
  panel.setAttribute('aria-label', 'Analytics preferences');
  panel.className = 'container';
  panel.innerHTML = '<p>Allow optional Google Analytics to measure public page visits and template interactions? <a href="/cookie-policy.html">Cookie policy</a></p><button type="button" class="btn btn-outline btn-sm" data-choice="denied">Reject analytics</button> <button type="button" class="btn btn-primary btn-sm" data-choice="granted">Allow analytics</button>';
  document.body.appendChild(panel);
  const settings = document.createElement('button');
  settings.type = 'button'; settings.className = 'btn btn-ghost btn-sm'; settings.textContent = 'Analytics preferences';
  settings.onclick = () => { panel.hidden = false; panel.querySelector('button').focus(); };
  document.body.appendChild(settings);
  panel.addEventListener('click', e => {
    const choice = e.target.closest('[data-choice]')?.dataset.choice;
    if (!choice) return;
    try { localStorage.setItem(key, choice); } catch { /* Consent lasts this page only. */ }
    if (choice === 'granted') start();
    else { active = false; window['ga-disable-' + id] = true; }
    panel.hidden = true;
  });
  panel.hidden = ['granted', 'denied'].includes(read());
  if (read() === 'granted') start();
  document.addEventListener('click', e => {
    if (!active) return;
    // Only fixed event names: never include template titles, URLs, search text or form values.
    if (e.target.closest('[data-use-template]')) window.gtag('event', 'select_item');
    else if (e.target.closest('[data-preview-template]')) window.gtag('event', 'view_item');
  });
})();
