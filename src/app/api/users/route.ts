import { desc } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { user } from '@/db/schema';
import { requireActor } from '@/lib/authorization';
import { body,failure,json,sameOrigin } from '@/lib/http';
import { createUser } from '@/lib/user-management';
import { audit } from '@/lib/audit';
export const dynamic='force-dynamic';
export async function GET(request:Request){try{const actor=await requireActor(request.headers,'users.read');const page=Math.min(200,Math.max(0,Number(new URL(request.url).searchParams.get('page'))||0));const users=await getDb().select({id:user.id,name:user.name,email:user.email,role:user.role,active:user.active,createdAt:user.createdAt}).from(user).orderBy(desc(user.createdAt),user.id).limit(50).offset(Math.floor(page)*50);await audit('users.viewed',actor.id);return json({users,page});}catch(error){return failure(error);}}
export async function POST(request:Request){try{sameOrigin(request);const actor=await requireActor(request.headers,'users.manage');return json(await createUser(actor,await body(request)),201);}catch(error){return failure(error);}}
