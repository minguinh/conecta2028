import { and,desc,eq,or } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { auditLogs } from '@/db/schema';
import { requireActor } from '@/lib/authorization';
import { hasPermission } from '@/lib/permissions';
import { failure,HttpError,json } from '@/lib/http';
import { audit } from '@/lib/audit';
export const dynamic='force-dynamic';
export async function GET(request:Request){try{const actor=await requireActor(request.headers,'history.self');const params=new URL(request.url).searchParams;const target=params.get('userId');const all=params.get('all')==='true';if((all||(target&&target!==actor.id))&&!hasPermission(actor.role,'audit.read')){await audit('audit.access.denied',actor.id,null,'denied');throw new HttpError(403,'Você só pode consultar seu próprio histórico.');}const id=target||actor.id;const page=Math.min(200,Math.max(0,Math.floor(Number(params.get('page'))||0)));const entries=await getDb().select().from(auditLogs).where(all?undefined:or(eq(auditLogs.actorId,id),eq(auditLogs.subjectId,id))).orderBy(desc(auditLogs.createdAt),desc(auditLogs.id)).limit(50).offset(page*50);if(all||target&&target!==actor.id)await audit('audit.viewed',actor.id,target);return json({entries,page});}catch(error){return failure(error);}}
