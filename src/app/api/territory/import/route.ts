import { requireActor } from '@/lib/authorization';
import { failure,json,sameOrigin } from '@/lib/http';
import { importBoundaries,readTerritoryBody } from '@/lib/territory';
export async function POST(request:Request){try{sameOrigin(request);const actor=await requireActor(request.headers,'territory.manage');return json(await importBoundaries(actor,await readTerritoryBody(request)),201);}catch(e){return failure(e);}}
