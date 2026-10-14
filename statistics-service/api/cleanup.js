import { authorized } from '../lib/core.js';
import { prune } from '../lib/storage.js';
import { pruneLoginState } from '../lib/dashboard-auth.js';
export default async function handler(req,res) {
  res.setHeader('Cache-Control','no-store');
  if(req.method !== 'GET' || !authorized(req.headers.authorization,process.env.CRON_SECRET)) return res.status(401).end();
  try { return res.status(200).json({removed:await prune(),loginStateRemoved:await pruneLoginState()}); } catch { return res.status(503).end(); }
}
