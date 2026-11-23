import * as blobSdk from '@vercel/blob';

// Private store: study contents and price history must never have a public blob URL.
export function blobStudyStore(sdk=blobSdk,{prefix='studies/'}={}){
 if(!['studies/','favorites/'].includes(prefix))throw Error('Préfixe Blob invalide.');
 const pathname=id=>`${prefix}${id}.json`;
 const {put,get,head,list,del,BlobNotFoundError}=sdk;
 return {
  async list(){
   const records=[];let cursor;
   do{
    const page=await list({prefix,cursor,limit:1000});
    for(const blob of page.blobs){
     if(!blob.pathname.startsWith(prefix)||!/^[a-f0-9]{64}\.json$/.test(blob.pathname.slice(prefix.length)))continue;
     const result=await get(blob.pathname,{access:'private',useCache:false});
     if(result?.statusCode===200)records.push(await new Response(result.stream).json());
    }
    cursor=page.hasMore?page.cursor:undefined;
   }while(cursor);
   return records;
  },
  async get(id){const result=await get(pathname(id),{access:'private',useCache:false});return result?.statusCode===200?new Response(result.stream).json():null},
  async has(id){try{await head(pathname(id));return true}catch(e){if(e instanceof BlobNotFoundError)return false;throw e}},
  async put(id,record){
   if(await this.has(id))return false;
   await put(pathname(id),JSON.stringify(record),{access:'private',contentType:'application/json',addRandomSuffix:false});return true;
  },
  async replace(id,record){
   await put(pathname(id),JSON.stringify(record),{access:'private',contentType:'application/json',addRandomSuffix:false,allowOverwrite:true});
  },
  async delete(id){
   if(!await this.has(id))return false;
   await del(pathname(id));return true;
  }
 };
}
