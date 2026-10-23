import test from 'node:test';
import assert from 'node:assert/strict';
import {createHandler} from './api/contact.js';
function mock(body,options={}){
 const response={statusCode:200,headers:{},data:null};
 response.setHeader=(k,v)=>{response.headers[k]=v;return response;};
 response.status=n=>{response.statusCode=n;return response;};
 response.json=value=>{response.data=value;return response;};
 response.end=()=>response;
 return {request:{method:options.method||'POST',headers:{origin:options.origin||'https://solidtec.dk','content-type':options.type||'application/json'},body},response};
}
const valid={firma:'ACME',navn:'Test Person',email:'test@example.com',tlf:'',emne:'Automation',besked:'We need a PLC adjustment',website:'',lang:'en'};
test('valid contact sends and returns success',async()=>{let sent;const {request,response}=mock(valid);await createHandler({ready:()=>true,reserve:async()=>true,send:async v=>{sent=v;}})(request,response);assert.equal(response.statusCode,200);assert.equal(sent.email,'test@example.com');});
test('rejects unknown origins and never sends',async()=>{let sent=false;const {request,response}=mock(valid,{origin:'https://evil.example'});await createHandler({ready:()=>true,reserve:async()=>true,send:async()=>{sent=true;}})(request,response);assert.equal(response.statusCode,403);assert.equal(sent,false);});
test('rejects invalid fields',async()=>{const {request,response}=mock({...valid,email:'not-an-email'});await createHandler({ready:()=>true,reserve:async()=>true,send:async()=>{throw Error('Should not send');}})(request,response);assert.equal(response.statusCode,400);});
test('honeypot skips delivery',async()=>{let sent=false;const {request,response}=mock({...valid,website:'spam.example'});await createHandler({ready:()=>true,reserve:async()=>true,send:async()=>{sent=true;}})(request,response);assert.equal(response.statusCode,200);assert.equal(sent,false);});
test('limit returns 429 without sending',async()=>{const {request,response}=mock(valid);await createHandler({ready:()=>true,reserve:async()=>false,send:async()=>{throw Error('Should not send');}})(request,response);assert.equal(response.statusCode,429);});
test('SMTP unconfigured returns 503',async()=>{const {request,response}=mock(valid);await createHandler({ready:()=>false,reserve:async()=>true,send:async()=>{throw Error('Should not send');}})(request,response);assert.equal(response.statusCode,503);});
test('options preflight does not send',async()=>{const {request,response}=mock(null,{method:'OPTIONS'});await createHandler({ready:()=>true,reserve:async()=>true,send:async()=>{throw Error('Should not send');}})(request,response);assert.equal(response.statusCode,204);});
