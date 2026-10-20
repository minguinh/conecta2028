import 'server-only';
import { randomBytes,createHash,randomUUID } from 'node:crypto';
import { and,eq,sql } from 'drizzle-orm';
import { hashPassword } from 'better-auth/crypto';
import { transaction,type Transaction } from '@/db/write';
import { user,account,session,userInvitations,auditLogs } from '@/db/schema';
import { type Actor } from './authorization';
import { isActiveRole } from './permissions';
import { HttpError,email,password,string } from './http';
export const tokenHash=(value:string)=>createHash('sha256').update(value).digest('hex');
async function lock(tx:Transaction){await tx.execute(sql`SELECT pg_advisory_xact_lock(2028,31)`);}
async function admin(tx:Transaction,actor:Actor){await lock(tx);const [current]=await tx.select({role:user.role,active:user.active}).from(user).where(eq(user.id,actor.id));if(!current?.active||current.role!=='administrador_geral')throw new HttpError(403,'Acesso administrativo necessário.');}
function invitationToken(){const token=randomBytes(32).toString('base64url');return {token,hash:tokenHash(token),expiresAt:new Date(Date.now()+24*60*60*1000)};}
export async function createUser(actor:Actor,input:Record<string,unknown>){
 const name=string(input.name,'Nome'),address=email(input.email);if(!isActiveRole(input.role))throw new HttpError(400,'Escolha um dos quatro perfis ativos.');const role=input.role;
 const invite=invitationToken();const id=randomUUID();
 await transaction(actor.id,async tx=>{await admin(tx,actor);const existing=await tx.select({id:user.id}).from(user).where(eq(user.email,address));if(existing.length)throw new HttpError(409,'Já existe uma conta com este e-mail.');await tx.insert(user).values({id,name,email:address,role,active:false});await tx.insert(userInvitations).values({userId:id,tokenHash:invite.hash,expiresAt:invite.expiresAt});await tx.insert(auditLogs).values({actorId:actor.id,subjectId:id,action:'user.invitation.created'});});
 return {id,activationUrl:new URL(`/ativar#token=${invite.token}`,process.env.BETTER_AUTH_URL).toString(),expiresAt:invite.expiresAt.toISOString()};
}
export async function updateUser(actor:Actor,id:string,input:Record<string,unknown>){
 if(!id||id.length>128)throw new HttpError(400,'Usuário inválido.');
 const changes:{role?:string;active?:boolean;name?:string;updatedAt:Date}={updatedAt:new Date()};
 if('role'in input){if(!isActiveRole(input.role))throw new HttpError(400,'Este perfil não pode ser atribuído.');changes.role=input.role;}
 if('active'in input){if(typeof input.active!=='boolean')throw new HttpError(400,'Status inválido.');changes.active=input.active;}
 if('name'in input)changes.name=string(input.name,'Nome');
 if(Object.keys(changes).length===1)throw new HttpError(400,'Nenhuma alteração informada.');
 await transaction(actor.id,async tx=>{await admin(tx,actor);const [target]=await tx.select({role:user.role,active:user.active}).from(user).where(eq(user.id,id));if(!target)throw new HttpError(404,'Usuário não encontrado.');
 if(id===actor.id&&((changes.role!==undefined&&changes.role!==target.role)||(changes.active!==undefined&&changes.active!==target.active)))throw new HttpError(409,'Você não pode alterar seu próprio perfil ou desativar a própria conta.');
 if(changes.active===true){const credential=await tx.select({id:account.id}).from(account).where(and(eq(account.userId,id),eq(account.providerId,'credential')));if(!credential.length)throw new HttpError(409,'A pessoa precisa concluir a ativação e definir a senha primeiro.');}
 await tx.update(user).set(changes).where(eq(user.id,id));
 if(changes.role!==undefined||changes.active!==undefined){await tx.delete(session).where(eq(session.userId,id));await tx.update(userInvitations).set({usedAt:new Date()}).where(eq(userInvitations.userId,id));}
 });
}
export async function renewInvitation(actor:Actor,id:string){const invite=invitationToken();await transaction(actor.id,async tx=>{await admin(tx,actor);const [target]=await tx.select({id:user.id}).from(user).where(eq(user.id,id));if(!target)throw new HttpError(404,'Usuário não encontrado.');const credentials=await tx.select({id:account.id}).from(account).where(eq(account.userId,id));if(credentials.length)throw new HttpError(409,'Esta conta já foi ativada.');await tx.update(userInvitations).set({usedAt:new Date()}).where(eq(userInvitations.userId,id));await tx.insert(userInvitations).values({userId:id,tokenHash:invite.hash,expiresAt:invite.expiresAt});await tx.insert(auditLogs).values({actorId:actor.id,subjectId:id,action:'user.invitation.renewed'});});return {activationUrl:new URL(`/ativar#token=${invite.token}`,process.env.BETTER_AUTH_URL).toString(),expiresAt:invite.expiresAt.toISOString()};}
export async function activateUser(input:Record<string,unknown>){
 const token=string(input.token,'Link',128);if(!/^[A-Za-z0-9_-]{43}$/.test(token))throw new HttpError(400,'Link inválido ou expirado.');const hashed=await hashPassword(password(input.password));
 await transaction(null,async tx=>{await lock(tx);const [invite]=await tx.select().from(userInvitations).where(eq(userInvitations.tokenHash,tokenHash(token))).for('update');if(!invite||invite.usedAt||invite.expiresAt<=new Date())throw new HttpError(400,'Link inválido ou expirado.');
 const [target]=await tx.select({role:user.role}).from(user).where(eq(user.id,invite.userId));if(!target||!isActiveRole(target.role))throw new HttpError(403,'Conta sem acesso ativo.');
 const existing=await tx.select({id:account.id}).from(account).where(eq(account.userId,invite.userId));if(existing.length)throw new HttpError(409,'Esta conta já foi ativada.');
 await tx.execute(sql`SELECT set_config('app.actor_id',${invite.userId},true)`);
 await tx.insert(account).values({id:randomUUID(),accountId:invite.userId,providerId:'credential',userId:invite.userId,password:hashed});await tx.update(user).set({active:true,updatedAt:new Date()}).where(eq(user.id,invite.userId));await tx.update(userInvitations).set({usedAt:new Date()}).where(eq(userInvitations.id,invite.id));await tx.insert(auditLogs).values({actorId:invite.userId,subjectId:invite.userId,action:'user.activated'});
 });
}
export function localSetupAllowed(){const base=process.env.BETTER_AUTH_URL;return process.env.NODE_ENV==='development'&&process.env.ALLOW_LOCAL_ADMIN_SETUP==='true'&&!!base&&['localhost','127.0.0.1'].includes(new URL(base).hostname);}
export async function bootstrapAdmin(input:Record<string,unknown>){if(!localSetupAllowed())throw new HttpError(403,'Configuração inicial indisponível.');const name=string(input.name,'Nome'),address=email(input.email),hashed=await hashPassword(password(input.password)),id=randomUUID();await transaction(id,async tx=>{await lock(tx);const existing=await tx.select({id:user.id}).from(user).limit(1);if(existing.length)throw new HttpError(409,'A configuração inicial já foi concluída.');await tx.insert(user).values({id,name,email:address,active:true,role:'administrador_geral'});await tx.insert(account).values({id:randomUUID(),userId:id,accountId:id,providerId:'credential',password:hashed});await tx.insert(auditLogs).values({actorId:id,subjectId:id,action:'system.admin.bootstrap'});});}
