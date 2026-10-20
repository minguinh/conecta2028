import { requireActor } from '@/lib/authorization';
import { failure,json,sameOrigin } from '@/lib/http';
import { renewInvitation } from '@/lib/user-management';
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){try{sameOrigin(request);const actor=await requireActor(request.headers,'users.manage');return json(await renewInvitation(actor,(await params).id));}catch(error){return failure(error);}}
