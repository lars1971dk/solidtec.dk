import { validView, optedOut, bot } from '../lib/core.js';
import { record } from '../lib/storage.js';
const pixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7','base64');
export default async function handler(req,res) {
  res.setHeader('Cache-Control','private, no-store, max-age=0');
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Cross-Origin-Resource-Policy','cross-origin');
  res.setHeader('X-Content-Type-Options','nosniff');
  if(req.method !== 'GET') return res.status(405).end();
  const {site,page}=req.query;
  if(validView(site,page) && !optedOut(req.headers) && !bot(req.headers)) {
    try { await record(site,page); } catch { /* Counting outages must not interrupt the website. */ }
  }
  res.setHeader('Content-Type','image/gif');
  res.status(200).send(pixel);
}
