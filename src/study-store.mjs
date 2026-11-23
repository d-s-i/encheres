import {readFile,readdir,mkdir,writeFile,access,unlink,rename} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {join} from 'node:path';

export function fileStudyStore(dataDir=join(process.cwd(),'data')){
 const file=id=>join(dataDir,id+'.json');
 return {
  async list(){try{const names=(await readdir(dataDir)).filter(n=>/^[a-f0-9]{64}\.json$/.test(n));return Promise.all(names.map(async n=>JSON.parse(await readFile(join(dataDir,n),'utf8'))))}catch(e){if(e.code==='ENOENT')return [];throw e}},
  async get(id){try{return JSON.parse(await readFile(file(id),'utf8'))}catch(e){if(e.code==='ENOENT')return null;throw e}},
  async has(id){try{await access(file(id));return true}catch(e){if(e.code==='ENOENT')return false;throw e}},
  async put(id,record){await mkdir(dataDir,{recursive:true});try{await writeFile(file(id),JSON.stringify(record),{flag:'wx'});return true}catch(e){if(e.code==='EEXIST')return false;throw e}},
  async replace(id,record){
   await mkdir(dataDir,{recursive:true});const temp=join(dataDir,`${id}.${randomUUID()}.tmp`);
   try{await writeFile(temp,JSON.stringify(record),{flag:'wx'});await rename(temp,file(id))}
   finally{await unlink(temp).catch(e=>{if(e.code!=='ENOENT')throw e})}
  },
  async delete(id){try{await unlink(file(id));return true}catch(e){if(e.code==='ENOENT')return false;throw e}}
 };
}
