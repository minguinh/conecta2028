import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {neon} from '@neondatabase/serverless';
import {cleanup} from '../modules/health/service/cleanup.ts';
process.loadEnvFile('.env.health-security');assert.equal(process.env.HEALTH_SECURITY_TEST,'true');
const db=neon(process.env.HEALTH_DATABASE_URL_UNPOOLED);assert.equal((await db`select current_database() name`)[0].name,'health_test');
const env=Object.fromEntries(readFileSync('modules/health/.dev.vars.test','utf8').trim().split(/\r?\n/).map(l=>{const i=l.indexOf('=');return[l.slice(0,i),l.slice(i+1)];}));
const fixtures=[];
for(const type of ['expired','hold','active']){const patient=randomUUID(),request=randomUUID(),document=randomUUID();fixtures.push({type,patient,request,document});
 const expiry=type==='active'?new Date(Date.now()+86400000):new Date(Date.now()-86400000),hold=type==='hold'?new Date(Date.now()+86400000):null;
 await db.transaction([db`select set_config('health.actor_id','health-retention-system',true),set_config('health.audit_retention_days','1',true)`,db`insert into health.patients(id,name,identity_encrypted,assigned_to,expires_at,created_at) values(${patient},'Fixture de retenção','ciphertext-fixture','health-retention-system',${expiry},now()-interval '7 years')`,db`insert into health.requests(id,patient_id,protocol,kind,person_name,assigned_to,policy_version,expires_at,created_at,hold_until,hold_reference) values(${request},${patient},${'TEST-'+request},'exame','Fixture de retenção','health-retention-system','fixture',${expiry},now()-interval '7 years',${hold},${hold?'Fixture de suspensão':null})`,db`insert into health.documents(id,request_id,object_key,mime,size,uploaded_by) values(${document},${request},${'fixture/'+document},'image/png',32,'health-retention-system')`,db`insert into health.private_blobs(key,document_id,encrypted) values(${document},${document},decode('0011223344556677','hex'))`]);
}
const runtime=neon(env.HEALTH_DATABASE_URL);await assert.rejects(runtime`delete from health.access_logs`,e=>e.code==='42501');
await cleanup(env);
for(const f of fixtures){const expected=f.type==='expired'?0:1;assert.equal((await db`select count(*)::int n from health.requests where id=${f.request}`)[0].n,expected);assert.equal((await db`select count(*)::int n from health.private_blobs where document_id=${f.document}`)[0].n,expected);assert.equal((await db`select count(*)::int n from health.patients where id=${f.patient}`)[0].n,expected);}
const expired=fixtures[0];assert.equal((await db`select count(*)::int n from health.erasure_jobs where request_id=${expired.request} and status='concluido'`)[0].n,1);
await cleanup(env);assert.equal((await db`select count(*)::int n from health.erasure_jobs where request_id=${expired.request}`)[0].n,1);
console.log('PASS retenção: exclusão em cascata de arquivo e ficha vencidos, preservação de suspensão e registro vigente, papel restrito e comprovante idempotente. Somente fixtures no health_test.');
