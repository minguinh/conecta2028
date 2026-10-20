import {neon} from '@neondatabase/serverless';
import {hashPassword} from 'better-auth/crypto';
import {randomBytes,randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
process.loadEnvFile('.env.security');const db=neon(process.env.DATABASE_URL);const base='http://127.0.0.1:3002';const id=randomUUID(),email=`session-${id}@security.invalid`,password=randomBytes(24).toString('base64url'),newPassword=randomBytes(24).toString('base64url');
// Isolated test-branch fixture; no credentials are printed or stored in files.
await db`INSERT INTO "user"(id,name,email,role,active) VALUES (${id},'Session fixture',${email},'analista',true)`;
await db`INSERT INTO account(id,"accountId","providerId","userId",password) VALUES (${randomUUID()},${id},'credential',${id},${await hashPassword(password)})`;
await db`DELETE FROM "rateLimit"`;
async function post(path,data,cookie){const response=await fetch(base+path,{method:'POST',headers:{Origin:base,'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},body:JSON.stringify(data)});const text=await response.text();let body;try{body=JSON.parse(text);}catch{body={};}return {response,body};}
async function login(pass){const result=await post('/api/auth/sign-in/email',{email,password:pass});assert.equal(result.response.status,200,JSON.stringify(result.body));return result.response.headers.getSetCookie().map(x=>x.split(';')[0]).join('; ');}
const a=await login(password),b=await login(password);
const changed=await post('/api/auth/change-password',{currentPassword:password,newPassword,revokeOtherSessions:false},a);assert.equal(changed.response.status,200,JSON.stringify(changed.body));
assert.equal((await fetch(base+'/api/dashboard',{headers:{Cookie:b}})).status,401,'Other sessions are revoked even if the caller sends false');
const c=await login(newPassword);const logout=await post('/api/auth/sign-out',{},c);assert.equal(logout.response.status,200);assert.equal((await fetch(base+'/api/dashboard',{headers:{Cookie:c}})).status,401);
await db`DELETE FROM "rateLimit"`;
let last;for(let i=0;i<7;i++)last=await post('/api/auth/sign-in/email',{email,password:'wrong-password-do-not-use'});assert.equal(last.response.status,429,'Repeated failed logins must be limited');
const logs=await db`SELECT action,metadata FROM audit_logs WHERE subject_id=${id} OR action='auth.login.failed'`;assert.ok(logs.some(x=>x.action==='auth.password.changed'));assert.ok(logs.some(x=>x.action==='auth.login.failed'));assert.ok(!JSON.stringify(logs).includes(newPassword));
await assert.rejects(db`INSERT INTO "user"(id,name,email,role,active) VALUES (${randomUUID()},'Blocked','blocked@security.invalid','atendente_saude',true)`);
await db`DELETE FROM "rateLimit"`;
await db`UPDATE "user" SET active=false WHERE id=${id}`;
const blocked=await post('/api/auth/sign-in/email',{email,password:newPassword});assert.notEqual(blocked.response.status,200);assert.equal(blocked.response.headers.getSetCookie().some(x=>x.includes('session_token=')&&!x.includes('Max-Age=0')),false,'Inactive account cannot receive a session');
const activeSessions=await db`SELECT count(*)::int AS count FROM session WHERE "userId"=${id}`;assert.equal(activeSessions[0].count,0);
console.log('PASS: troca de senha, revogação obrigatória de outras sessões, logout, limite persistente de tentativas, auditoria de falhas e bloqueio do perfil futuro no PostgreSQL.');
