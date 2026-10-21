import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {hashPassword} from 'better-auth/crypto';
import {neon} from '@neondatabase/serverless';
process.loadEnvFile('.env.security');const db=neon(process.env.DATABASE_URL),base='http://127.0.0.1:3002',password='Integrity-HTTP-test-2026-#1';
const existing=await db`SELECT id FROM "user" WHERE email='upgrade@integrity.invalid'`;assert.equal(existing.length,1,'Execute somente após verify-integrity-upgrade na branch isolada.');assert.equal((await db`SELECT count(*)::int AS n FROM "user"`)[0].n,1);
async function call(path,method='GET',data,cookie){const r=await fetch(base+path,{method,headers:{...(data?{'Content-Type':'application/json',Origin:base}:{}),...(cookie?{Cookie:cookie}:{})},body:data?JSON.stringify(data):undefined});return {status:r.status,body:await r.json(),headers:r.headers};}
const actors={};for(const role of ['administrador_geral','coordenador','assessor','analista']){const id=role==='administrador_geral'?existing[0].id:randomUUID(),email=role==='administrador_geral'?'upgrade@integrity.invalid':`${role}@integrity.invalid`;if(role!=='administrador_geral')await db`INSERT INTO "user"(id,name,email,role,active) VALUES (${id},${'Validação '+role},${email},${role},true)`;await db`INSERT INTO account(id,"userId","providerId","accountId",password) VALUES (${randomUUID()},${id},'credential',${id},${await hashPassword(password)})`;const r=await call('/api/auth/sign-in/email','POST',{email,password});assert.equal(r.status,200,JSON.stringify(r.body));actors[role]={id,cookie:r.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ')};}
const admin=actors.administrador_geral.cookie,coordinator=actors.coordenador.cookie,analyst=actors.analista.cookie,advisor=actors.assessor.cookie;
assert.equal((await call('/api/users','GET',undefined,admin)).status,200);
assert.equal((await call('/api/contacts','GET',undefined,coordinator)).status,200);
assert.equal((await call('/api/contacts','GET',undefined,analyst)).status,403);
await db`DELETE FROM role_permissions WHERE role_code='coordenador' AND permission_code='operations.write'`;
try{assert.equal((await call('/api/agenda','POST',{},coordinator)).status,403);}finally{await db`INSERT INTO role_permissions(role_code,permission_code) VALUES ('coordenador','operations.write')`;}
await db`UPDATE roles SET enabled=false WHERE code='assessor'`;
try{assert.equal((await call('/api/dashboard','GET',undefined,advisor)).status,403);}finally{await db`UPDATE roles SET enabled=true WHERE code='assessor'`;}
await db`INSERT INTO role_permissions(role_code,permission_code) VALUES ('analista','operations.write')`;
try{assert.equal((await call('/api/agenda','POST',{},analyst)).status,403);}finally{await db`DELETE FROM role_permissions WHERE role_code='analista' AND permission_code='operations.write'`;}
await db`DELETE FROM role_permissions WHERE role_code='administrador_geral' AND permission_code='audit.read'`;
try{assert.equal((await call('/api/audit?all=true','GET',undefined,admin)).status,403);assert.equal((await call('/api/audit','GET',undefined,admin)).status,200);}finally{await db`INSERT INTO role_permissions(role_code,permission_code) VALUES ('administrador_geral','audit.read')`;}
assert.equal((await call('/api/audit?all=true','GET',undefined,admin)).status,200);assert.equal((await call('/api/audit?userId=nao-existe','GET',undefined,admin)).status,404);
const [locality]=await db`SELECT id FROM communities LIMIT 1`;
const draft={name:'Validação HTTP',phone:'81992223333',communityId:locality.id,legalBasis:'consentimento',purpose:'Validação isolada',legalEvidence:'Evidência fictícia',allowWhatsapp:true,allowSms:false,allowCalls:false,communicationEvidence:'Autorização fictícia de teste'};
const saved=await call('/api/contacts','POST',draft,admin);assert.equal(saved.status,201,JSON.stringify(saved.body));assert.equal((await call(`/api/contacts/${saved.body.id}`,'PATCH',{...draft,version:1,allowWhatsapp:false,communicationEvidence:'Revogação fictícia de teste'},admin)).status,200);
const history=await db`SELECT allow_whatsapp,recorded_by FROM contact_authorizations WHERE contact_id=${saved.body.id} ORDER BY contact_version`;assert.deepEqual(history.map(h=>h.allow_whatsapp),[true,false]);assert.ok(history.every(h=>h.recorded_by===actors.administrador_geral.id));
assert.equal((await call('/api/contacts','POST',draft,admin)).status,409);
console.log('PASS: sessões reais respeitam permissões do banco, desativação de perfil, teto de privilégios, auditoria global e registro transacional das autorizações de contato.');
