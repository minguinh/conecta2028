import { requireActor } from '@/lib/authorization';
import { body,failure,json,sameOrigin,HttpError } from '@/lib/http';
import { locateActivity } from '@/lib/territory';
export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){try{sameOrigin(request);const actor=await requireActor(request.headers,'operations.write');const {id}=await params;if(!/^[0-9a-f-]{36}$/i.test(id))throw new HttpError(400,'Atividade inválida.');return json(await locateActivity(actor,id,await body(request)));}catch(e){return failure(e);}}
