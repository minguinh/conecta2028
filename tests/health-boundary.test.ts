import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readdirSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
function sources(dir:string):string[]{return readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?sources(join(dir,e.name)):/\.tsx?$/.test(e.name)?[join(dir,e.name)]:[]);}
test('primary application has no health database, bucket or service imports',()=>{
 for(const file of sources('src'))assert.doesNotMatch(readFileSync(file,'utf8'),/modules\/health|HEALTH_DATABASE_URL|HEALTH_DOCUMENTS/,file);
 assert.doesNotMatch(readFileSync('drizzle.config.ts','utf8'),/modules\/health/);
 assert.doesNotMatch(readFileSync('wrangler.jsonc','utf8'),/HEALTH_DATABASE_URL|HEALTH_DOCUMENTS/);
});
