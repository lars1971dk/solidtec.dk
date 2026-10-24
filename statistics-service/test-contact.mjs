import test from 'node:test';
import assert from 'node:assert/strict';
import {createHandler} from './api/contact.js';
import {makeContactMessage,makeCustomerCopy,makeContactCopy,contactSmtpSettings,contactEmailHtml} from './lib/contact-mail.js';
function mock(body,options={}){
 const response={statusCode:200,headers:{},data:null};
 response.setHeader=(k,v)=>{response.headers[k]=v;return response;};
 response.status=n=>{response.statusCode=n;return response;};
 response.json=value=>{response.data=value;return response;};
 response.end=()=>response;
 return {request:{
  method:options.method||'POST',
  headers:{origin:options.origin||'https://solidtec.dk','content-type':options.type||'application/json'},
  body
 },response};
}
const valid={firma:'ACME',navn:'Test Person',email:'test@example.com',tlf:'',emne:'Automation',besked:'We need a PLC adjustment',website:'',lang:'en'};
test('existing SOLIDTEC origin sends as SOLIDTEC',async()=>{
 let sent,siteReserved;
 const {request,response}=mock(valid);
 await createHandler({ready:()=>true,reserve:async site=>{siteReserved=site;return true;},send:async p=>{sent=p;}})(request,response);
 assert.equal(response.statusCode,200);
 assert.equal(sent.site,'solidtec');
 assert.equal(siteReserved,'solidtec');
 assert.equal(sent.email,'test@example.com');
});
test('CONSULTS origins send to CONSULTS and reserve separate quota',async()=>{
 for(const origin of ['https://consults.dk','https://www.consults.dk']){
  let sent,siteReserved;
  const {request,response}=mock({...valid,site:'solidtec',recipient:'victim@example.com'},{origin});
  await createHandler({ready:()=>true,reserve:async site=>{siteReserved=site;return true;},send:async p=>{sent=p;}})(request,response);
  assert.equal(response.statusCode,200);
  assert.equal(response.headers['Access-Control-Allow-Origin'],origin);
  assert.equal(sent.site,'consults');
  assert.equal(siteReserved,'consults');
  assert.equal(sent.recipient,undefined);
 }
});
test('recipient selected only by validated site',()=>{
 const env={DASHBOARD_SMTP_USER:'mailer@solidtec.dk',CONTACT_RECIPIENT_EMAIL:'owner@solidtec.dk'};
 const consults=makeContactMessage({...valid,site:'consults'},env);
 const solidtec=makeContactMessage({...valid,site:'solidtec'},env);
 assert.equal(consults.to,'info@consults.dk');
 assert.match(consults.subject,/^CONSULTS ·/);
 assert.equal(solidtec.to,'info@solidtec.dk');
 assert.match(solidtec.subject,/^SOLIDTEC:/);
 assert.throws(()=>makeContactMessage({...valid,site:'evil'},env));
});
test('rejects unknown origins and never sends',async()=>{
 let sent=false;const {request,response}=mock(valid,{origin:'https://evil.example'});
 await createHandler({ready:()=>true,reserve:async()=>true,send:async()=>{sent=true;}})(request,response);
 assert.equal(response.statusCode,403);assert.equal(sent,false);
});
test('rejects invalid fields',async()=>{
 const {request,response}=mock({...valid,email:'not-an-email'});
 await createHandler({ready:()=>true,reserve:async()=>true,send:async()=>{throw Error('Should not send');}})(request,response);
 assert.equal(response.statusCode,400);
});
test('rejects header injection',async()=>{
 const {request,response}=mock({...valid,emne:'Project\nBcc: suspicious@example.com'});
 await createHandler({ready:()=>true,reserve:async()=>true,send:async()=>{throw Error('Should not send');}})(request,response);
 assert.equal(response.statusCode,400);
});
test('honeypot skips delivery',async()=>{
 let sent=false;const {request,response}=mock({...valid,website:'spam.example'});
 await createHandler({ready:()=>true,reserve:async()=>true,send:async()=>{sent=true;}})(request,response);
 assert.equal(response.statusCode,200);assert.equal(sent,false);
});
test('limit returns 429 without sending',async()=>{
 const {request,response}=mock(valid);
 await createHandler({ready:()=>true,reserve:async()=>false,send:async()=>{throw Error('Should not send');}})(request,response);
 assert.equal(response.statusCode,429);
});
test('SMTP unconfigured returns 503',async()=>{
 const {request,response}=mock(valid);
 await createHandler({ready:()=>false,reserve:async()=>true,send:async()=>{throw Error('Should not send');}})(request,response);
 assert.equal(response.statusCode,503);
});
test('options preflight for CONSULTS does not send',async()=>{
 const {request,response}=mock(null,{origin:'https://consults.dk',method:'OPTIONS'});
 await createHandler({ready:()=>true,reserve:async()=>true,send:async()=>{throw Error('Should not send');}})(request,response);
 assert.equal(response.statusCode,204);
});


test('both brands keep separate authenticated senders',()=>{
 const env={DASHBOARD_SMTP_USER:'lt@solidtec.dk',DASHBOARD_SMTP_HOST:'send.one.com',CONSULTS_SMTP_PASSWORD:'fixture'};
 const solid=makeContactMessage({...valid,site:'solidtec'},env);
 const consult=makeContactMessage({...valid,site:'consults'},env);
 assert.equal(solid.to,'info@solidtec.dk');
 assert.equal(solid.from.address,'lt@solidtec.dk');
 assert.equal(consult.to,'info@consults.dk');
 assert.equal(consult.from.address,'info@consults.dk');
 assert.equal(contactSmtpSettings('consults',env).user,'info@consults.dk');
});
test('SOLIDTEC keeps its existing customer copy',()=>{
 const env={DASHBOARD_SMTP_USER:'lt@solidtec.dk'};
 const c=makeCustomerCopy({...valid,site:'solidtec',copy:true},env);
 assert.equal(c.to,'test@example.com');
 assert.equal(c.from.address,'lt@solidtec.dk');
 assert.equal(makeCustomerCopy({...valid,site:'solidtec',copy:false},env),null);
});
test('CONSULTS opt-in is required and never affects SOLIDTEC',async()=>{
 for(const site of ['consults','solidtec']){
  let payload;
  const origin='https://'+site+'.dk';
  const {request,response}=mock({...valid,copy:true,copyToSender:true},{origin});
  await createHandler({ready:()=>true,reserve:async()=>true,send:async p=>{payload=p;return {copySent:true};}})(request,response);
  assert.equal(response.statusCode,200);
  assert.equal(payload.copy,site==='solidtec');
  assert.equal(payload.copyToSender,site==='consults');
  assert.equal(response.data.copySent,true);
 }
});
test('CONSULTS partial copy failure is reported without failing owner delivery',async()=>{
 const {request,response}=mock({...valid,copyToSender:true},{origin:'https://consults.dk'});
 await createHandler({ready:()=>true,reserve:async()=>true,send:async()=>({copySent:false})})(request,response);
 assert.deepEqual(response.data,{ok:true,copyRequested:true,copySent:false});
});
test('CONSULTS customer copy uses a separate email and Reply-To',()=>{
 const env={DASHBOARD_SMTP_USER:'lt@solidtec.dk',CONSULTS_SMTP_PASSWORD:'fixture'};
 const p={...valid,site:'consults'};
 const c=makeContactCopy(p,env);
 assert.equal(c.to,'test@example.com');
 assert.equal(c.from.address,'info@consults.dk');
 assert.equal(c.replyTo,'info@consults.dk');
});
test('HTML escapes untrusted content in CONSULTS email',()=>{
 const p={...valid,site:'consults',firma:'A&B <script>bad</script>',besked:'Line one\n<script>alert(1)</script>'};
 const html=contactEmailHtml(p);
 assert.match(html,/A&amp;B &lt;script&gt;/);
 assert.match(html,/Line one<br>&lt;script&gt;/);
 assert.doesNotMatch(html,/<script>alert\(1\)<\/script>/);
});
