import {contactReady,sendContact} from '../lib/contact-mail.js';
import {reserveContact} from '../lib/contact-limit.js';

// Kept separate from dashboard ORIGINS: contact submissions are accepted from
// both websites, while dashboard/login endpoints retain their original allowlist.
export const CONTACT_SITES = new Map([
 ['https://solidtec.dk','solidtec'],
 ['https://www.solidtec.dk','solidtec'],
 ['https://consults.dk','consults'],
 ['https://www.consults.dk','consults']
]);
const err=(res,status,message)=>res.status(status).json({ok:false,error:message});
const clean=(value,max)=>typeof value==='string'&&value.length<=max?value.trim():null;
export function createHandler({ready=contactReady,send=sendContact,reserve=reserveContact}={}){
 return async (req,res)=>{
  res.setHeader('Cache-Control','no-store');
  res.setHeader('Vary','Origin');
  res.setHeader('X-Content-Type-Options','nosniff');
  const origin=req.headers.origin;
  const site=CONTACT_SITES.get(origin);
  if(!site)return err(res,403,'Origin not allowed');
  res.setHeader('Access-Control-Allow-Origin',origin);
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  res.setHeader('Access-Control-Allow-Methods','POST, OPTIONS');
  if(req.method==='OPTIONS')return res.status(204).end();
  if(req.method!=='POST')return err(res,405,'Method not allowed');
  if(!/^application\/json(?:;|$)/i.test(String(req.headers['content-type']||'')))return err(res,415,'Expected JSON');
  let data=req.body;
  try{
   if(typeof data==='string')data=JSON.parse(data);
   if(!data||typeof data!=='object'||Array.isArray(data)||Buffer.byteLength(JSON.stringify(data),'utf8')>5000)return err(res,413,'Invalid message');
  }catch{return err(res,400,'Invalid JSON');}
  // Spam trap: neither mailbox receives messages from filled hidden fields.
  if(data.website)return res.status(200).json({ok:true});
  // Never trust a client-supplied recipient or site identifier. The browser
  // Origin selects the site, and the server selects that site's mailbox.
  const payload={
   firma:clean(data.firma,120),navn:clean(data.navn,120),
   email:clean(data.email,254),tlf:clean(data.tlf||'',60),
   emne:clean(data.emne||'',100),besked:clean(data.besked,2500),
   lang:data.lang==='en'?'en':'da',site
  };
  const safeHeaderField=v=>typeof v==='string'&&!/[\r\n]/.test(v);
  if(!payload.firma||!payload.navn||!payload.besked||payload.besked.length<10||
     !payload.email||!(/^[^\s@]+@[^\s@]+\.[^\s@]+$/).test(payload.email)||
     !safeHeaderField(payload.email)||!safeHeaderField(payload.navn)||
     !safeHeaderField(payload.emne)||!safeHeaderField(payload.firma)||
     payload.emne===null||payload.tlf===null)return err(res,400,'Check the required fields');
  if(!ready())return err(res,503,'Contact form not configured');
  try{
   if(!await reserve(site))return err(res,429,'Too many requests; try again later');
   await send(payload);
   return res.status(200).json({ok:true});
  }catch(error){
   console.error('Contact submission failed',error?.name||'Error');
   return err(res,503,'Could not send message; please contact us by phone or email');
  }
 };
}
export default createHandler();
