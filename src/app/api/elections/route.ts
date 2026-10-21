import {requireActor} from '@/lib/authorization';
import {failure,json,readJsonBody,sameOrigin} from '@/lib/http';
import {electionData,importElection} from '@/lib/elections';
export async function GET(r:Request){try{await requireActor(r.headers,'reports.read');return json(await electionData(new URL(r.url).searchParams));}catch(e){return failure(e);}}
export async function POST(r:Request){try{sameOrigin(r);const actor=await requireActor(r.headers,'users.manage');return json(await importElection(actor,await readJsonBody(r,2_000_000)),201);}catch(e){return failure(e);}}
