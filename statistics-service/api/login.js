import { ORIGINS } from '../lib/core.js';
import { ownerEmail,mailReady,issueToken,validToken,reserveLogin,saveLink,consumeLink } from '../lib/dashboard-auth.js';
import { sendLogin } from '../lib/dashboard-mail.js';
export function createHandler({ready=mailReady,owner=ownerEmail,secret=()=>process.env.DASHBOARD_ACCESS_KEY,reserve=reserveLogin,save=saveLink,consume=consumeLink,send=sendLogin}={}) {
 return async (req,res)=>{
  res.setHeader('Cache-Control','private, no-store');res.setHeader('Vary','Origin');res.setHeader('X-Content-Type-Options','nosniff');
  const origin=req.headers.origin;if(!ORIGINS.has(origin))return res.status(403).end();
  res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Access-Control-Allow-Headers','Content-Type');res.setHeader('Access-Control-Allow-Methods','GET, POST, OPTIONS');
  if(req.method==='OPTIONS')return res.status(204).end();
  if(req.method==='GET')return res.status(200).json({ready:ready(),email:owner()});
  if(req.method!=='POST')return res.status(405).end();
  if(!String(req.headers['content-type']||'').startsWith('application/json'))return res.status(415).end();
  let body=req.body;try{if(typeof body==='string')body=JSON.parse(body);if(!body||Buffer.byteLength(JSON.stringify(body))>2048)throw Error();}catch{return res.status(400).end();}
  try {
   if(body.action==='redeem') {
    if(!validToken(body.token,'link',secret())||!await consume(body.token))return res.status(401).json({error:'Linket er ugyldigt, udløbet eller allerede brugt. Bed om et nyt.'});
    return res.status(200).json({token:issueToken('session',secret())});
   }
   if(body.action!=='request')return res.status(400).end();
   if(!ready())return res.status(503).json({error:'Mail-login er ved at blive konfigureret.'});
   if(typeof body.email!=='string'||body.email.trim().toLowerCase()!==owner().toLowerCase())return res.status(403).json({error:'Brug den godkendte administratoradresse.'});
   if(!await reserve())return res.status(429).json({error:'Der kan højst bestilles to links pr. time. Tjek indbakken eller prøv senere.'});
   const token=issueToken('link',secret());await save(token);await send(token);
   return res.status(200).json({ok:true});
  }catch{return res.status(503).json({error:'Login er midlertidigt utilgængeligt. Prøv igen senere.'});}
 };
}
export default createHandler();
