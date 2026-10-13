import test from 'node:test';
import assert from 'node:assert/strict';
import { aggregate, validView, optedOut, authorized, dayKey, dayRange, countryCategory, deviceCategory, parseView } from './lib/core.js';
test('Only approved public page categories are accepted',()=>{
  assert.equal(validView('solidtec','da'),true);
  assert.equal(validView('preview','home'),true);
  for(const [s,p] of [['preview','upload'],['preview','da'],['consults','email@example.dk'],['other','home']]) assert.equal(validView(s,p),false);
});
test('Reports contain only daily counters and correct site separation',()=>{
  const result=aggregate(['views/2026-10-12/solidtec/da/abc.json','views/2026-10-12/consults/en/def.json','views/2026-10-11/preview/home/ghi.json','views/2026-01-01/solidtec/da/old.json','views/2026-10-12/preview/upload/no.json'],7,new Date('2026-10-12T10:00:00Z'));
  assert.deepEqual(result.sites.map(s=>s.total),[1,1,1]);
  assert.equal(result.sites[0].daily.length,7);
  assert.equal(result.sites[0].pages[0].views,1);
  assert.equal(JSON.stringify(result).includes('abc'),false);
});
test('Copenhagen calendar dates include DST boundaries',()=>{
  assert.equal(dayKey(new Date('2026-10-11T22:30:00Z')),'2026-10-12');
  assert.deepEqual(dayRange(2,new Date('2026-10-25T12:00:00Z')),['2026-10-24','2026-10-25']);
});
test('Dashboard fails closed and respects opt-outs',()=>{
  const secret='a'.repeat(32);
  assert.equal(authorized('Bearer '+secret,secret),true);
  assert.equal(authorized('Bearer wrong',secret),false);
  assert.equal(authorized(undefined,secret),false);
  assert.equal(authorized('Bearer ',undefined),false);
  assert.equal(optedOut({dnt:'1'}),true);
  assert.equal(optedOut({'sec-gpc':'1'}),true);
});

test('Countries are coarse server-side categories and never taken from query strings',()=>{
  assert.equal(countryCategory({'x-vercel-ip-country':'DK'},true),'DK');
  for(const bad of ['dk','USA','DK/private','<x>',['DK'],'XX','EU',undefined]) assert.equal(countryCategory({'x-vercel-ip-country':bad},true),'ZZ');
  assert.equal(countryCategory({'x-vercel-ip-country':'DK'},false),'ZZ');
  assert.equal(deviceCategory({'user-agent':'Mozilla Windows NT Chrome'}),'desktop');
  assert.equal(deviceCategory({'user-agent':'Mozilla iPhone Mobile Safari'}),'mobile');
  assert.equal(deviceCategory({'user-agent':'Mozilla iPad Mobile Safari'}),'tablet');
  assert.equal(deviceCategory({}),'unknown');
});
test('Mixed historic and enriched entries preserve totals and isolate sites',()=>{
  const result=aggregate([
    'views/2026-10-12/solidtec/da/old.json',
    'views/2026-10-13/solidtec/en/DK/mobile/new.json',
    'views/2026-10-13/solidtec/da/DE/desktop/new2.json',
    'views/2026-10-13/consults/da/US/tablet/other.json',
    'views/2026-10-13/solidtec/da/ZZ/unknown/unknown.json',
    'views/2026-10-13/solidtec/da/private/path/no.json',
    'views/2026-10-15/solidtec/da/DK/desktop/future.json'
  ],7,new Date('2026-10-13T12:00:00Z'));
  const site=result.sites[0];
  assert.equal(site.total,4);
  assert.equal(site.today,3);
  assert.equal(site.geography.knownViews,2);
  assert.equal(site.geography.unknownViews,2);
  assert.equal(site.geography.legacyViews,1);
  assert.equal(site.geography.firstCountryDay,'2026-10-13');
  assert.equal(site.devices.find(d=>d.category==='mobile').views,1);
  assert.equal(site.countries.reduce((a,c)=>a+c.views,0),site.total);
  assert.equal(result.sites[1].total,1);
  assert.equal(site.comparison.changePercent,null);
  assert.equal(parseView('views/2026-10-13/solidtec/da/dk/mobile/no.json'),null);
});
test('Previous period trends are only reported with sufficient retained history',()=>{
  const paths=['views/2026-09-30/solidtec/da/one.json','views/2026-10-02/solidtec/da/two.json','views/2026-10-07/solidtec/da/three.json'];
  const site=aggregate(paths,7,new Date('2026-10-13T12:00:00Z')).sites[0];
  assert.equal(site.comparison.complete,true);
  assert.equal(site.comparison.total,2);
  assert.equal(site.total,1);
  assert.equal(site.comparison.changePercent,-50);
  const ninety=aggregate(paths,90,new Date('2026-10-13T12:00:00Z')).sites[0];
  assert.equal(ninety.comparison.complete,false);
  assert.equal(ninety.comparison.changePercent,null);
});

