const objects=new Map();let revision=0;export const observed={};
export function reset(){objects.clear();revision=0;}
export async function get(path,options){observed.get=options;const item=objects.get(path);if(!item)return null;return {statusCode:200,stream:new ReadableStream({start(controller){controller.enqueue(new TextEncoder().encode(item.body));controller.close();}}),blob:{etag:item.etag}};}
export async function put(path,body,options){observed.put=options;const existing=objects.get(path);if(existing&&!options.allowOverwrite){const error=new Error('exists');error.name='BlobAlreadyExistsError';throw error;}if(options.ifMatch&&existing?.etag!==options.ifMatch){const error=new Error('conflict');error.name='BlobPreconditionFailedError';throw error;}const etag='"v'+(++revision)+'"';objects.set(path,{body,etag});return {etag};}
export async function list(){return {blobs:[],hasMore:false};}
export async function del(){}
