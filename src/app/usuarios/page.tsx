import {WorkspaceNavigation} from '@/components/workspace-navigation';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { requireActor } from '@/lib/authorization';
import { HttpError } from '@/lib/http';
import { UserManagement } from '@/components/user-management';
export const dynamic='force-dynamic';
export default async function Users(){let actor;try{actor=await requireActor(await headers(),'users.read');}catch(error){if(error instanceof HttpError&&error.status===401)redirect('/entrar');return <main id="conteudo" tabIndex={-1} className="login-page"><section><h1>Acesso restrito</h1><p>Você não tem permissão para consultar a equipe.</p><a href="/">Voltar ao painel</a></section></main>;}return <main id="conteudo" tabIndex={-1} className="management-page"><WorkspaceNavigation role={actor.role}/><UserManagement role={actor.role} id={actor.id}/></main>;}
