import {neon,Pool,neonConfig} from '@neondatabase/serverless';
import {drizzle} from 'drizzle-orm/neon-http';
import {drizzle as transactional,type NeonDatabase} from 'drizzle-orm/neon-serverless';
import {eq,sql} from 'drizzle-orm';
import * as schema from '../schema';
import {assertHealthAccess,type HealthPermission} from '../policy';
import {sixYearDeadline} from '../registration';
import type {HealthActor,HealthEnv} from './types';
import {ServiceError} from './types';
neonConfig.webSocketConstructor=globalThis.WebSocket;
export const database=(env:HealthEnv)=>drizzle(neon(env.HEALTH_DATABASE_URL),{schema});
type Database=NeonDatabase<typeof schema>;
export type HealthTransaction=Parameters<Parameters<Database['transaction']>[0]>[0];
export async function transaction<T>(env:HealthEnv,actor:HealthActor,permission:HealthPermission,fn:(tx:HealthTransaction)=>Promise<T>){const pool=new Pool({connectionString:env.HEALTH_DATABASE_URL,max:1,connectionTimeoutMillis:10000});try{return await transactional(pool,{schema}).transaction(async tx=>{const [member]=await tx.select().from(schema.memberships).where(eq(schema.memberships.subjectId,actor.subjectId)).for('share');if(!member?.active||member.role!==actor.role)throw new ServiceError(403,'Acesso de saúde desativado.');const [session]=await tx.select({id:schema.session.id}).from(schema.session).where(sql`${schema.session.id}=${actor.sessionId} and ${schema.session.userId}=${actor.subjectId} and ${schema.session.expiresAt}>now()`).for('share');if(!session)throw new ServiceError(401,'Entre novamente no módulo de saúde.');try{assertHealthAccess(actor,permission);}catch{throw new ServiceError(403,'Acesso assistencial não autorizado.');}await auditContext(tx,actor.subjectId);return fn(tx);});}finally{await pool.end();}}
export async function auditContext(tx:HealthTransaction,actorId:string){const days=Math.round((sixYearDeadline().getTime()-Date.now())/86400000);await tx.execute(sql`select set_config('health.actor_id',${actorId},true),set_config('health.audit_retention_days',${String(days)},true)`);}
export async function log(tx:HealthTransaction,actorId:string,action:string,requestId:string|null=null,outcome='allowed',documentId:string|null=null){await tx.insert(schema.accessLogs).values({actorId,action,requestId,documentId,outcome,expiresAt:sixYearDeadline()});}
/** A separate transaction preserves the denied operation's event after its rollback. */
export async function logDenied(env:HealthEnv,actor:HealthActor){await database(env).execute(sql`insert into health.access_logs(actor_id,action,outcome,expires_at) select ${actor.subjectId},'operation.denied','denied',${sixYearDeadline().toISOString()}::timestamptz where exists(select 1 from health.memberships m join health_auth.session s on s."userId"=m.subject_id where m.subject_id=${actor.subjectId} and m.active and s.id=${actor.sessionId} and s."expiresAt">now())`);}
