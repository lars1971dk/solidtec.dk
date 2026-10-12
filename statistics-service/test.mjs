import test from 'node:test';
import assert from 'node:assert/strict';
import { aggregate, validView, optedOut, authorized, dayKey, dayRange } from './lib/core.js';
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
