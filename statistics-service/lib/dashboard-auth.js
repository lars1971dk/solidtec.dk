import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { get, put, list, del } from '@vercel/blob';
import { authorized as legacyAuthorized } from './core.js';

export const ownerEmail = () => process.env.DASHBOARD_ADMIN_EMAIL || 'lt@solidtec.dk';
export const mailReady = () => !!(process.env.DASHBOARD_SMTP_HOST && process.env.DASHBOARD_SMTP_USER && process.env.DASHBOARD_SMTP_PASSWORD && process.env.DASHBOARD_ACCESS_KEY);
const sign = (body, secret) => createHmac('sha256',secret).update(ownerEmail()+'\n'+body).digest('base64url');
export function issueToken(kind, secret, now=Date.now()) {
 if(!secret || secret.length<12)throw new Error('Login configuration missing');
 const body=kind+'.'+Math.floor(now/1000)+'.'+randomBytes(24).toString('base64url');
 return body+'.'+sign(body,secret);
}
export function validToken(token,kind,secret,now=Date.now()) {
 if(typeof token!=='string'||!secret||secret.length<12||token.length>256)return false;
 const parts=token.split('.');
 if(parts.length!==4||parts[0]!==kind||!/^\d{10}$/.test(parts[1])||!/^[\w-]{32}$/.test(parts[2]))return false;
 const age=Math.floor(now/1000)-Number(parts[1]);
 if(age<0||age>(kind==='link'?900:3600))return false;
 const expected=Buffer.from(sign(parts.slice(0,3).join('.'),secret)),supplied=Buffer.from(parts[3]);
 return expected.length===supplied.length&&timingSafeEqual(expected,supplied);
}
export function dashboardAuthorized(header,secret=process.env.DASHBOARD_ACCESS_KEY) {
 if(typeof header!=='string'||!header.startsWith('Bearer '))return false;
 if(validToken(header.slice(7),'session',secret))return true;
 // Preserve access while the independent mail sender is being configured.
 return !mailReady() && legacyAuthorized(header,secret);
}
async function read(path) {
 const result=await get(path,{access:'private',useCache:false});
 if(!result)return null;
 if(result.statusCode!==200||!result.stream)throw new Error('Login storage unavailable');
 return {body:await new Response(result.stream).json(),etag:result.blob.etag};
}
export async function reserveLogin(now=Date.now()) {
 const path='auth/limits/'+new Date(now).toISOString().slice(0,13).replaceAll(':','-')+'.json';
 for(let attempt=0;attempt<3;attempt++) {
  const current=await read(path),count=current?.body.count||0;
  if(count>=2)return false;
  try {await put(path,JSON.stringify({count:count+1}),{access:'private',addRandomSuffix:false,allowOverwrite:!!current,...(current?{ifMatch:current.etag}:{}),contentType:'application/json'});return true;}
  catch(error){if(!['BlobPreconditionFailedError','BlobAlreadyExistsError'].includes(error.name))throw error;}
 }
 return false;
}
export async function saveLink(token) {
 await put('auth/links/'+token.split('.')[2]+'.json',JSON.stringify({used:false}),{access:'private',addRandomSuffix:false,contentType:'application/json'});
}
export async function consumeLink(token) {
 const path='auth/links/'+token.split('.')[2]+'.json',current=await read(path);
 if(!current||current.body.used)return false;
 try {await put(path,JSON.stringify({used:true}),{access:'private',addRandomSuffix:false,allowOverwrite:true,ifMatch:current.etag,contentType:'application/json'});return true;}
 catch(error){if(error.name==='BlobPreconditionFailedError')return false;throw error;}
}
export async function pruneLoginState(now=Date.now()) {
 let cursor,removed=0;
 do {
  const result=await list({prefix:'auth/',limit:1000,cursor});
  const old=result.blobs.filter(item=>new Date(item.uploadedAt).getTime()<now-86400000);
  if(old.length){await del(old.map(item=>item.url));removed+=old.length;}
  cursor=result.hasMore?result.cursor:undefined;
 }while(cursor);
 return removed;
}
