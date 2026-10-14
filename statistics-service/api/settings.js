import { ORIGINS } from '../lib/core.js';
import { dashboardAuthorized as authorized } from '../lib/dashboard-auth.js';
import { clientAddress, normalizeRules } from '../lib/ip-exclusions.js';
import { readSettings, saveSettings } from '../lib/settings-store.js';

export function createHandler({read=readSettings,save=saveSettings,address=clientAddress,secret=()=>process.env.DASHBOARD_ACCESS_KEY}={}) {
 return async function handler(req,res) {
  res.setHeader('Cache-Control','private, no-store');
  res.setHeader('Vary','Origin');
  res.setHeader('X-Content-Type-Options','nosniff');
  const origin=req.headers.origin;
  if(!ORIGINS.has(origin))return res.status(403).end();
  res.setHeader('Access-Control-Allow-Origin',origin);
  res.setHeader('Access-Control-Allow-Headers','Authorization, Content-Type');
  res.setHeader('Access-Control-Allow-Methods','GET, PUT, OPTIONS');
  if(req.method==='OPTIONS')return res.status(204).end();
  if(!['GET','PUT'].includes(req.method))return res.status(405).end();
  if(!authorized(req.headers.authorization,secret()))return res.status(401).json({error:'Login kræves'});
  try {
    if(req.method==='GET'){
      const settings=await read();
      return res.status(200).json({...settings,currentIP:address(req)});
    }
    if(!String(req.headers['content-type']||'').startsWith('application/json'))return res.status(415).json({error:'Brug JSON'});
    let body=req.body;
    if(typeof body==='string'){
      if(Buffer.byteLength(body)>8192)return res.status(413).end();
      try{body=JSON.parse(body);}catch{return res.status(400).json({error:'Ugyldigt indhold'});}
    }
    if(!body || Buffer.byteLength(JSON.stringify(body))>8192)return res.status(413).end();
    let rules;
    try{rules=normalizeRules(body.rules);}catch(error){return res.status(400).json({error:error.message});}
    if(body.version!==null && typeof body.version!=='string')return res.status(400).json({error:'Hent indstillingerne igen'});
    const saved=await save(rules,body.version);
    return res.status(200).json({...saved,currentIP:address(req)});
  }catch(error){
    return res.status(error.status===409?409:503).json({error:error.status===409?'Indstillingerne er ændret. Hent dem igen før du gemmer.':'Indstillingerne er midlertidigt utilgængelige'});
  }
 };
}
export default createHandler();
