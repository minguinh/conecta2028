import { requireActor } from '@/lib/authorization';
import { body,failure,json,sameOrigin } from '@/lib/http';
import { saveAgenda } from '@/lib/agenda';
export async function PATCH(r:Request,{params}:{params:Promise<{id:string}>}){try{sameOrigin(r);return json(await saveAgenda(await requireActor(r.headers,'operations.write'),await body(r),(await params).id));}catch(e){return failure(e);}}
