import { requireActor } from '@/lib/authorization';
import { body,failure,json,sameOrigin } from '@/lib/http';
import { updateUser } from '@/lib/user-management';
export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){try{sameOrigin(request);const actor=await requireActor(request.headers,'users.manage');await updateUser(actor,(await params).id,await body(request));return json({message:'Usuário atualizado. Sessões anteriores foram encerradas quando necessário.'});}catch(error){return failure(error);}}
