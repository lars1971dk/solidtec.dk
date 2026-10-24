import test from 'node:test';
import assert from 'node:assert/strict';
import {makeContactMessage,makeCustomerCopy} from '../lib/contact-mail.js';
import {createHandler} from '../api/contact.js';
const cfg={DASHBOARD_SMTP_USER:'smtp@example.test',DASHBOARD_SMTP_PASSWORD:'dummy',DASHBOARD_SMTP_HOST:'smtp.example.test'};
const payload={site:'solidtec',lang:'da',firma:'Eksempel ApS',navn:'Anne Test',email:'anne@example.test',tlf:'',emne:'PLC',besked:'Beskrivelse med 10 tegn',copy:true};
test('SOLIDTEC recipient is controlled by server and HTML escapes input',()=>{
 const m=makeContactMessage({...payload,besked:'<img src=x onerror=alert(1)>'},cfg);
 assert.equal(m.to,'info@solidtec.dk');
 assert.equal(m.from.address,'smtp@example.test');
 assert.equal(m.replyTo.address,'anne@example.test');
 assert.match(m.html,/&lt;img/);
 assert.doesNotMatch(m.html,/<img src=x/);
});
test('customer copy is explicit and addressed only to validated user',()=>{
 assert.equal(makeCustomerCopy({...payload,copy:false},cfg),null);
 const c=makeCustomerCopy(payload,cfg);
 assert.equal(c.to,'anne@example.test');
 assert.equal(c.replyTo,'info@solidtec.dk');
 assert.match(c.subject,/Kopi/);
});
test('consults remains on its original inbox and has no customer copy',()=>{
 const p={...payload,site:'consults'};
 assert.equal(makeContactMessage(p,cfg).to,'info@consults.dk');
 assert.equal(makeCustomerCopy(p,cfg),null);
});
function mockRes(){return {statusCode:200,headers:{},setHeader(k,v){this.headers[k]=v;return this},status(v){this.statusCode=v;return this},json(v){this.body=v;return this},end(){return this}}}
test('API only opts into copy for solidtec and returns real delivery status',async()=>{
 const received=[];
 const handler=createHandler({ready:()=>true,reserve:async()=>true,send:async p=>{received.push(p);return {copySent:p.copy}}});
 const data={firma:payload.firma,navn:payload.navn,email:payload.email,besked:payload.besked,copy:true};
 for(const origin of ['https://solidtec.dk','https://consults.dk']){
  const res=mockRes();
  await handler({headers:{origin,'content-type':'application/json'},method:'POST',body:data},res);
  assert.equal(res.statusCode,200);
 }
 assert.equal(received[0].copy,true);
 assert.equal(received[1].copy,false);
});
