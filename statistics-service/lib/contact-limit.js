import {get,put} from '@vercel/blob';
// Coarse global hourly quota. No IP addresses, browser identifiers or message contents stored.
export async function reserveContact(now=Date.now()) {
 const path='contact/limit/'+new Date(now).toISOString().slice(0,13).replaceAll(':','-')+'.json';
 for(let attempt=0;attempt<4;attempt++){
  const result=await get(path,{access:'private',useCache:false});
  let current=null;
  if(result){if(result.statusCode!==200||!result.stream)throw new Error('Rate limit unavailable');current={body:await new Response(result.stream).json(),etag:result.blob.etag};}
  const count=Number(current?.body?.count)||0;
  if(count>=30)return false;
  try{await put(path,JSON.stringify({count:count+1}),{access:'private',contentType:'application/json',addRandomSuffix:false,allowOverwrite:!!current,...(current?{ifMatch:current.etag}:{})});return true;}
  catch(error){if(!['BlobPreconditionFailedError','BlobAlreadyExistsError'].includes(error.name))throw error;}
 }
 return false;
}
