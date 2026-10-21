import { desc,eq,or } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { auditLogs,user } from '@/db/schema';
import { requireActor } from '@/lib/authorization';
import { failure,HttpError,json } from '@/lib/http';
import { audit } from '@/lib/audit';
export const dynamic='force-dynamic';
export async function GET(request:Request){try{const actor=await requireActor(request.headers,'history.self');const params=new URL(request.url).searchParams;const target=params.get('userId');const all=params.get('all')==='true';if(all||(target&&target!==actor.id))await requireActor(request.headers,'audit.read');if(target&&target!==actor.id){const [exists]=await getDb().select({id:user.id}).from(user).where(eq(user.id,target));if(!exists)throw new HttpError(404,'Usuário não encontrado.');}const id=target||actor.id;const page=Math.min(200,Math.max(0,Math.floor(Number(params.get('page'))||0)));const entries=await getDb().select().from(auditLogs).where(all?undefined:or(eq(auditLogs.actorId,id),eq(auditLogs.subjectId,id))).orderBy(desc(auditLogs.createdAt),desc(auditLogs.id)).limit(50).offset(page*50);if(all||target&&target!==actor.id)await audit('audit.viewed',actor.id,target);return json({entries,page});}catch(error){return failure(error);}}
