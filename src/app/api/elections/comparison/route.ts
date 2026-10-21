import {requireActor} from '@/lib/authorization';
import {failure,json} from '@/lib/http';
import {candidateComparison} from '@/lib/election-comparison-query';
export async function GET(r:Request){try{await requireActor(r.headers,'reports.read');return json(await candidateComparison(new URL(r.url).searchParams));}catch(e){return failure(e);}}
