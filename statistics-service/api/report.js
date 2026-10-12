import { aggregate, authorized, ORIGINS } from '../lib/core.js';
import { pathsSince } from '../lib/storage.js';
export default async function handler(req,res) {
  res.setHeader('Cache-Control','private, no-store');
  res.setHeader('Vary','Origin');
  res.setHeader('X-Content-Type-Options','nosniff');
  const origin=req.headers.origin;
  if(!ORIGINS.has(origin)) return res.status(403).end();
  res.setHeader('Access-Control-Allow-Origin',origin);
  res.setHeader('Access-Control-Allow-Headers','Authorization');
  res.setHeader('Access-Control-Allow-Methods','GET, OPTIONS');
  if(req.method === 'OPTIONS') return res.status(204).end();
  if(req.method !== 'GET') return res.status(405).end();
  if(!authorized(req.headers.authorization,process.env.DASHBOARD_ACCESS_KEY)) return res.status(401).json({error:'Login kræves'});
  const days=Number(req.query.days || 7);
  if(![7,30,90].includes(days)) return res.status(400).json({error:'Ugyldig periode'});
  try { return res.status(200).json(aggregate(await pathsSince(days),days)); }
  catch { return res.status(503).json({error:'Statistikken er midlertidigt utilgængelig'}); }
}
