import { requireActor } from '@/lib/authorization';
import { failure,json } from '@/lib/http';
import { contactHistory } from '@/lib/contacts';
export async function GET(r:Request,{params}:{params:Promise<{id:string}>}){try{return json(await contactHistory(await requireActor(r.headers,'operations.read'),(await params).id));}catch(e){return failure(e);}}
