// Run only against the explicitly selected independent health project.
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {randomBytes,randomUUID,createHash} from 'node:crypto';
import {neon} from '@neondatabase/serverless';
import {drizzle} from 'drizzle-orm/neon-http';
import {migrate} from 'drizzle-orm/neon-http/migrator';
const test=process.argv.includes('--test');
if(existsSync('.env.health-setup'))process.loadEnvFile('.env.health-setup');
const owner=readFileSync('.cloudflare-artifacts/health-owner.txt','utf8').match(/postgres(?:ql)?:\/\/[^\s]+/)?.[0];
if(!owner)throw Error('Obtenha a conexão do projeto assistencial independente.');
const parsed=new URL(owner);if(!parsed.hostname.includes('sa-east-1'))throw Error('Confirme o projeto assistencial na região aprovada.');
if(test)parsed.pathname='/health_test';
const sql=neon(parsed.toString());
const [{db}]=await sql`select current_database() db`;
if(db!==(test?'health_test':'neondb'))throw Error('Banco inesperado.');
await migrate(drizzle(sql),{migrationsFolder:'modules/health/migrations',migrationsSchema:'health_migrations'});
const file=test?'modules/health/.dev.vars.test':'modules/health/.dev.vars.production';
let env;
if(existsSync(file))env=Object.fromEntries(readFileSync(file,'utf8').trim().split(/\r?\n/).map(l=>{const i=l.indexOf('=');return [l.slice(0,i),l.slice(i+1)];}));
else{
 const runtime=new URL(parsed),retention=new URL(parsed);runtime.username='health_runtime';retention.username='health_retention_service';runtime.password=randomBytes(32).toString('hex');retention.password=randomBytes(32).toString('hex');
 env={HEALTH_DATABASE_URL:runtime.toString(),HEALTH_RETENTION_DATABASE_URL:retention.toString(),HEALTH_AUTH_SECRET:randomBytes(64).toString('hex'),HEALTH_DATA_KEY:randomBytes(32).toString('base64'),HEALTH_URL:test?'http://localhost:8788':'https://conecta2028-saude.domingosfonseca.workers.dev',HEALTH_ENABLED:'true',HEALTH_POLICY_APPROVED_AT:'2026-10-22T00:00:00Z'};
 // Roles are shared by the two databases on this dedicated project. Never rotate production passwords for tests.
 if(test){await sql.query(`CREATE ROLE health_runtime LOGIN PASSWORD '${runtime.password}'`);await sql.query(`CREATE ROLE health_retention_service LOGIN PASSWORD '${retention.password}'`);}
 else{const old=Object.fromEntries(readFileSync('modules/health/.dev.vars.test','utf8').trim().split(/\r?\n/).map(l=>{const i=l.indexOf('=');return [l.slice(0,i),l.slice(i+1)];}));for(const key of ['HEALTH_DATABASE_URL','HEALTH_RETENTION_DATABASE_URL']){const u=new URL(old[key]);u.pathname='/neondb';env[key]=u.toString();}}
 writeFileSync(file,Object.entries(env).map(([k,v])=>k+'='+v).join('\n')+'\n');
}
await sql.query('REVOKE ALL ON SCHEMA health,health_auth FROM PUBLIC');
await sql.query('GRANT USAGE ON SCHEMA health,health_auth TO health_runtime');
await sql.query('GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA health_auth TO health_runtime');
await sql.query('GRANT SELECT ON ALL TABLES IN SCHEMA health TO health_runtime');
await sql.query('GRANT UPDATE(active) ON health.memberships TO health_runtime');
await sql.query('GRANT INSERT,UPDATE ON health.patients,health.requests,health.legal_records,health.documents,health.status_events TO health_runtime');
await sql.query('GRANT INSERT ON health.private_blobs,health.access_logs,health.erasure_jobs TO health_runtime');
await sql.query('GRANT USAGE ON SCHEMA health TO health_retention_service');
await sql.query('GRANT SELECT ON ALL TABLES IN SCHEMA health TO health_retention_service');
// PostgreSQL requires an UPDATE privilege for SELECT ... FOR UPDATE row locking.
// The version trigger prevents this role from actually changing a request ID alone.
await sql.query('GRANT UPDATE(id) ON health.requests TO health_retention_service');
await sql.query('GRANT INSERT ON health.access_logs,health.erasure_jobs TO health_retention_service');
await sql.query('GRANT DELETE ON health.patients,health.requests,health.documents,health.private_blobs,health.legal_records,health.status_events,health.access_logs,health.erasure_jobs TO health_retention_service');
await sql`INSERT INTO health.memberships(subject_id,role,active) VALUES ('health-retention-system','encarregado_privacidade_saude',true) ON CONFLICT DO NOTHING`;
if(test)writeFileSync('.env.health-security','HEALTH_SECURITY_TEST=true\nHEALTH_DATABASE_URL_UNPOOLED='+parsed+'\n');
else{
 const email=process.env.HEALTH_SUPERVISOR_EMAIL,name=process.env.HEALTH_SUPERVISOR_NAME;if(!email||!name)throw Error('Defina o supervisor no arquivo privado .env.health-setup.');const existing=await sql`SELECT id FROM health_auth."user" WHERE email=${email}`;
 if(!existing.length){const id=randomUUID(),token=randomBytes(32).toString('hex'),hash=createHash('sha256').update(token).digest('hex');await sql.transaction([sql`INSERT INTO health_auth."user"(id,name,email) VALUES (${id},${name},${email})`,sql`INSERT INTO health.memberships(subject_id,role,active) VALUES (${id},'supervisor_saude',false)`,sql`INSERT INTO health_auth.invitations(id,user_id,token_hash,expires_at) VALUES (${randomUUID()},${id},${hash},now()+interval '7 days')`]);writeFileSync('.cloudflare-artifacts/health-activation.txt',env.HEALTH_URL+'/ativar#token='+token);}
}
console.log('Migrations, permissões e configuração assistencial concluídas: '+db+'. Nenhuma senha definida para usuário real.');
