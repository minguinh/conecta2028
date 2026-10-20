import {readFileSync} from 'node:fs';
import {neon} from '@neondatabase/serverless';
process.loadEnvFile('.env.security');
const db=neon(process.env.DATABASE_URL_UNPOOLED);
if((await db`SELECT count(*)::int AS n FROM "user"`)[0].n!==0)throw Error('Use apenas a branch schema-only vazia agenda-check.');
for(const name of ['0009_hard_supreme_intelligence.sql','0010_agenda_audit.sql']){const statements=readFileSync('drizzle/'+name,'utf8').split('--> statement-breakpoint').filter(s=>s.trim());await db.transaction(statements.map(s=>db.query(s)));}
console.log('PASS: migrações 0009 e 0010 aplicadas na branch isolada.');
