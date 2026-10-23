import {ORIGINS} from '../lib/core.js';
import {contactReady,sendContact} from '../lib/contact-mail.js';
import {reserveContact} from '../lib/contact-limit.js';
const err=(res,status,message)=>res.status(status).json({ok:false,error:message});
const clean=(value,max)=>typeof value==='string'&&value.length<=max?value.trim():null;
export function createHandler({ready=contactReady,send=sendContact,reserve=reserveContact}={}){
 return async (req,res)=>{
  res.setHeader('Cache-Control','no-store');res.setHeader('Vary','Origin');res.setHeader('X-Content-Type-Options','nosniff');
  const origin=req.headers.origin;
  if(!ORIGINS.has(origin))return err(res,403,'Origin not allowed');
  res.setHeader('Access-Control-Allow-Origin',origin);
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  res.setHeader('Access-Control-Allow-Methods','POST, OPTIONS');
  if(req.method==='OPTIONS')return res.status(204).end();
  if(req.method!=='POST')return err(res,405,'Method not allowed');
  if(!/^application\/json(?:;|$)/i.test(String(req.headers['content-type']||'')))return err(res,415,'Expected JSON');
  let data=req.body;
  try{if(typeof data==='string')data=JSON.parse(data);if(!data||Array.isArray(data)||Buffer.byteLength(JSON.stringify(data),'utf8')>5000)return err(res,413,'Invalid message');}catch{return err(res,400,'Invalid JSON');}
  // Honeypot: silently accept bots rather than sending spam to the mailbox.
  if(data.website)return res.status(200).json({ok:true});
  const payload={firma:clean(data.firma,120),navn:clean(data.navn,120),email:clean(data.email,254),tlf:clean(data.tlf||'',60),emne:clean(data.emne||'',100),besked:clean(data.besked,2500),lang:data.lang==='en'?'en':'da'};
  if(!payload.firma||!payload.navn||!payload.besked||payload.besked.length<10||!payload.email||!(/^[^\s@]+@[^\s@]+\.[^\s@]+$/).test(payload.email)||payload.email.includes('\n')||payload.navn.includes('\n')||payload.emne===null||payload.tlf===null)return err(res,400,'Check the required fields');
  if(!ready())return err(res,503,'Contact form not configured');
  try{
   if(!await reserve())return err(res,429,'Too many requests; try again later');
   await send(payload);
   return res.status(200).json({ok:true});
  }catch(error){console.error('Contact submission failed',error?.name||'Error');return err(res,503,'Could not send message; please contact us by phone or email');}
 };
}
export default createHandler();
