import { createHash, timingSafeEqual } from 'node:crypto';

export const SITES = { solidtec: 'solidtec.dk', consults: 'consults.dk', preview: 'preview.solidtec.dk' };
export const PAGES = { solidtec: ['da', 'en'], consults: ['da', 'en'], preview: ['home'] };
export const ORIGINS = new Set(['https://solidtec.dk', 'https://www.solidtec.dk']);
export function validView(site, page) { return !!PAGES[site]?.includes(page); }
export function optedOut(headers) { return headers.dnt === '1' || headers['sec-gpc'] === '1'; }
export function bot(headers) { return /bot|crawler|spider|headless|preview|facebookexternalhit/i.test(headers['user-agent'] || ''); }
export function dayKey(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Copenhagen', year:'numeric',month:'2-digit',day:'2-digit' }).format(date);
}
export function dayRange(days, now = new Date()) {
  const today = dayKey(now);
  const noon = new Date(today + 'T12:00:00Z');
  return Array.from({length: days}, (_, i) => {
    const date = new Date(noon);
    date.setUTCDate(date.getUTCDate() - days + 1 + i);
    return date.toISOString().slice(0,10);
  });
}
export function authorized(header, secret) {
  if (!secret || secret.length < 24 || typeof header !== 'string' || header.length > 512) return false;
  const hash = value => createHash('sha256').update(value).digest();
  return timingSafeEqual(hash(header), hash('Bearer ' + secret));
}
export function aggregate(paths, days, now = new Date()) {
  const range = dayRange(days, now);
  const included = new Set(range);
  const series = Object.fromEntries(Object.keys(SITES).map(site => [site, Object.fromEntries(range.map(day => [day,0]))]));
  const pages = Object.fromEntries(Object.keys(SITES).map(site => [site, Object.fromEntries(PAGES[site].map(page => [page,0]))]));
  for (const path of paths) {
    const match = /^views\/(\d{4}-\d{2}-\d{2})\/(solidtec|consults|preview)\/(da|en|home)\/[a-z0-9-]+\.json$/.exec(path);
    if (!match) continue;
    const [,day,site,page] = match;
    if (!included.has(day) || !validView(site,page)) continue;
    series[site][day]++;
    pages[site][page]++;
  }
  return { days, timezone:'Europe/Copenhagen', generatedAt:now.toISOString(),
    sites:Object.entries(SITES).map(([id,name]) => ({ id, name, total:Object.values(series[id]).reduce((a,b)=>a+b,0),
      daily:range.map(day=>({day,views:series[id][day]})), pages:Object.entries(pages[id]).map(([page,views])=>({page,views})) })) };
}
