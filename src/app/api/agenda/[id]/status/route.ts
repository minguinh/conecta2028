import { requireActor } from '@/lib/authorization';
import { body,failure,json,sameOrigin } from '@/lib/http';
import { setAgendaStatus } from '@/lib/agenda';
export async function PATCH(r:Request,{params}:{params:Promise<{id:string}>}){try{sameOrigin(r);return json(await setAgendaStatus(await requireActor(r.headers,'operations.write'),(await params).id,await body(r)));}catch(e){return failure(e);}}
