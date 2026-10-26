import test from 'node:test';
import assert from 'node:assert/strict';
import nodemailer from 'nodemailer';
import {sendContact,contactSmtpSettings,makeContactMessage,makeContactCopy} from '../lib/contact-mail.js';
import {createHandler} from '../api/contact.js';
const payload={site:'consults',firma:'Test ApS',navn:'Test',email:'visitor@example.test',besked:'A valid test enquiry',lang:'da',copyToSender:true};
const config={DASHBOARD_SMTP_HOST:'smtp.example.test',DASHBOARD_SMTP_USER:'solidtec@example.test',DASHBOARD_SMTP_PASSWORD:'test-only',CONSULTS_SMTP_PASSWORD:'test-only'};
test('dedicated CONSULTS identity, TLS settings and Reply-To are isolated',()=>{
 const smtp=contactSmtpSettings('consults',config);
 assert.equal(smtp.user,'info@consults.dk');assert.equal(smtp.port,465);
 assert.equal(makeContactMessage(payload,config).replyTo.address,payload.email);
 assert.equal(makeContactCopy(payload,config).replyTo,'info@consults.dk');
 assert.throws(()=>contactSmtpSettings('consults',{...config,CONSULTS_SMTP_USER:'wrong@example.test'}));
});
test('transport delivery order, opt-in, partial success and owner failure',async t=>{
 const old={};for(const [k,v] of Object.entries(config)){old[k]=process.env[k];process.env[k]=v;}
 const calls=[];let failAt=0;
 const stub=t.mock.method(nodemailer,'createTransport',()=>({async sendMail(m){calls.push(m);if(calls.length===failAt)throw Error('Simulated SMTP rejection');return {accepted:[m.to]};}}));
 try{
  assert.deepEqual(await sendContact(payload),{copySent:true});
  assert.deepEqual(calls.map(x=>x.to),['info@consults.dk',payload.email]);
  calls.length=0;assert.deepEqual(await sendContact({...payload,copyToSender:false}),{copySent:false});assert.equal(calls.length,1);
  calls.length=0;failAt=2;
  const res={setHeader(){},status(n){this.code=n;return this},json(v){this.body=v;return this}};
  await createHandler({ready:()=>true,reserve:async()=>true})({method:'POST',headers:{origin:'https://consults.dk','content-type':'application/json'},body:payload},res);
  assert.equal(res.code,200);assert.deepEqual(res.body,{ok:true,copyRequested:true,copySent:false});assert.equal(calls.length,2);
  calls.length=0;failAt=1;await assert.rejects(sendContact(payload));assert.equal(calls.length,1);
  calls.length=0;failAt=0;delete process.env.CONSULTS_SMTP_PASSWORD;
  assert.deepEqual(await sendContact(payload),{copySent:false});assert.equal(calls.length,1);assert.equal(calls[0].from,config.DASHBOARD_SMTP_USER);
 }finally{stub.mock.restore();for(const [k,v]of Object.entries(old)){if(v===undefined)delete process.env[k];else process.env[k]=v;}}
});
