import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {issueToken,validToken,dashboardAuthorized} from './lib/dashboard-auth.js';
import {createHandler} from './api/login.js';
import {reset} from './test-fixtures/blob.js';
const source=readFileSync(new URL('./lib/dashboard-auth.js',import.meta.url),'utf8').replace("'@vercel/blob'",JSON.stringify(new URL('./test-fixtures/blob.js',import.meta.url).href)).replace("'./core.js'",JSON.stringify(new URL('./lib/core.js',import.meta.url).href));
const {reserveLogin,saveLink,consumeLink}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const secret='test-only-signing-secret-not-production';
const response=()=>({code:0,body:null,setHeader(){},status(code){this.code=code;return this;},json(body){this.body=body;return this;},end(){return this;}});
const headers={origin:'https://solidtec.dk','content-type':'application/json'};
test('Links and sessions have separate purposes and expire',()=>{
 const now=Date.now(),link=issueToken('link',secret,now),session=issueToken('session',secret,now);
 assert.equal(validToken(link,'link',secret,now),true);
 assert.equal(validToken(link,'session',secret,now),false);
 assert.equal(validToken(link,'link',secret,now+901000),false);
 assert.equal(validToken(session,'session',secret,now+3601000),false);
 assert.equal(validToken(link+'x','link',secret,now),false);
 assert.equal(validToken(link,'link','wrong-secret-at-least-12',now),false);
 assert.equal(dashboardAuthorized('Bearer '+session,secret),true);
});
test('Mail readiness disables legacy password authorization',()=>{
 const old={...process.env};Object.assign(process.env,{DASHBOARD_SMTP_HOST:'mail.test',DASHBOARD_SMTP_USER:'lt@solidtec.dk',DASHBOARD_SMTP_PASSWORD:'test',DASHBOARD_ACCESS_KEY:secret});
 assert.equal(dashboardAuthorized('Bearer '+secret,secret),false);
 for(const name of Object.keys(process.env))if(!(name in old))delete process.env[name];Object.assign(process.env,old);
});
test('Links redeem only once, including concurrent requests; requests are rate limited',async()=>{
 reset();const token=issueToken('link',secret);await saveLink(token);
 const result=await Promise.all([consumeLink(token),consumeLink(token)]);assert.equal(result.filter(Boolean).length,1);
 assert.equal(await consumeLink(token),false);
 assert.equal(await reserveLogin(),true);assert.equal(await reserveLogin(),true);assert.equal(await reserveLogin(),false);
});
test('Only the owner and approved origin can request mail; storage failure sends nothing',async()=>{
 let sent=0;const handler=createHandler({ready:()=>true,owner:()=> 'lt@solidtec.dk',secret:()=>secret,reserve:async()=>true,save:async()=>{},send:async()=>sent++});
 for(const request of [{method:'POST',headers:{...headers,origin:'https://preview.solidtec.dk'},body:{action:'request',email:'lt@solidtec.dk'}},{method:'POST',headers,body:{action:'request',email:'someone@example.com'}}]){const res=response();await handler(request,res);assert.equal(res.code,403);}
 assert.equal(sent,0);const res=response();await handler({method:'POST',headers,body:{action:'request',email:'lt@solidtec.dk'}},res);assert.equal(res.code,200);assert.equal(sent,1);
 const broken=createHandler({ready:()=>true,owner:()=> 'lt@solidtec.dk',secret:()=>secret,reserve:async()=>{throw Error()},send:async()=>sent++});
 const failure=response();await broken({method:'POST',headers,body:{action:'request',email:'lt@solidtec.dk'}},failure);assert.equal(failure.code,503);assert.equal(sent,1);
});
test('Redeeming invalid links does not touch storage',async()=>{
 let calls=0;const handler=createHandler({secret:()=>secret,consume:async()=>{calls++;return true}}),res=response();
 await handler({method:'POST',headers,body:{action:'redeem',token:'bad'}},res);assert.equal(res.code,401);assert.equal(calls,0);
});
