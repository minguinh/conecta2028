import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {neon} from '@neondatabase/serverless';
process.loadEnvFile('.env.security');
const db=neon(process.env.DATABASE_URL);const base='http://127.0.0.1:3002';
const password=randomBytes(24).toString('base64url');
async function call(path,{method='GET',data,cookie,origin=base}={}){const response=await fetch(base+path,{method,redirect:'manual',headers:{...(data?{'Content-Type':'application/json','Origin':origin}:{}),...(cookie?{Cookie:cookie}:{})},body:data?JSON.stringify(data):undefined});let body;try{body=await response.json();}catch{body={};}return {response,body};}
async function login(email){const result=await call('/api/auth/sign-in/email',{method:'POST',data:{email,password}});assert.equal(result.response.status,200,JSON.stringify(result.body));const cookies=result.response.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');assert.ok(cookies);return cookies;}
const before=await db`SELECT count(*)::int AS count FROM "user"`;assert.equal(before[0].count,0,'Run only on an empty isolated test branch');
let result=await call('/api/setup',{method:'POST',data:{name:'Security test admin',email:'admin@security.invalid',password}});assert.equal(result.response.status,201,JSON.stringify(result.body));
result=await call('/api/setup',{method:'POST',data:{name:'Other',email:'other@security.invalid',password}});assert.equal(result.response.status,409);
const adminCookie=await login('admin@security.invalid');
const adminUsers=await call('/api/users',{cookie:adminCookie});assert.equal(adminUsers.response.status,200);const adminId=adminUsers.body.users[0].id;
for(const path of ['/api/users','/api/audit','/api/dashboard'])assert.equal((await call(path)).response.status,401,path);
assert.equal((await call('/api/users',{method:'POST',cookie:adminCookie,origin:'https://untrusted.invalid',data:{}})).response.status,403);
const people={};
for(const role of ['coordenador','assessor','analista']){
 result=await call('/api/users',{method:'POST',cookie:adminCookie,data:{name:role,email:`${role}@security.invalid`,role}});assert.equal(result.response.status,201,JSON.stringify(result.body));const id=result.body.id;const token=new URLSearchParams(new URL(result.body.activationUrl).hash.slice(1)).get('token');
 assert.equal((await call('/api/activate',{method:'POST',data:{token,password}})).response.status,200);
 assert.equal((await call('/api/activate',{method:'POST',data:{token,password}})).response.status,400,'Activation replay must fail');
 people[role]={id,cookie:await login(`${role}@security.invalid`)};
}
assert.equal((await call('/api/users',{method:'POST',cookie:adminCookie,data:{name:'Health',email:'health@security.invalid',role:'atendente_saude'}})).response.status,400);
for(const role of ['coordenador','assessor','analista']){
 const {cookie}=people[role];assert.equal((await call('/api/users',{method:'POST',cookie,data:{name:'Escalation',email:'escalate@security.invalid',role:'administrador_geral'}})).response.status,403);
 assert.equal((await call('/api/audit?all=true',{cookie})).response.status,403);assert.equal((await call(`/api/audit?userId=${adminId}`,{cookie})).response.status,403);assert.equal((await call('/api/audit',{cookie})).response.status,200);
 assert.equal((await call('/api/users',{cookie})).response.status,role==='coordenador'?200:403);
 assert.equal((await call('/api/auth/update-user',{method:'POST',cookie,data:{role:'administrador_geral'}})).response.status,403);
}
// Business fixtures exist only on the isolated authorization-check branch.
const [locality]=await db`INSERT INTO communities(name,latitude,longitude) VALUES ('Security test',-8,-35) RETURNING id`;
await db`INSERT INTO activities(title,community_id,assigned_to) VALUES ('Assigned record',${locality.id},${people.assessor.id}),('Unassigned record',${locality.id},NULL)`;
await db`INSERT INTO contacts(name,community_id,assigned_to) VALUES ('Assigned contact',${locality.id},${people.assessor.id}),('Unassigned contact',${locality.id},NULL)`;
result=await call('/api/dashboard',{cookie:people.assessor.cookie});assert.equal(result.response.status,200);assert.equal(result.body.data.counts.contacts,1);assert.equal(result.body.data.latest.length,1);
result=await call('/api/dashboard',{cookie:people.analista.cookie});assert.equal(result.body.data.counts.contacts,2);assert.equal(result.body.data.latest.length,0);assert.equal(result.body.data.agenda.length,0);
assert.equal((await call(`/api/users/${adminId}`,{method:'PATCH',cookie:adminCookie,data:{active:false}})).response.status,409);
result=await call(`/api/users/${people.coordenador.id}`,{method:'PATCH',cookie:adminCookie,data:{role:'analista'}});assert.equal(result.response.status,200,JSON.stringify(result.body));assert.equal((await call('/api/users',{cookie:people.coordenador.cookie})).response.status,401);
const freshCoordinator=await login('coordenador@security.invalid');assert.equal((await call('/api/users',{cookie:freshCoordinator})).response.status,403);
result=await call(`/api/users/${people.assessor.id}`,{method:'PATCH',cookie:adminCookie,data:{active:false}});assert.equal(result.response.status,200);assert.equal((await call('/api/dashboard',{cookie:people.assessor.cookie})).response.status,401);
assert.notEqual((await call('/api/auth/sign-in/email',{method:'POST',data:{email:'assessor@security.invalid',password}})).response.status,200);
const logs=await db`SELECT action,metadata FROM audit_logs`;assert.ok(logs.some(x=>x.action==='auth.login'));assert.ok(logs.some(x=>x.action==='user.role.changed'));assert.ok(logs.some(x=>x.action==='auth.session.revoked'));assert.ok(!JSON.stringify(logs).includes(password));
await assert.rejects(db`UPDATE audit_logs SET action='tampered'`);await assert.rejects(db`DELETE FROM audit_logs`);await assert.rejects(db`TRUNCATE audit_logs`);
console.log('PASS: bootstrap único, login, ativação de uso único, quatro perfis, negação de acesso, CSRF, escopo do assessor, agregação do analista, revogação imediata e auditoria append-only.');
