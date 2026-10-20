import { requireActor } from '@/lib/authorization';
import { body,failure,json,sameOrigin } from '@/lib/http';
import { getContacts,saveContact } from '@/lib/contacts';
export async function GET(r:Request){try{return json(await getContacts(await requireActor(r.headers,'operations.read'),new URL(r.url).searchParams));}catch(e){return failure(e);}}
export async function POST(r:Request){try{sameOrigin(r);return json(await saveContact(await requireActor(r.headers,'operations.write'),await body(r)),201);}catch(e){return failure(e);}}
