import { requireActor } from '@/lib/authorization';
import { failure,json,sameOrigin } from '@/lib/http';
import { getTerritory,saveLocality,readTerritoryBody } from '@/lib/territory';
export const dynamic='force-dynamic';
export async function GET(request:Request){try{return json(await getTerritory(await requireActor(request.headers,'territory.read')));}catch(e){return failure(e);}}
export async function POST(request:Request){try{sameOrigin(request);const actor=await requireActor(request.headers,'territory.manage');return json(await saveLocality(actor,await readTerritoryBody(request)),201);}catch(e){return failure(e);}}
