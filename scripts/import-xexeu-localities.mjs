import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {Pool,neonConfig} from '@neondatabase/serverless';
neonConfig.webSocketConstructor=globalThis.WebSocket;
const email=process.argv[process.argv.indexOf('--actor-email')+1];
if(!process.argv.includes('--actor-email')||!email?.includes('@'))throw Error('Informe --actor-email de um administrador autorizado.');
const data=JSON.parse(readFileSync('docs/data/xexeu-localities.json','utf8'));assert.equal(data.municipalityCode,'2616506');
const pool=new Pool({connectionString:process.env.DATABASE_URL,max:1}),client=await pool.connect();
try{await client.query('BEGIN');const user=await client.query(`select u.id from "user" u join roles r on r.code=u.role and r.enabled where u.email=$1 and u.active and u.role='administrador_geral' and exists(select 1 from role_permissions rp where rp.role_code=u.role and rp.permission_code='territory.manage') for share`,[email]);assert.equal(user.rows.length,1,'Administrador ativo com permissão territorial necessário.');await client.query("select set_config('app.actor_id',$1,true)",[user.rows[0].id]);await client.query('select pg_advisory_xact_lock(2028,51)');let inserted=0,located=0,preserved=0;
for(const row of data.localities){assert.ok(row.name&&row.name.length<=150);assert.ok(['distrito','bairro','engenho','sitio','comunidade_rural'].includes(row.kind));assert.equal(row.latitude===null,row.longitude===null);if(row.latitude!==null){assert.ok(row.latitude>-9&&row.latitude<-8.7&&row.longitude>-35.8&&row.longitude<-35.5);assert.equal(new URL(row.sourceUrl).hostname,'geoftp.ibge.gov.br');}
 const description=[row.source,row.sourceCode?'Código IBGE: '+row.sourceCode:row.category,row.latitude===null?'Coordenadas pendentes de verificação.':'Ponto de referência da localidade; não delimita bairros.',row.name==='Campos Frios'?'Núcleo urbano no IBGE; denominado distrito no documento municipal.':'','Fonte: '+row.sourceUrl].filter(Boolean).join(' ');
 const found=await client.query('select id,latitude,longitude from communities where lower(trim(name))=lower(trim($1)) and kind=$2 for update',[row.name,row.kind]);
 if(!found.rows.length){await client.query('insert into communities(name,kind,description,latitude,longitude) values($1,$2,$3,$4,$5)',[row.name,row.kind,description,row.latitude,row.longitude]);inserted++;}
 else if(found.rows[0].latitude===null&&found.rows[0].longitude===null&&row.latitude!==null){await client.query('update communities set latitude=$1,longitude=$2,version=version+1 where id=$3',[row.latitude,row.longitude,found.rows[0].id]);located++;}else preserved++;
}
await client.query("insert into audit_logs(actor_id,action,metadata) values($1,'territory.catalog.imported',$2::jsonb)",[user.rows[0].id,JSON.stringify({municipality:data.municipalityCode,inserted,located,preserved,sourceArchiveSha256:data.archiveSha256})]);
const apply=process.argv.includes('--apply');await client.query(apply?'COMMIT':'ROLLBACK');console.log(JSON.stringify({applied:apply,inserted,located,preserved,verifiedPoints:data.localities.filter(l=>l.latitude!==null).length}));
}catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();await pool.end();}
