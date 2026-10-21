import {requireActor} from '@/lib/authorization';
import {failure,json} from '@/lib/http';
import {demandHistory} from '@/lib/demands';
export async function GET(r:Request,{params}:{params:Promise<{id:string}>}){try{return json(await demandHistory(await requireActor(r.headers,'operations.read'),(await params).id));}catch(e){return failure(e);}}
