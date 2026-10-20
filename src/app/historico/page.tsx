import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { requireActor } from '@/lib/authorization';
import { HttpError } from '@/lib/http';
import { UserManagement } from '@/components/user-management';
export const dynamic='force-dynamic';
export default async function History({searchParams}:{searchParams:Promise<{userId?:string}>}){let actor;try{actor=await requireActor(await headers(),'history.self');}catch(error){if(error instanceof HttpError&&error.status===401)redirect('/entrar');return <main className="login-page"><section><h1>Histórico indisponível</h1><a href="/entrar">Entrar</a></section></main>;}return <main className="management-page"><a className="back-link" href="/">← Voltar ao painel</a><UserManagement role={actor.role} id={actor.id} history initialTarget={(await searchParams).userId||''}/></main>;}
