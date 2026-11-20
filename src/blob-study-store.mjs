import * as blobSdk from '@vercel/blob';

// Private store: study contents and price history must never have a public blob URL.
const pathname=id=>`studies/${id}.json`;
export function blobStudyStore(sdk=blobSdk){
 const {put,get,head,list,del,BlobNotFoundError}=sdk;
 return {
  async list(){
   const records=[];let cursor;
   do{
    const page=await list({prefix:'studies/',cursor,limit:1000});
    for(const blob of page.blobs){
     if(!/^studies\/[a-f0-9]{64}\.json$/.test(blob.pathname))continue;
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
  async delete(id){
   if(!await this.has(id))return false;
   await del(pathname(id));return true;
  }
 };
}
