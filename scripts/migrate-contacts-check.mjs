import {readFileSync} from 'node:fs';
import {neon} from '@neondatabase/serverless';
process.loadEnvFile('.env.security');
const db=neon(process.env.DATABASE_URL_UNPOOLED);
// Schema-only branches do not copy Drizzle's migration journal rows. Apply only the pending migration files to this disposable branch.
for(const name of ['0007_careless_stepford_cuckoos.sql','0008_contact_guards.sql']){const statements=readFileSync('drizzle/'+name,'utf8').split('--> statement-breakpoint').filter(s=>s.trim());await db.transaction(statements.map(s=>db.query(s)));}
console.log('PASS: migrações 0007 e 0008 aplicadas na branch contacts-check.');
