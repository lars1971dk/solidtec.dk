import { BlockList, isIP } from 'node:net';

export function normalizeRule(input) {
  if (typeof input !== 'string' || input.length > 80) throw new Error('Ugyldig IP-adresse');
  const parts=input.trim().split('/');
  if(parts.length>2)throw new Error('Ugyldig IP-adresse');
  const address=parts[0];
  const family=isIP(address);
  if(!family || address.includes('%'))throw new Error('Brug en IPv4- eller IPv6-adresse');
  let prefix=null;
  if(parts.length===2) {
    if(!/^\d{1,3}$/.test(parts[1]))throw new Error('Ugyldigt netværksinterval');
    prefix=Number(parts[1]);
    // Exact IPs and intentionally selected CIDR networks are supported.
    if(prefix<0 || prefix>(family===4?32:128))throw new Error('Ugyldigt netværksinterval');
  }
  const normalized=family===6?new URL('http://['+address+']/').hostname.slice(1,-1):address;
  return {value:normalized+(prefix===null?'':'/'+prefix),address:normalized,type:family===4?'ipv4':'ipv6',prefix};
}
export function normalizeRules(values) {
  if(!Array.isArray(values)||values.length>50)throw new Error('Du kan gemme højst 50 IP-adresser eller netværk');
  return [...new Set(values.map(value=>normalizeRule(value).value))];
}
export function clientAddress(req,hosted=process.env.VERCEL==='1') {
  // On Vercel only use the platform's trusted header. Generic forwarded headers are ignored.
  const value=hosted?req.headers['x-vercel-forwarded-for']:req.socket?.remoteAddress;
  if(typeof value!=='string')return null;
  const address=value.split(',')[0].trim();
  try { return normalizeRule(address).address; } catch { return null; }
}
export function matchesRules(address,rules) {
  if(!address)return false;
  const family=isIP(address);if(!family)return false;
  const block=new BlockList();
  for(const value of normalizeRules(rules)){
    const rule=normalizeRule(value);
    if(rule.prefix===null)block.addAddress(rule.address,rule.type);
    else block.addSubnet(rule.address,rule.prefix,rule.type);
  }
  return block.check(address,family===4?'ipv4':'ipv6');
}
export async function shouldExclude(req,readSettings,hosted=process.env.VERCEL==='1') {
  const settings=await readSettings();
  return matchesRules(clientAddress(req,hosted),settings.rules);
}
