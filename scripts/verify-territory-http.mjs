import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {hashPassword} from 'better-auth/crypto';
import {neon} from '@neondatabase/serverless';
process.loadEnvFile('.env.security');const db=neon(process.env.DATABASE_URL),base='http://127.0.0.1:3002',password='Territory-test-only-2026-#1';
const original=await db`SELECT count(*)::int AS count FROM "user"`;assert.equal(original[0].count,0,'Use an empty schema-only test branch');
async function call(path,method='GET',data,cookie){const r=await fetch(base+path,{method,headers:{...(data?{'Content-Type':'application/json',Origin:base}:{}),...(cookie?{Cookie:cookie}:{})},body:data?JSON.stringify(data):undefined});const body=await r.json();return {status:r.status,body,headers:r.headers};}
const people={};for(const role of ['administrador_geral','coordenador','assessor','analista']){const id=randomUUID(),email=`${role}@territory.invalid`;await db`INSERT INTO "user"(id,name,email,role,active) VALUES (${id},${'Validação '+role},${email},${role},true)`;await db`INSERT INTO account(id,"userId","providerId","accountId",password) VALUES (${randomUUID()},${id},'credential',${id},${await hashPassword(password)})`;const login=await call('/api/auth/sign-in/email','POST',{email,password});assert.equal(login.status,200,JSON.stringify(login.body));people[role]={id,cookie:login.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ')};}
const admin=people.administrador_geral.cookie;
assert.equal((await call('/api/territory')).status,401);
for(const role of ['assessor','analista'])assert.equal((await call('/api/territory','POST',{name:'Blocked',kind:'bairro'},people[role].cookie)).status,403);
const ids=[];for(const kind of ['distrito','bairro','engenho','sitio','comunidade_rural']){const r=await call('/api/territory','POST',{name:`Validação ${kind}`,kind,description:'Registro exclusivo da branch de testes',latitude:-8.8362,longitude:-35.6533},admin);assert.equal(r.status,201,JSON.stringify(r.body));ids.push(r.body.id);}
let state=(await call('/api/territory','GET',undefined,admin)).body;assert.equal(state.localities.length,5);
const saved=state.localities.find(l=>l.id===ids[0]);const updated=await call(`/api/territory/${saved.id}`,'PATCH',{...saved,name:'Validação atualizada'},people.coordenador.cookie);assert.equal(updated.status,200);
assert.equal((await call(`/api/territory/${saved.id}`,'PATCH',{...saved,name:'Conflito'},admin)).status,409);
assert.equal((await call('/api/territory','POST',{name:'Invalid',kind:'bairro',latitude:false,longitude:true},admin)).status,400);
const crossing={type:'Polygon',coordinates:[[[-35.66,-8.84],[-35.64,-8.82],[-35.64,-8.84],[-35.66,-8.82],[-35.66,-8.84]]]};assert.equal((await call('/api/territory','POST',{name:'Crossing',kind:'sitio',geometry:crossing},admin)).status,400);
const polygon={type:'Polygon',coordinates:[[[-35.66,-8.84],[-35.65,-8.84],[-35.65,-8.83],[-35.66,-8.84]]]};let result=await call('/api/territory/import','POST',{source:'Validação',geojson:{type:'Feature',properties:{nome:'Área de validação'},geometry:polygon}},admin);assert.equal(result.status,201,JSON.stringify(result.body));assert.equal(result.body.imported,1);result=await call('/api/territory/import','POST',{source:'Validação',geojson:{type:'Feature',properties:{nome:'Área de validação'},geometry:polygon}},admin);assert.equal(result.body.skipped,1);
result=await call('/api/territory/import','POST',{official:true},admin);assert.equal(result.status,201,JSON.stringify(result.body));assert.equal(result.body.imported,1);
const owned=randomUUID(),other=randomUUID();await db`INSERT INTO activities(id,title,community_id,assigned_to) VALUES (${owned},'Atividade atribuída',${ids[0]},${people.assessor.id}),(${other},'Outra atividade',${ids[1]},NULL)`;
assert.equal((await call(`/api/activities/${owned}/location`,'PATCH',{latitude:-8.836,longitude:-35.653,version:1},people.assessor.cookie)).status,200);
assert.equal((await call(`/api/activities/${other}/location`,'PATCH',{latitude:-8.83,longitude:-35.65,version:1},people.assessor.cookie)).status,409);
assert.equal((await call(`/api/activities/${owned}/location`,'PATCH',{latitude:-8.83,longitude:-35.65,version:2},people.analista.cookie)).status,403);
state=(await call('/api/territory','GET',undefined,people.assessor.cookie)).body;assert.equal(state.localities.length,1);assert.equal(state.activities.length,1);assert.equal(state.activities[0].latitude,-8.836);
state=(await call('/api/territory','GET',undefined,people.analista.cookie)).body;assert.equal(state.activities.length,0);assert.equal(state.localities.length,5);
const logs=await db`SELECT action FROM audit_logs WHERE action IN ('communities.insert','territorial_boundaries.insert','activities.update')`;assert.ok(logs.some(l=>l.action==='territorial_boundaries.insert'));assert.ok(logs.some(l=>l.action==='activities.update'));
// Leave the isolated browser preview empty; no test fixtures go to development.
await db`DELETE FROM activities`;await db`DELETE FROM communities`;await db`DELETE FROM territorial_boundaries`;
console.log('PASS: cinco tipos, edição, conflito de versão, validação PostGIS, importação GeoJSON/IBGE idempotente, permissões e localização de atividades com escopo e auditoria.');
