(() => {
  'use strict';
  const measurementId = 'G-QQ72DZJ48B';
  const storageKey = 'solidtec-analytics-consent';
  const english = document.documentElement.lang === 'en';
  const words = english ? {
    title: 'Website analytics',
    text: 'With your permission, we use Google Analytics cookies to understand how this website is used. Google receives usage data. You can decline or change your choice at any time.',
    accept: 'Accept analytics', decline: 'Decline', settings: 'Cookie settings'
  } : {
    title: 'Statistik på hjemmesiden',
    text: 'Med din tilladelse bruger vi Google Analytics-cookies til at forstå, hvordan hjemmesiden bruges. Google modtager brugsdata. Du kan afvise eller ændre dit valg når som helst.',
    accept: 'Accepter statistik', decline: 'Afvis', settings: 'Cookieindstillinger'
  };
  let loaded = false;
  let choice;
  try { choice = localStorage.getItem(storageKey); } catch (_) {}
  function startAnalytics() {
    window['ga-disable-' + measurementId] = false;
    if (loaded) return;
    loaded = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', measurementId, { allow_google_signals: false, allow_ad_personalization_signals: false });
    const tag = document.createElement('script');
    tag.async = true;
    tag.src = 'https://www.googletagmanager.com/gtag/js?id=' + measurementId;
    document.head.appendChild(tag);
  }
  function stopAnalytics() {
    window['ga-disable-' + measurementId] = true;
    const hostParts = location.hostname.split('.');
    const domains = [''];
    for (let i = 0; i < hostParts.length - 1; i++) {
      const domain = hostParts.slice(i).join('.');
      domains.push(domain, '.' + domain);
    }
    document.cookie.split(';').forEach(entry => {
      const name = entry.split('=')[0].trim();
      if (name === '_ga' || name.startsWith('_ga_')) {
        domains.forEach(domain => {
          document.cookie = name + '=; Max-Age=0; Path=/' + (domain ? '; Domain=' + domain : '');
        });
      }
    });
  }
  const style = document.createElement('style');
  style.textContent = '.analytics-consent{position:fixed;bottom:16px;left:16px;right:16px;max-width:620px;margin:auto;padding:22px;background:#fff;color:#172c38;border:1px solid #c5ced3;box-shadow:0 4px 24px #0003;z-index:10000;font:16px/1.5 Arial,sans-serif}.analytics-consent[hidden]{display:none}.analytics-consent h2{font-size:20px;margin:0 0 8px}.analytics-consent p{margin:0 0 16px}.analytics-consent button{padding:10px 16px;margin:4px 8px 0 0;border:1px solid #172c38;border-radius:3px;background:#fff;color:#172c38;font:inherit;cursor:pointer}.analytics-consent button:focus-visible,.analytics-settings:focus-visible{outline:3px solid #d99000;outline-offset:3px}.analytics-settings{display:block;margin:14px auto;padding:8px 12px;background:#fff;color:#172c38;border:1px solid #c5ced3;border-radius:3px;font:14px Arial,sans-serif;cursor:pointer}';
  document.head.appendChild(style);
  const banner = document.createElement('section');
  banner.className = 'analytics-consent';
  banner.setAttribute('aria-label', words.title);
  const title = document.createElement('h2');
  title.textContent = words.title;
  const description = document.createElement('p');
  description.textContent = words.text;
  const accept = document.createElement('button');
  accept.type = 'button';
  accept.textContent = words.accept;
  const decline = document.createElement('button');
  decline.type = 'button';
  decline.textContent = words.decline;
  const settings = document.createElement('button');
  settings.className = 'analytics-settings';
  settings.type = 'button';
  settings.textContent = words.settings;
  function save(value) {
    choice = value;
    try { localStorage.setItem(storageKey, value); } catch (_) {}
    if (value === 'accepted') startAnalytics(); else stopAnalytics();
    banner.hidden = true;
    settings.focus();
  }
  accept.addEventListener('click', () => save('accepted'));
  decline.addEventListener('click', () => save('declined'));
  settings.addEventListener('click', () => { banner.hidden = false; accept.focus(); });
  banner.append(title, description, accept, decline);
  banner.hidden = choice === 'accepted' || choice === 'declined';
  document.body.append(banner);
  (document.querySelector('footer') || document.body).appendChild(settings);
  if (choice === 'accepted') startAnalytics();
})();
