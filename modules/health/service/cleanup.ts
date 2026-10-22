import {Pool} from '@neondatabase/serverless';
import {drizzle} from 'drizzle-orm/neon-serverless';
import {sql} from 'drizzle-orm';
import * as schema from '../schema';
import {auditContext} from './db';
import type {HealthEnv} from './types';
/** Independent role and database. Cascading deletion removes encrypted originals and previews atomically. */
export async function cleanup(env:HealthEnv){if(!env.HEALTH_RETENTION_DATABASE_URL)throw Error('HEALTH_RETENTION_CONFIGURATION_REQUIRED');const pool=new Pool({connectionString:env.HEALTH_RETENTION_DATABASE_URL,max:1});try{await drizzle(pool,{schema}).transaction(async tx=>{await auditContext(tx,'health-retention-system');
 const removed=await tx.execute(sql`delete from health.requests where id in (select id from health.requests where expires_at<=now() and (hold_until is null or hold_until<=now()) order by expires_at limit 25 for update skip locked) returning id`);
 for(const row of removed.rows)await tx.insert(schema.erasureJobs).values({requestId:String(row.id),status:'concluido',attempts:1,completedAt:new Date()});
 await tx.execute(sql`delete from health.patients p where p.expires_at<=now() and not exists(select 1 from health.requests r where r.patient_id=p.id)`);await tx.execute(sql`delete from health.access_logs where expires_at<=now()`);await tx.execute(sql`delete from health.erasure_jobs where status='concluido' and completed_at<now()-interval '6 years'`);});}finally{await pool.end();}}
