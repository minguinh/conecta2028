import 'server-only';
import { getDb } from '@/db/client';
import { auditLogs } from '@/db/schema';
export async function audit(action:string,actorId:string|null,subjectId:string|null=null,outcome='success'){
 await getDb().insert(auditLogs).values({action,actorId,subjectId,outcome});
}
