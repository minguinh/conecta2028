import { requireActor } from '@/lib/authorization';
import { failure,json,sameOrigin,HttpError } from '@/lib/http';
import { saveLocality,readTerritoryBody } from '@/lib/territory';
export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){try{sameOrigin(request);const actor=await requireActor(request.headers,'territory.manage');const {id}=await params;if(!/^[0-9a-f-]{36}$/i.test(id))throw new HttpError(400,'Localidade inválida.');return json(await saveLocality(actor,await readTerritoryBody(request),id));}catch(e){return failure(e);}}
