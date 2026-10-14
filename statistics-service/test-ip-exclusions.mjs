import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeRules, normalizeRule, clientAddress, matchesRules, shouldExclude } from './lib/ip-exclusions.js';
import { createHandler as viewHandler } from './api/view.js';
import { createHandler as settingsHandler } from './api/settings.js';
import { readFileSync } from 'node:fs';
import { reset, observed } from './test-fixtures/blob.js';
const settingsSource=readFileSync(new URL('./lib/settings-store.js',import.meta.url),'utf8')
  .replace("'@vercel/blob'",JSON.stringify(new URL('./test-fixtures/blob.js',import.meta.url).href))
  .replace("'./ip-exclusions.js'",JSON.stringify(new URL('./lib/ip-exclusions.js',import.meta.url).href));
const {readSettings,saveSettings}=await import('data:text/javascript;base64,'+Buffer.from(settingsSource).toString('base64'));
function response(){return {code:0,headers:{},body:null,setHeader(key,value){this.headers[key]=value;},status(code){this.code=code;return this;},json(body){this.body=body;return this;},end(){return this;},send(body){this.body=body;return this;}};}
test('Exact IPv4, IPv6, mapped IPv4 and intentional networks match accurately',()=>{
assert.equal(normalizeRule('2001:0db8:0:0:0:0:0:1').value,'2001:db8::1');
assert.deepEqual(normalizeRules(['192.0.2.1',' 192.0.2.1 ']),['192.0.2.1']);
assert.equal(matchesRules('192.0.2.1',['192.0.2.1']),true);
assert.equal(matchesRules('192.0.2.10',['192.0.2.1']),false);
assert.equal(matchesRules('::ffff:192.0.2.1',['192.0.2.1']),true);
assert.equal(matchesRules('192.0.2.42',['192.0.2.0/24']),true);
assert.equal(matchesRules('192.0.3.42',['192.0.2.0/24']),false);
assert.equal(matchesRules('2001:db8::beef',['2001:db8::/64']),true);
assert.equal(matchesRules('2001:db9::beef',['2001:db8::/64']),false);
for(const bad of ['example.com','192.0.2.1:443','192.0.2.1/33','2001:db8::1/129','fe80::1%eth0','1.2.3','*'])assert.throws(()=>normalizeRule(bad));
assert.throws(()=>normalizeRules(Array(51).fill('192.0.2.1')));
});
test('Generic forwarded headers cannot cause exclusion on Vercel',async()=>{
assert.equal(clientAddress({headers:{'x-forwarded-for':'192.0.2.1'}},true),null);
assert.equal(clientAddress({headers:{'x-vercel-forwarded-for':'192.0.2.1, 10.0.0.1','x-forwarded-for':'198.51.100.1'}},true),'192.0.2.1');
assert.equal(await shouldExclude({headers:{'x-vercel-forwarded-for':'192.0.2.1'}},async()=>({rules:['192.0.2.1']}),true),true);
});
test('Excluded requests return the pixel without a count on every site',async()=>{
let writes=0;
const handler=viewHandler({write:async()=>writes++,settings:async()=>({rules:['192.0.2.1']}),exclude:(req,read)=>shouldExclude(req,read,true)});
for(const [site,page]of [['solidtec','da'],['consults','en']]){
const res=response();await handler({method:'GET',query:{site,page},headers:{'x-vercel-forwarded-for':'192.0.2.1'}},res);assert.equal(res.code,200);assert.equal(res.headers['X-Solidtec-Statistics'],'excluded');
}
assert.equal(writes,0);
const res=response();await handler({method:'GET',query:{site:'solidtec',page:'da'},headers:{'x-vercel-forwarded-for':'192.0.2.2'}},res);assert.equal(writes,1);assert.equal(res.headers['X-Solidtec-Statistics'],'counted');
});
test('Settings outages skip counts without blocking page images',async()=>{
let writes=0;const handler=viewHandler({write:async()=>writes++,settings:async()=>{throw new Error('offline')},exclude:shouldExclude});
const res=response();await handler({method:'GET',query:{site:'solidtec',page:'da'},headers:{}},res);assert.equal(res.code,200);assert.equal(writes,0);assert.equal(res.headers['X-Solidtec-Statistics'],'unavailable');
});
test('Private settings require origin and login, reject invalid rules, and preserve version',async()=>{
let reads=0,writes=0;const key='test-owner-secret-not-production';
const handler=settingsHandler({secret:()=>key,address:()=> '192.0.2.1',read:async()=>{reads++;return{rules:[],version:null}},save:async(rules,version)=>{writes++;assert.equal(version,null);return{rules,version:'version1'}}});
for(const headers of [{origin:'https://other.invalid',authorization:'Bearer '+key},{origin:'https://solidtec.dk'},{origin:'https://solidtec.dk',authorization:'Bearer wrong'}]){
const res=response();await handler({method:'GET',headers},res);assert.ok([401,403].includes(res.code));
}
assert.equal(reads,0);assert.equal(writes,0);
const headers={origin:'https://solidtec.dk',authorization:'Bearer '+key,'content-type':'application/json'};
const readRes=response();await handler({method:'GET',headers},readRes);assert.equal(readRes.body.currentIP,'192.0.2.1');
const invalid=response();await handler({method:'PUT',headers,body:{rules:['invalid'],version:null}},invalid);assert.equal(invalid.code,400);assert.equal(writes,0);
const saved=response();await handler({method:'PUT',headers,body:{rules:['192.0.2.1'],version:null}},saved);assert.equal(saved.code,200);assert.equal(writes,1);
});
test('Saved exclusions use uncached private reads and optimistic concurrency',async()=>{
reset();assert.deepEqual(await readSettings(),{rules:[],version:null});
const initial=await saveSettings(['192.0.2.1'],null);assert.ok(initial.version);assert.equal(observed.put.access,'private');
assert.deepEqual((await readSettings()).rules,['192.0.2.1']);assert.equal(observed.get.useCache,false);
await assert.rejects(saveSettings([],null),error=>error.status===409);
const second=await saveSettings([],initial.version);assert.deepEqual(second.rules,[]);
assert.equal(observed.put.ifMatch,initial.version);
});
