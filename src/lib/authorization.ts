import 'server-only';
import { eq } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { user } from '@/db/schema';
import { getAuth } from './auth';
import { hasPermission,isActiveRole,type Role,type Permission } from './permissions';
import { HttpError } from './http';
import { audit } from './audit';
export type Actor={id:string;name:string;email:string;role:Role};
export async function requireActor(headers:Headers,permission?:Permission):Promise<Actor>{
 const session=await getAuth().api.getSession({headers});if(!session)throw new HttpError(401,'Entre na sua conta.');
 // Always re-read the current role/status. Never trust client input or a cached role.
 const [row]=await getDb().select({id:user.id,name:user.name,email:user.email,role:user.role,active:user.active}).from(user).where(eq(user.id,session.user.id));
 if(!row||!row.active||!isActiveRole(row.role))throw new HttpError(403,'Conta sem acesso ativo.');
 if(permission&&!hasPermission(row.role,permission)){await audit('access.denied',row.id,null,'denied');throw new HttpError(403,'Você não tem permissão para esta ação.');}
 return {id:row.id,name:row.name,email:row.email,role:row.role};
}
