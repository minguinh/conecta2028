import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {join,relative} from 'node:path';
function files(dir:string):string[]{return readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(join(dir,e.name)):e.name==='route.ts'?[join(dir,e.name)]:[]);}
test('every business API handler requires server authorization and mutations check origin',()=>{
 for(const path of files('src/app/api')){
  const name=relative('src/app/api',path).replaceAll('\\','/');if(['auth/[...all]/route.ts','activate/route.ts','setup/route.ts'].includes(name))continue;
  const source=readFileSync(path,'utf8');const handlers=source.split(/export async function (GET|POST|PATCH|DELETE|PUT)\(/);
  assert.ok(handlers.length>1,name);
  for(let i=1;i<handlers.length;i+=2){assert.match(handlers[i+1],/await requireActor\([^;]*?['"](?:[a-z]+\.[a-z]+)['"]\)/,name+' '+handlers[i]);if(handlers[i]!=='GET')assert.match(handlers[i+1],/sameOrigin\(/,name+' '+handlers[i]);}
 }
});
