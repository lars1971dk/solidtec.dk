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
  if (!secret || secret.length < 12 || typeof header !== 'string' || header.length > 512) return false;
  const hash = value => createHash('sha256').update(value).digest();
  return timingSafeEqual(hash(header), hash('Bearer ' + secret));
}
export function countryCategory(headers, hosted = process.env.VERCEL === '1') {
  if (!hosted) return 'ZZ';
  const value = headers['x-vercel-ip-country'];
  return typeof value === 'string' && /^[A-Z]{2}$/.test(value) && !['XX','EU'].includes(value) ? value : 'ZZ';
}
export function deviceCategory(headers) {
  const ua = headers['user-agent'];
  if (typeof ua !== 'string' || !ua) return 'unknown';
  if (/ipad|tablet|kindle|silk|android(?!.*mobile)/i.test(ua)) return 'tablet';
  if (/mobile|iphone|ipod|windows phone/i.test(ua)) return 'mobile';
  if (/windows|macintosh|linux|cros/i.test(ua)) return 'desktop';
  return 'unknown';
}
export function parseView(path) {
  const match = /^views\/(\d{4}-\d{2}-\d{2})\/(solidtec|consults|preview)\/(da|en|home)\/(?:(\w{2})\/(desktop|mobile|tablet|unknown)\/)?[a-z0-9-]+\.json$/.exec(path);
  if (!match) return null;
  const [,day,site,page,country,device] = match;
  if (!validView(site,page) || (country && !/^[A-Z]{2}$/.test(country))) return null;
  return {day,site,page,country:country || 'ZZ',device:device || 'unknown',legacy:!country};
}
export function aggregate(paths, days, now = new Date()) {
  const range = dayRange(days, now);
  const previousRange = dayRange(days * 2, now).slice(0,days);
  const today = dayKey(now);
  const retentionStart = dayRange(90,now)[0];
  const currentDays = new Set(range);
  const previousDays = new Set(previousRange);
  const sites = Object.entries(SITES).map(([id,name]) => {
    const daily = Object.fromEntries(range.map(day=>[day,0]));
    const previousDaily = Object.fromEntries(previousRange.map(day=>[day,0]));
    const pages = Object.fromEntries(PAGES[id].map(page=>[page,0]));
    const countries = {};
    const devices = {desktop:0,mobile:0,tablet:0,unknown:0};
    let legacyViews=0,firstCountryDay=null,firstRecordedDay=null;
    for (const path of paths) {
      const view = parseView(path);
      if (!view || view.site !== id || view.day > today || view.day < retentionStart) continue;
      if (!firstRecordedDay || view.day < firstRecordedDay) firstRecordedDay=view.day;
      if (!view.legacy && (!firstCountryDay || view.day < firstCountryDay)) firstCountryDay=view.day;
      if (previousDays.has(view.day)) previousDaily[view.day]++;
      if (!currentDays.has(view.day)) continue;
      daily[view.day]++;
      pages[view.page]++;
      countries[view.country]=(countries[view.country]||0)+1;
      devices[view.device]++;
      if (view.legacy) legacyViews++;
    }
    const total = Object.values(daily).reduce((a,b)=>a+b,0);
    const previousTotal = Object.values(previousDaily).reduce((a,b)=>a+b,0);
    const complete = previousRange[0] >= retentionStart && !!firstRecordedDay && firstRecordedDay <= previousRange[0];
    return {id,name,total,today:daily[today],average:total/days,activeDays:Object.values(daily).filter(n=>n>0).length,
      daily:range.map(day=>({day,views:daily[day]})),pages:Object.entries(pages).map(([page,views])=>({page,views})),
      countries:Object.entries(countries).map(([code,views])=>({code,views})).sort((a,b)=>b.views-a.views||a.code.localeCompare(b.code)),
      devices:Object.entries(devices).map(([category,views])=>({category,views})),
      geography:{knownViews:total-(countries.ZZ||0),unknownViews:countries.ZZ||0,legacyViews,firstCountryDay},
      history:{firstRecordedDay},
      comparison:{total:previousTotal,complete,changePercent:complete && previousTotal>0 ? (total-previousTotal)/previousTotal*100 : null,
        daily:previousRange.map(day=>({day,views:previousDaily[day]}))}};
  });
  return {schemaVersion:2,days,timezone:'Europe/Copenhagen',today,generatedAt:now.toISOString(),sites};
}

