import {get,put,list,del} from '@vercel/blob';
// Separate per-site quotas prevent enquiries on one website consuming the
// other website's allowance. Store counts only, no personal information.
export async function reserveContact(site='solidtec',now=Date.now()) {
 if(!['solidtec','consults'].includes(site))throw new Error('Invalid contact site');
 const path='contact/limit/'+site+'/'+new Date(now).toISOString().slice(0,13).replaceAll(':','-')+'.json';
 for(let attempt=0;attempt<4;attempt++){
  const result=await get(path,{access:'private',useCache:false});
  let current=null;
  if(result){
   if(result.statusCode!==200||!result.stream)throw new Error('Rate limit unavailable');
   current={body:await new Response(result.stream).json(),etag:result.blob.etag};
  }
  const count=Number(current?.body?.count)||0;
  if(count>=30)return false;
  try{
   await put(path,JSON.stringify({count:count+1}),{
    access:'private',contentType:'application/json',addRandomSuffix:false,
    allowOverwrite:!!current,...(current?{ifMatch:current.etag}:{})
   });
   return true;
  }catch(error){
   if(!['BlobPreconditionFailedError','BlobAlreadyExistsError'].includes(error.name))throw error;
  }
 }
 return false;
}
export async function pruneContactLimits(now=Date.now()) {
 let cursor,removed=0;
 do{
  const result=await list({prefix:'contact/limit/',limit:1000,cursor});
  const old=result.blobs.filter(item=>new Date(item.uploadedAt).getTime()<now-48*3600*1000);
  if(old.length){await del(old.map(item=>item.url));removed+=old.length;}
  cursor=result.hasMore?result.cursor:undefined;
 }while(cursor);
 return removed;
}
