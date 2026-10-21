// Use only an EMPTY schema-only branch with the RBAC catalog seeded. Never production.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {neon} from '@neondatabase/serverless';
import {hashPassword} from 'better-auth/crypto';
import {roleGrants} from '../src/lib/permissions.ts';
process.loadEnvFile('.env.security');
assert.equal(process.env.SECURITY_TEST_BRANCH,'true','An isolated test branch is required.');
const db=neon(process.env.DATABASE_URL),base='http://127.0.0.1:3002';
assert.equal((await db`SELECT count(*)::int n FROM "user"`)[0].n,0);
const id=randomUUID(),cases=[
 ['/api/dashboard','GET','dashboard.read'],['/api/territory','GET','territory.read'],
 ['/api/territory','POST','territory.manage'],[`/api/territory/${id}`,'PATCH','territory.manage'],['/api/territory/import','POST','territory.manage'],
 ['/api/contacts','GET','operations.read'],['/api/contacts','POST','operations.write'],[`/api/contacts/${id}`,'PATCH','operations.write'],[`/api/contacts/${id}/history`,'GET','operations.read'],
 ['/api/agenda?from=2028-01-01&to=2028-01-31','GET','operations.read'],['/api/agenda','POST','operations.write'],[`/api/agenda/${id}`,'PATCH','operations.write'],[`/api/agenda/${id}/status`,'PATCH','operations.write'],
 [`/api/activities/${id}/location`,'PATCH','operations.write'],['/api/users','GET','users.read'],['/api/users','POST','users.manage'],[`/api/users/${id}`,'PATCH','users.manage'],[`/api/users/${id}/invitation`,'POST','users.manage'],['/api/audit','GET','history.self'],['/api/audit?all=true','GET','audit.read']];
let checks=0;
async function call(path,method='GET',cookie,origin=base,payload='{}'){
 const r=await fetch(base+path,{method,headers:{...(method==='GET'?{}:{origin,'content-type':'application/json'}),...(cookie?{cookie}:{})},body:method==='GET'?undefined:payload});checks++;return r;
}
for(const [path,method]of cases)assert.equal((await call(path,method)).status,401,path);
const cookies={};
for(const role of ['administrador_geral','coordenador','assessor','analista']){
 const userId=randomUUID(),email=role+'@quality.invalid',password=randomUUID()+'Aa1!';
 await db`INSERT INTO "user"(id,name,email,role,active) VALUES (${userId},${'Teste '+role},${email},${role},true)`;
 await db`INSERT INTO account(id,"userId","providerId","accountId",password) VALUES (${randomUUID()},${userId},'credential',${userId},${await hashPassword(password)})`;
 const login=await call('/api/auth/sign-in/email','POST',undefined,base,JSON.stringify({email,password}));assert.equal(login.status,200);cookies[role]=login.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');
 for(const [path,method,permission]of cases){const response=await call(path,method,cookies[role]);if(!roleGrants[role].includes(permission))assert.equal(response.status,403,role+' '+path);else assert.ok(![401,403,500,503].includes(response.status),role+' '+path+' '+response.status);}
}
const admin=cookies.administrador_geral;
assert.equal((await call('/api/contacts','POST',admin,'https://evil.invalid')).status,403);
assert.equal((await call('/api/contacts','POST',admin,base,'x'.repeat(9000))).status,413);
assert.equal((await call('/api/contacts','POST',admin,base,'[')).status,400);
// Local test server enables bootstrap, but an existing user must block a second admin.
assert.equal((await call('/api/setup','POST',admin,base,JSON.stringify({name:'Teste',email:'bootstrap@quality.invalid',password:randomUUID()+'Aa1!'}))).status,409);
assert.equal((await call('/api/auth/sign-up/email','POST',admin)).status,403);
await db`DELETE FROM role_permissions WHERE role_code='coordenador' AND permission_code='operations.write'`;
assert.equal((await call('/api/agenda','POST',cookies.coordenador)).status,403);
await db`UPDATE roles SET enabled=false WHERE code='assessor'`;
assert.equal((await call('/api/dashboard','GET',cookies.assessor)).status,403);
await db`INSERT INTO role_permissions(role_code,permission_code) VALUES ('analista','operations.write')`;
assert.equal((await call('/api/agenda','POST',cookies.analista)).status,403);
console.log(`Security HTTP: ${checks} requests verified across all protected operations and four roles.`);
