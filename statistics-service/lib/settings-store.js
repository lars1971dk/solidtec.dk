import { get, put } from '@vercel/blob';
import { normalizeRules } from './ip-exclusions.js';

const path='settings/ip-exclusions.json';
export async function readSettings() {
  const result=await get(path,{access:'private',useCache:false});
  if(!result)return {rules:[],version:null};
  if(result.statusCode!==200 || !result.stream)throw new Error('Indstillinger kunne ikke læses');
  const body=await new Response(result.stream).json();
  return {rules:normalizeRules(body.rules),version:result.blob.etag};
}
export async function saveSettings(rules,version) {
  const current=await readSettings();
  if(current.version!==version){const error=new Error('Indstillinger er ændret i en anden session. Hent dem igen.');error.status=409;throw error;}
  try {
    const result=await put(path,JSON.stringify({rules:normalizeRules(rules)}),{
      access:'private',addRandomSuffix:false,allowOverwrite:current.version!==null,
      ...(current.version?{ifMatch:current.version}:{}),contentType:'application/json',cacheControlMaxAge:60});
    return {rules:normalizeRules(rules),version:result.etag};
  }catch(error){
    if(error.name==='BlobPreconditionFailedError'||error.name==='BlobAlreadyExistsError'){error.status=409;}
    throw error;
  }
}
