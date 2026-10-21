import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {neon} from '@neondatabase/serverless';
process.loadEnvFile('.env.integrity-upgrade');const db=neon(process.env.DATABASE_URL_UNPOOLED);
assert.equal((await db`SELECT count(*)::int AS n FROM "user"`)[0].n,0,'Use apenas a branch schema-only integrity-check.');
const id='00000000-0000-4000-8000-000000000011';
await db`INSERT INTO "user"(id,name,email,role,active) VALUES (${id},'Validação de atualização','upgrade@integrity.invalid','administrador_geral',true)`;
const [locality]=await db`INSERT INTO communities(name,kind) VALUES ('Localidade de atualização','bairro') RETURNING id`;
const [contact]=await db`INSERT INTO contacts(name,phone,community_id,assigned_to,legal_basis,purpose,legal_evidence) VALUES ('Contato de atualização','5581991112222',${locality.id},${id},'consentimento','Validação isolada','Evidência fictícia de validação') RETURNING id`;
await db`INSERT INTO visits(title,assigned_to,community_id,scheduled_at,ends_at) VALUES ('Visita de atualização',${id},${locality.id},'2028-01-01T12:00Z','2028-01-01T13:00Z')`;
for(const file of ['0011_fast_the_watchers.sql','0012_integrity_and_authorizations.sql','0013_clammy_pixie.sql','0014_spooky_shockwave.sql']){const statements=readFileSync('drizzle/'+file,'utf8').split('--> statement-breakpoint').filter(s=>s.trim());await db.transaction(statements.map(s=>db.query(s)));}
const history=await db`SELECT * FROM contact_authorizations WHERE contact_id=${contact.id}`;assert.equal(history.length,1);assert.equal(history[0].source,'migracao');assert.equal(history[0].recorded_by,null);assert.equal(history[0].allow_whatsapp,false);assert.equal(history[0].allow_sms,false);assert.equal(history[0].allow_calls,false);assert.equal(history[0].legal_evidence,'Evidência fictícia de validação');
assert.equal((await db`SELECT count(*)::int AS n FROM "user"`)[0].n,1);assert.equal((await db`SELECT count(*)::int AS n FROM contacts`)[0].n,1);assert.equal((await db`SELECT count(*)::int AS n FROM visits`)[0].n,1);
console.log('PASS: atualização preserva usuário, contato e agenda e registra o estado anterior sem inventar autorização.');
